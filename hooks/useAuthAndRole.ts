import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToAuth, signOut as supabaseSignOut, getCurrentUser } from '../services/supabaseAuth';
import { clearRememberedPassword } from '../services/passkeyMigration';
import { supabase } from '../services/supabaseClient';
import { reportError } from '../services/observability';
import { AppUser, UserRole } from '../types';

const VALID_ROLES: readonly UserRole[] = ['admin', 'captain', 'officer'];

export const useAuthAndRole = () => {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const currentUserRef = useRef<AppUser | null>(null);

  const loadUserRole = useCallback(async (user: AppUser) => {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (error || !data || !data.role) {
      setNoRoleError('Your account does not have an assigned role. Please contact an administrator to gain access.');
      setUserRole(null);
      return;
    }

    const role = data.role as UserRole;

    if (!VALID_ROLES.includes(role)) {
      setNoRoleError(`Your account has an invalid role (${role}). Please contact an administrator to gain access.`);
      setUserRole(null);
      return;
    }

    setUserRole(role);
    setNoRoleError(null);
  }, []);

  const toAppUser = useCallback((user: { id: string; email?: string | null }) => {
    if (!user) return null;
    return { id: user.id, email: user.email || '' } as AppUser;
  }, []);

  const updateCurrentUser = useCallback((user: AppUser | null) => {
    currentUserRef.current = user;
    setCurrentUserState((prev) => {
      if (prev?.id === user?.id && prev?.email === user?.email) {
        return prev;
      }
      return user;
    });
  }, []);

  const performSignOut = useCallback(async () => {
    try {
      await supabaseSignOut();
    } catch (error) {
      reportError(error, 'signOut');
    } finally {
      clearRememberedPassword();
      updateCurrentUser(null);
      setPasswordRecovery(false);
      setNoRoleError(null);
      setUserRole(null);
    }
  }, [updateCurrentUser]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const existingUser = await getCurrentUser();
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
        reportError(err, 'getCurrentUser');
      } finally {
        setAuthLoading(false);
      }
    };

    initialize();

    const subscription = subscribeToAuth(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }

      const supabaseUser = session?.user ?? null;
      const mappedUser = supabaseUser ? toAppUser(supabaseUser) : null;
      const previousUser = currentUserRef.current;

      updateCurrentUser(mappedUser);

      if (mappedUser && previousUser?.id !== mappedUser.id) {
        await loadUserRole(mappedUser);
      } else if (!mappedUser && previousUser) {
        setUserRole(null);
        setNoRoleError(null);
        setPasswordRecovery(false);
      }

      setAuthLoading(false);
    });

    return () => {
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
