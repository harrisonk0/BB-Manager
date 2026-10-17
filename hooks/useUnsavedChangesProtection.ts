import { useState, useCallback, useEffect, useRef } from "react";
import { View } from "../types";

type ConfirmationModalType =
  "navigate" | "switchSection" | "signOut" | "route" | null;

/**
 * Custom hook to manage unsaved changes and prompt the user before navigating away.
 * Integrates with navigation, section switching, and sign-out actions.
 */
export const useUnsavedChangesProtection = (
  view: View,
  setView: (view: View) => void,
  hasUnsavedChanges: boolean,
  setHasUnsavedChanges: (dirty: boolean) => void,
  performSwitchSection: () => void, // Callback from useSectionManagement
  performSignOut: () => Promise<void>, // Callback from useAuthAndRole
) => {
  const [confirmModalType, setConfirmModalType] =
    useState<ConfirmationModalType>(null);
  const routeAction = useRef<{
    proceed: () => void;
    reject: () => void;
  } | null>(null);
  const guardNavigation = useCallback(
    (proceed: () => void, reject: () => void) => {
      if (!hasUnsavedChanges) {
        proceed();
        return;
      }
      routeAction.current?.reject();
      routeAction.current = { proceed, reject };
      setConfirmModalType("route");
    },
    [hasUnsavedChanges],
  );
  const [nextView, setNextView] = useState<View | null>(null);

  const navigateWithProtection = useCallback(
    (newView: View) => {
      if (hasUnsavedChanges && newView.page !== view.page) {
        setNextView(newView);
        setConfirmModalType("navigate");
      } else {
        setView(newView);
      }
    },
    [hasUnsavedChanges, setView, view.page],
  );

  const handleSwitchSectionWithProtection = useCallback(() => {
    if (hasUnsavedChanges) {
      setConfirmModalType("switchSection");
    } else {
      performSwitchSection();
    }
  }, [hasUnsavedChanges, performSwitchSection]);

  const handleSignOutWithProtection = useCallback(() => {
    if (hasUnsavedChanges) {
      setConfirmModalType("signOut");
    } else {
      performSignOut();
    }
  }, [hasUnsavedChanges, performSignOut]);

  const confirmAction = useCallback(() => {
    switch (confirmModalType) {
      case "route": {
        const action = routeAction.current;
        routeAction.current = null;
        setHasUnsavedChanges(false);
        action?.proceed();
        break;
      }
      case "navigate":
        if (nextView) {
          setHasUnsavedChanges(false);
          setView(nextView);
        }
        break;
      case "switchSection":
        setHasUnsavedChanges(false);
        performSwitchSection();
        break;
      case "signOut":
        setHasUnsavedChanges(false);
        performSignOut();
        break;
    }
    cancelAction();
  }, [
    confirmModalType,
    nextView,
    setView,
    performSwitchSection,
    performSignOut,
    setHasUnsavedChanges,
  ]);

  const cancelAction = useCallback(() => {
    routeAction.current?.reject();
    routeAction.current = null;
    setConfirmModalType(null);
    setNextView(null);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    guardNavigation,
    setView: navigateWithProtection,
    confirmModalType,
    confirmAction,
    cancelAction,
    handleSwitchSection: handleSwitchSectionWithProtection,
    handleSignOut: handleSignOutWithProtection,
  };
};
