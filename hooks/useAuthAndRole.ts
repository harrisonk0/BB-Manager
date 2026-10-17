import { useState, useEffect, useCallback, useRef } from "react";
import {
  subscribeToAuth,
  signOut as supabaseSignOut,
  getCurrentUser,
} from "../services/supabaseAuth";
import { clearRememberedPassword } from "../services/passkeyMigration";
import { supabase } from "../services/supabaseClient";
import { reportError } from "../services/observability";
import { AppUser, UserRole } from "../types";

const VALID_ROLES: readonly UserRole[] = ["admin", "captain", "officer"];

export const useAuthAndRole = () => {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const currentUserRef = useRef<AppUser | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const effectGeneration = useRef(0);

  const loadUserRole = useCallback(async (user: AppUser) => {
    const request = ++generation.current;
    const valid = () =>
      mounted.current &&
      generation.current === request &&
      currentUserRef.current?.id === user.id;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!valid()) return;
      if (error || !data || !data.role) {
        const portal = await supabase
          .from("portal_accounts")
          .select("member_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!valid()) return;
        if (!portal.error && portal.data) {
          setUserRole("boy");
          setNoRoleError(null);
          return;
        }
        setNoRoleError(
          "Your account does not have an assigned role. Please contact an administrator to gain access.",
        );
        setUserRole(null);
        return;
      }

      const role = data.role as UserRole;

      if (!VALID_ROLES.includes(role)) {
        setNoRoleError(
          `Your account has an invalid role (${role}). Please contact an administrator to gain access.`,
        );
        setUserRole(null);
        return;
      }

      setUserRole(role);
      setNoRoleError(null);
    } catch (error: unknown) {
      if (!valid()) return;
      reportError(error, "loadUserRole");
      setUserRole(null);
      setNoRoleError(
        "Could not verify account access. Sign in again to retry.",
      );
    }
  }, []);

  const toAppUser = useCallback(
    (user: { id: string; email?: string | null }) => {
      if (!user) return null;
      return { id: user.id, email: user.email || "" } as AppUser;
    },
    [],
  );

  const updateCurrentUser = useCallback((user: AppUser | null) => {
    if (currentUserRef.current?.id !== user?.id) {
      generation.current += 1;
      setUserRole(null);
      setNoRoleError(null);
    }
    currentUserRef.current = user;
    setCurrentUserState((prev) => {
      if (prev?.id === user?.id && prev?.email === user?.email) {
        return prev;
      }
      return user;
    });
  }, []);

  const performSignOut = useCallback(async () => {
    generation.current += 1;
    clearRememberedPassword();
    updateCurrentUser(null);
    setUserRole(null);
    try {
      await supabaseSignOut();
    } catch (error) {
      reportError(error, "signOut");
    } finally {
      if (!currentUserRef.current) {
        updateCurrentUser(null);
        setPasswordRecovery(false);
        setNoRoleError(null);
        setUserRole(null);
      }
    }
  }, [updateCurrentUser]);

  useEffect(() => {
    mounted.current = true;
    const effect = ++effectGeneration.current;
    const active = () => mounted.current && effectGeneration.current === effect;
    let authEventReceived = false;
    const initialize = async () => {
      try {
        const existingUser = await getCurrentUser();
        if (!active() || authEventReceived) return;
        const mappedUser = existingUser ? toAppUser(existingUser) : null;
        const previousUser = currentUserRef.current;
        updateCurrentUser(mappedUser);

        if (mappedUser && previousUser?.id !== mappedUser.id) {
          await loadUserRole(mappedUser);
        } else if (!mappedUser) {
          setUserRole(null);
          setNoRoleError(null);
        }
      } catch (err: unknown) {
        reportError(err, "getCurrentUser");
      } finally {
        if (active()) setAuthLoading(false);
      }
    };

    initialize();

    const subscription = subscribeToAuth(async (event, session) => {
      if (!active()) return;
      authEventReceived = true;
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      }

      const supabaseUser = session?.user ?? null;
      const mappedUser = supabaseUser ? toAppUser(supabaseUser) : null;
      const previousUser = currentUserRef.current;

      updateCurrentUser(mappedUser);

      if (
        mappedUser &&
        (previousUser?.id !== mappedUser.id || event === "TOKEN_REFRESHED")
      ) {
        await loadUserRole(mappedUser);
      } else if (!mappedUser && previousUser) {
        setUserRole(null);
        setNoRoleError(null);
        setPasswordRecovery(false);
      }

      setAuthLoading(false);
    });

    const revalidateRole = () => {
      const principal = currentUserRef.current;
      if (active() && principal && document.visibilityState !== "hidden")
        void loadUserRole(principal);
    };
    window.addEventListener("focus", revalidateRole);
    document.addEventListener("visibilitychange", revalidateRole);
    const roleInterval = window.setInterval(revalidateRole, 60_000);
    return () => {
      window.removeEventListener("focus", revalidateRole);
      document.removeEventListener("visibilitychange", revalidateRole);
      window.clearInterval(roleInterval);
      effectGeneration.current += 1;
      mounted.current = false;
      generation.current += 1;
      subscription?.unsubscribe();
    };
  }, [loadUserRole, toAppUser, updateCurrentUser]);

  const completePasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  return {
    currentUser,
    userRole,
    noRoleError,
    authLoading,
    passwordRecovery,
    performSignOut,
    completePasswordRecovery,
    setUserRole,
  };
};
