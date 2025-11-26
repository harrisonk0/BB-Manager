"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js'; // Use Supabase User type
import { fetchUserRole } from '../services/db';
import { UserRole } from '../types';

export const useAuthAndRole = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const performSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    // State update handled by listener
  }, []);

  const loadUserRole = useCallback(async (user: User) => {
    const role = await fetchUserRole(user.id);
    if (role === null) {
      setNoRoleError('Your account does not have an assigned role. Please contact an administrator.');
      // Don't sign out immediately, just show error state
      setUserRole(null);
      return;
    }
    setUserRole(role);
    setNoRoleError(null);
  }, []);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadUserRole(session.user);
      }
      setAuthLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadUserRole(session.user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setNoRoleError(null);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserRole]);

  return { currentUser: currentUser as any, userRole, noRoleError, authLoading, performSignOut, setCurrentUser, setUserRole };
};