"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { fetchUserRole } from '../services/db';
import { clearPendingWrites } from '../services/offlineDb';
import { deriveKeyFromToken } from '../services/crypto';
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
  const [roleLoading, setRoleLoading] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  const performSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      await clearPendingWrites(); // Clear pending writes as the encryption key will change
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
        // Force sign out if no role
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

    const handleSession = async (session: Session | null) => {
        if (!mounted) return;

        if (session?.user) {
            setCurrentUser(session.user);
            
            // --- Derive Encryption Key ---
            if (session.access_token) {
                try {
                    const key = await deriveKeyFromToken(session.access_token);
                    setEncryptionKey(key);
                } catch (e) {
                    console.error("Failed to derive encryption key:", e);
                    // Critical failure: force sign out
                    await performSignOut();
                    return;
                }
            }
            // -----------------------------

            // Load role immediately, authLoading remains true until role is loaded or fails.
            loadUserRole(session.user).finally(() => {
                if (mounted) setAuthLoading(false);
            });
        } else {
            setCurrentUser(null);
            setUserRoleInfo(null);
            setNoRoleError(null);
            setEncryptionKey(null);
            setAuthLoading(false);
        }
    };

    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      handleSession(session);
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

      if (isPasswordRecovery && event !== 'SIGNED_OUT') {
        setAuthLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false); // Reset recovery state on sign out.
        handleSession(null);
      } else if (session?.user) {
        // Handle SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED
        handleSession(session);
      }
      setAuthLoading(false);
    });

    // Listen for custom userrolerefresh event
    const handleUserRoleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
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
  }, [loadUserRole, isPasswordRecovery, performSignOut]);

  return { currentUser, userRoleInfo, noRoleError, authLoading, roleLoading, performSignOut, setCurrentUser, setUserRoleInfo, isPasswordRecovery, encryptionKey };
};