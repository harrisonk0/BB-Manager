"use client";

import { useState, useCallback, useEffect } from 'react';
import { View } from '../types';

type ConfirmationModalType = 'navigate' | 'switchSection' | 'signOut' | null;

/**
 * Custom hook to manage unsaved changes and prompt the user before navigating away.
 * Integrates with navigation, section switching, and sign-out actions.
 */
export const useUnsavedChangesProtection = (
  setView: (view: View) => void,
  performSwitchSection: () => void, // Callback from useSectionManagement
  performSignOut: () => Promise<void> // Callback from useAuthAndRole
) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState<ConfirmationModalType>(null);
  const [nextView, setNextView] = useState<View | null>(null);
  const [currentView, setCurrentView] = useState<View>({ page: 'home' }); // Internal state to track current view

  // Update currentView when setView is called
  const navigateWithProtection = useCallback((newView: View) => {
    if (hasUnsavedChanges && newView.page !== currentView.page) {
      setNextView(newView);
      setConfirmModalType('navigate');
    } else {
      setView(newView);
      setCurrentView(newView); // Update internal currentView
    }
  }, [hasUnsavedChanges, currentView, setView]);

  const handleSwitchSectionWithProtection = useCallback(() => {
    if (hasUnsavedChanges) {
      setConfirmModalType('switchSection');
    } else {
      performSwitchSection();
    }
  }, [hasUnsavedChanges, performSwitchSection]);

  const handleSignOutWithProtection = useCallback(() => {
    if (hasUnsavedChanges) {
      setConfirmModalType('signOut');
    } else {
      performSignOut();
    }
  }, [hasUnsavedChanges, performSignOut]);

  const confirmAction = useCallback(() => {
    switch (confirmModalType) {
      case 'navigate':
        if (nextView) {
          setHasUnsavedChanges(false);
          setView(nextView);
          setCurrentView(nextView); // Update internal currentView
        }
        break;
      case 'switchSection':
        setHasUnsavedChanges(false); // Clear unsaved changes before performing action
        performSwitchSection();
        break;
      case 'signOut':
        setHasUnsavedChanges(false); // Clear unsaved changes before performing action
        performSignOut();
        break;
    }
    cancelAction();
  }, [confirmModalType, nextView, setView, performSwitchSection, performSignOut]);

  const cancelAction = useCallback(() => {
    setConfirmModalType(null);
    setNextView(null);
  }, []);

  // Effect to handle browser's beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = ''; // Required by browsers to show the confirmation prompt.
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    view: currentView, // Expose currentView for App.tsx to render
    setView: navigateWithProtection, // Expose protected navigation
    setHasUnsavedChanges,
    confirmModalType,
    confirmAction,
    cancelAction,
    handleSwitchSection: handleSwitchSectionWithProtection,
    handleSignOut: handleSignOutWithProtection,
  };
};