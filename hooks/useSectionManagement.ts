import { useState, useCallback } from 'react';
import { Section, View } from '../types';
import { clearStoredSection, readStoredSection, writeStoredSection } from './sectionStorage';

export const useSectionManagement = (
  setView: (view: View) => void
) => {
  const [activeSection, setActiveSection] = useState<Section | null>(() => readStoredSection());

  const handleSelectSection = useCallback((section: Section) => {
    writeStoredSection(section);
    setActiveSection(section);
    setView({ page: 'home' });
  }, [setView]);

  const performSwitchSection = useCallback(() => {
    clearStoredSection();
    setActiveSection(null);
    setView({ page: 'home' });
  }, [setView]);

  return { activeSection, setActiveSection, handleSelectSection, performSwitchSection };
};
