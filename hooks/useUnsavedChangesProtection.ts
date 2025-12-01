"use client";

import { useState, useCallback, useEffect } from 'react';
import { View } from '../types';

type ConfirmationModalType = 'navigate' | 'switchSection' | 'signOut' | null;

/**
 * Custom hook to manage unsaved changes and prompt the user before navigating away.
 * Integrates with navigation, section switching, and sign-out actions.
 */
export const useUnsavedChangesProtection = (
  currentView: View, // The current view state from App.tsx
  setView: (view: View) => void,
  performSwitchSection: () => void, // Callback from useSectionManagement
  performSignOut: () => Promise<void>, // Callback from useAuthAndRole
  hasUnsavedChanges: boolean, // External state
  setHasUnsavedChanges: (dirty: boolean) => void // External setter
) => {
  const [confirmModalType, setConfirmModalType] = useState<ConfirmationModalType>(null);
  const [nextView, setNextView] = useState<View | null>(null);

  const navigateWithProtection = useCallback((newView: View) => {
    // Check if the new page is different from the current page
    const isPageChanging = newView.page !== currentView.page || 
                           (newView.page === 'boyMarks' && (currentView as any).boyId !== (newView as any).boyId);

    if (hasUnsavedChanges && isPageChanging) {
      setNextView(newView);
      setConfirmModalType('navigate');
    } else {
      setView(newView);
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
  }, [confirmModalType, nextView, setView, performSwitchSection, performSignOut, setHasUnsavedChanges]);

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
    setView: navigateWithProtection, // Expose protected navigation
    setHasUnsavedChanges,
    confirmModalType,
    confirmAction,
    cancelAction,
    handleSwitchSection: handleSwitchSectionWithProtection,
    handleSignOut: handleSignOutWithProtection,
  };
};