"use client";

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { initializeFirebase, getAuthInstance } from '../services/firebase';
import { fetchUserRole } from '../services/db';
import { UserRole } from '../types';

/**
 * Custom hook for managing Firebase authentication state and user roles.
 * Handles user login/logout, fetching user roles, and error states related to roles.
 */
export const useAuthAndRole = () => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // New loading state for auth

  const performSignOut = useCallback(async () => {
    try {
      const auth = getAuthInstance();
      await signOut(auth);
      // State will be reset by the onAuthStateChanged listener
    } catch (error) {
      console.error('Sign out failed', error);
      // Error handling for sign out can be passed up or handled by a toast
    }
  }, []);

  useEffect(() => {
    try {
      initializeFirebase();
      const auth = getAuthInstance();
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const role = await fetchUserRole(user.uid);
          if (role === null) {
            setNoRoleError('Your account does not have an assigned role. Please contact an administrator to gain access.');
            await signOut(auth); // Force sign out if no role
            setCurrentUser(null); // Ensure currentUser is null after forced sign out
            setUserRole(null);
            setAuthLoading(false);
            return;
          }
          setUserRole(role);
          setNoRoleError(null);
        } else {
          setUserRole(null);
          setNoRoleError(null);
        }
        setCurrentUser(user);
        setAuthLoading(false);
      });
      return () => unsubscribe();
    } catch (err: any) {
      console.error(`Failed to initialize Firebase: ${err.message}`);
      // This error should ideally be handled at the App.tsx level or a global error boundary
      setAuthLoading(false);
    }
  }, []);

  return { currentUser, userRole, noRoleError, authLoading, performSignOut, setCurrentUser, setUserRole };
};