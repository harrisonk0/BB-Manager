"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { fetchUserRole } from '../services/db';
import { UserRole, UserRoleInfo } from '../types';

/**
 * Custom hook for managing Supabase authentication state and user roles.
 * Handles user login/logout, fetching user roles, and error states related to roles.
 */
export const useAuthAndRole = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRoleInfo, setUserRoleInfo] = useState<UserRoleInfo | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false); // New state to track role fetching
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const performSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // State will be reset by the onAuthStateChange listener
    } catch (error) {
      console.error('Sign out failed', error);
    }
  }, []);

  const loadUserRole = useCallback(async (user: User) => {
    setRoleLoading(true); // Start loading role
    try {
      const roleInfo = await fetchUserRole(user.id);
      if (roleInfo === null) {
        setNoRoleError('Your account does not have an assigned role. Please contact an administrator to gain access.');
        // Force sign out if no role, but avoid loops by checking current state if needed.
        // For now, simple signOut is safer.
        await supabase.auth.signOut(); 
        setCurrentUser(null);
        setUserRoleInfo(null);
        return;
      }
      setUserRoleInfo(roleInfo);
      setNoRoleError(null);
    } finally {
      setRoleLoading(false); // End loading role
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setCurrentUser(session.user);
        // Load role immediately, authLoading remains true until role is loaded or fails.
        loadUserRole(session.user).finally(() => {
            if (mounted) setAuthLoading(false);
        });
      } else {
        setAuthLoading(false);
      }
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        if (session?.user) {
          setCurrentUser(session.user);
        }
        setAuthLoading(false);
        return;
      }

      // If we are in password recovery mode, we should not proceed with the normal
      // sign-in flow. We wait until the user resets their password and is signed out.
      if (isPasswordRecovery && event !== 'SIGNED_OUT') {
        setAuthLoading(false);
        return;
      }

      if (session?.user) {
        setCurrentUser(prev => {
            if (prev?.id === session.user.id) return prev;
            return session.user;
        });
        
        // Wait for role load before setting authLoading to false if it was true
        await loadUserRole(session.user);
      } else {
        // This block handles SIGNED_OUT or when the session becomes null.
        setCurrentUser(null);
        setUserRoleInfo(null);
        setNoRoleError(null);
        setIsPasswordRecovery(false); // Reset recovery state on sign out.
      }
      setAuthLoading(false);
    });

    // Listen for custom userrolerefresh event
    const handleUserRoleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      // We need to access the current user from state, but we can't put it in deps or we loop.
      // We'll trust the event detail UID match against the session user (which we can get fresh) or simply reload if we have a user.
      supabase.auth.getUser().then(({ data: { user } }) => {
          if (mounted && user && user.id === customEvent.detail.uid) {
             console.log('User role cache updated in background, refreshing UI...');
             loadUserRole(user);
          }
      });
    };
    window.addEventListener('userrolerefresh', handleUserRoleRefresh);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('userrolerefresh', handleUserRoleRefresh);
    };
  }, [loadUserRole, isPasswordRecovery]);

  return { currentUser, userRoleInfo, noRoleError, authLoading, roleLoading, performSignOut, setCurrentUser, setUserRoleInfo, isPasswordRecovery };
};