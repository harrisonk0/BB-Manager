"use client";

import { useState, useCallback } from 'react';
import { Section, View } from '../types';

/**
 * Custom hook for managing the active section of the application.
 * Handles setting, retrieving from local storage, and providing logic for switching sections.
 */
export const useSectionManagement = (
  setView: (view: View) => void,
  setHasUnsavedChanges: (dirty: boolean) => void,
  performSignOut: () => Promise<void> // Callback from useAuthAndRole
) => {
  const [activeSection, setActiveSection] = useState<Section | null>(() => localStorage.getItem('activeSection') as Section | null);

  const handleSelectSection = useCallback((section: Section) => {
    localStorage.setItem('activeSection', section);
    setActiveSection(section);
    setView({ page: 'home' });
  }, [setView]);

  const performSwitchSection = useCallback(() => {
    localStorage.removeItem('activeSection');
    setActiveSection(null);
    setView({ page: 'home' }); // Navigate to home, which will then render SectionSelectPage
    setHasUnsavedChanges(false);
  }, [setView, setHasUnsavedChanges]);

  return { activeSection, setActiveSection, handleSelectSection, performSwitchSection };
};