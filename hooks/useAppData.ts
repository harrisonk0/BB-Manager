"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchBoys } from '../services/db';
import { getSettings } from '../services/settings';
import { Boy, Section, SectionSettings, ToastType } from '../types';

/**
 * Custom hook for managing core application data (boys, settings) and their synchronization.
 * Handles initial data loading, refreshing, and background sync.
 */
export const useAppData = (
  activeSection: Section | null,
  showToast: (message: string, type?: ToastType) => void,
  currentUser: any // Supabase user type
) => {
  const [boys, setBoys] = useState<Boy[]>([]);
  const [settings, setSettings] = useState<SectionSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true); // New loading state for data
  const [dataError, setDataError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!activeSection) return;
    try {
        const [allBoys, sectionSettings] = await Promise.all([
          fetchBoys(activeSection),
          getSettings(activeSection)
        ]);
        setBoys(allBoys.sort((a, b) => a.name.localeCompare(b.name)));
        setSettings(sectionSettings);
        setDataError(null);
    } catch (err: any) {
        setDataError(`Could not refresh data. Please check your connection. Error: ${err.message}`);
    }
  }, [activeSection, showToast]);

  const loadDataAndSettings = useCallback(async () => {
    if (!activeSection || !currentUser) {
        setDataLoading(false);
        return;
    }
    setDataLoading(true);
    setDataError(null);
    try {
      await refreshData();
    } catch (err: any) {
      setDataError(`Failed to connect to the database. You may not have permission. Error: ${err.message}`);
    } finally {
      setDataLoading(false);
    }
  }, [activeSection, currentUser, refreshData]);

  // Initial data load when activeSection or currentUser changes
  useEffect(() => {
    if (activeSection && currentUser) {
      loadDataAndSettings();
    } else if (!currentUser) {
      // Clear data if user logs out
      setBoys([]);
      setSettings(null);
      setDataLoading(false);
    }
  }, [activeSection, currentUser, loadDataAndSettings]);

  return { boys, settings, dataLoading, dataError, refreshData, setSettings };
};