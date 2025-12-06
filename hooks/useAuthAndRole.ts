"use client";

import { useState, useEffect, useCallback } from 'react';
import { subscribeToAuth, signOut as supabaseSignOut, getCurrentUser } from '../services/supabaseAuth';
import { supabase } from '../services/supabaseClient';
import { AppUser, UserRole } from '../types';

/**
 * Custom hook for managing Supabase authentication state and user roles.
 * Handles user login/logout, fetching user roles, and error states related to roles.
 */
export const useAuthAndRole = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null | undefined>(undefined);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
      await supabaseSignOut();
      setCurrentUser(null);
      setUserRole(null);
      return;
    }

    setUserRole(data.role as UserRole);
    setNoRoleError(null);
  }, []);

  const toAppUser = useCallback((user: { id: string; email: string | null }) => {
    if (!user) return null;
    if (!user.email) {
      return { id: user.id, email: '' } as AppUser;
    }
    return { id: user.id, email: user.email } as AppUser;
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const existingUser = await getCurrentUser();
        const mappedUser = existingUser ? toAppUser(existingUser) : null;
        setCurrentUser(mappedUser);

        if (mappedUser) {
          await loadUserRole(mappedUser);
        } else {
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

      setCurrentUser(mappedUser);

      if (mappedUser) {
        await loadUserRole(mappedUser);
      } else {
        setUserRole(null);
        setNoRoleError(null);
      }
      setAuthLoading(false);
    });

    const handleUserRoleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (currentUser && customEvent.detail.uid === currentUser.id) {
        loadUserRole(currentUser);
      }
    };

    window.addEventListener('userrolerefresh', handleUserRoleRefresh);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('userrolerefresh', handleUserRoleRefresh);
    };
  }, [loadUserRole, currentUser, toAppUser]);

  return { currentUser, userRole, noRoleError, authLoading, performSignOut, setCurrentUser, setUserRole };
};
