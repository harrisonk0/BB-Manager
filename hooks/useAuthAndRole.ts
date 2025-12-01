"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { fetchUserRole } from '../services/db';
import { UserRole } from '../types';

/**
 * Custom hook for managing Supabase authentication state and user roles.
 * Handles user login/logout, fetching user roles, and error states related to roles.
 */
export const useAuthAndRole = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const performSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // State will be reset by the onAuthStateChange listener
    } catch (error) {
      console.error('Sign out failed', error);
    }
  }, []);

  const loadUserRole = useCallback(async (user: User) => {
    const role = await fetchUserRole(user.id);
    if (role === null) {
      setNoRoleError('Your account does not have an assigned role. Please contact an administrator to gain access.');
      // Force sign out if no role, but avoid loops by checking current state if needed.
      // For now, simple signOut is safer.
      await supabase.auth.signOut(); 
      setCurrentUser(null);
      setUserRole(null);
      return;
    }
    setUserRole(role);
    setNoRoleError(null);
  }, []);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadUserRole(session.user);
      } else {
        setAuthLoading(false);
      }
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        await loadUserRole(session.user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setNoRoleError(null);
      }
      setAuthLoading(false);
    });

    // Listen for custom userrolerefresh event
    const handleUserRoleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (currentUser && customEvent.detail.uid === currentUser.id) {
        console.log('User role cache updated in background, refreshing UI...');
        loadUserRole(currentUser);
      }
    };
    window.addEventListener('userrolerefresh', handleUserRoleRefresh);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('userrolerefresh', handleUserRoleRefresh);
    };
  }, [loadUserRole, currentUser]);

  return { currentUser, userRole, noRoleError, authLoading, performSignOut, setCurrentUser, setUserRole };
};