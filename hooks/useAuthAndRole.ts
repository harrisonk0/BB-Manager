"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToAuth, signOut as supabaseSignOut, getCurrentUser } from '../services/supabaseAuth';
import { supabase } from '../services/supabaseClient';
import { AppUser, UserRole } from '../types';

/**
 * Custom hook for managing Supabase authentication state and user roles.
 * Handles user login/logout, fetching user roles, and error states related to roles.
 */
export const useAuthAndRole = () => {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const currentUserRef = useRef<AppUser | null>(null);

  const performSignOut = useCallback(async () => {
    try {
      await supabaseSignOut();
      // State will be reset by the auth state listener
    } catch (error) {
      console.error('Sign out failed', error);
    }
  }, []);

  const loadUserRole = useCallback(async (user: AppUser) => {
    const { data, error } = await supabase.from('user_roles').select('role').eq('uid', user.id).single();

    if (error || !data) {
      setNoRoleError('Your account does not have an assigned role. Please contact an administrator to gain access.');
      // Keep user signed in so they can see the error message
      setUserRole(null);
      return;
    }

    // Validate role value before trusting it
    const validRoles = ['admin', 'captain', 'officer'] as const;
    const role = data.role as UserRole;

    if (!validRoles.includes(role)) {
      setNoRoleError(`Your account has an invalid role (${role}). Please contact an administrator to gain access.`);
      setUserRole(null);
      return;
    }

    setUserRole(role);
    setNoRoleError(null);
  }, []);

  const toAppUser = useCallback((user: { id: string; email: string | null }) => {
    if (!user) return null;
    if (!user.email) {
      return { id: user.id, email: '' } as AppUser;
    }
    return { id: user.id, email: user.email } as AppUser;
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
      } catch (err: any) {
        console.error(`Failed to get current user: ${err.message}`);
      } finally {
        setAuthLoading(false);
      }
    };

    initialize();

    const subscription = subscribeToAuth(async (_event, session) => {
      const supabaseUser = session?.user ?? null;
      const mappedUser = supabaseUser ? toAppUser(supabaseUser) : null;
      const previousUser = currentUserRef.current;

      updateCurrentUser(mappedUser);

      if (mappedUser && previousUser?.id !== mappedUser.id) {
        await loadUserRole(mappedUser);
      } else if (!mappedUser && previousUser) {
        setUserRole(null);
        setNoRoleError(null);
      }

      setAuthLoading(false);
    });

    const handleUserRoleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (currentUserRef.current && customEvent.detail.uid === currentUserRef.current.id) {
        loadUserRole(currentUserRef.current);
      }
    };

    window.addEventListener('userrolerefresh', handleUserRoleRefresh);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('userrolerefresh', handleUserRoleRefresh);
    };
  }, [loadUserRole, toAppUser, updateCurrentUser]);

  const setCurrentUser = useCallback(
    (user: AppUser | null) => {
      updateCurrentUser(user);
    },
    [updateCurrentUser]
  );

  return { currentUser, userRole, noRoleError, authLoading, performSignOut, setCurrentUser, setUserRole, user: currentUser };
};
