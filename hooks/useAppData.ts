"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchBoys, syncPendingWrites, deleteOldAuditLogs } from '../services/db';
import { getSettings } from '../services/settings';
import { Boy, Section, SectionSettings, ToastType } from '../types';

/**
 * Custom hook for managing core application data (boys, settings) and their synchronization.
 * Handles initial data loading, refreshing, and background sync.
 */
export const useAppData = (
  activeSection: Section | null,
  showToast: (message: string, type?: ToastType) => void,
  currentUser: any, // User type from firebase/auth
  encryptionKey: CryptoKey | null // New dependency
) => {
  const [boys, setBoys] = useState<Boy[]>([]);
  const [settings, setSettings] = useState<SectionSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true); // New loading state for data
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Use a ref to track if we've already loaded data for a specific section/user combo
  // to prevent reloading if the user object reference changes but ID is same
  const loadedRef = useRef<{ section: Section | null, userId: string | undefined }>({ section: null, userId: undefined });

  const refreshData = useCallback(async () => {
    if (!activeSection || !encryptionKey) return;
    try {
        const [allBoys, sectionSettings] = await Promise.all([
          fetchBoys(activeSection, encryptionKey),
          getSettings(activeSection)
        ]);
        setBoys(allBoys.sort((a, b) => a.name.localeCompare(b.name)));
        setSettings(sectionSettings);
        setDataError(null);
    } catch (err: any) {
        console.error("Failed to refresh data:", err);
        setDataError(`Could not refresh data. Please check your connection. Error: ${err.message}`);
    }
  }, [activeSection, encryptionKey, showToast]);

  const loadDataAndSettings = useCallback(async () => {
    if (!activeSection || !currentUser || !encryptionKey) {
        setDataLoading(false);
        return;
    }
    
    setDataLoading(true);
    setDataError(null);
    try {
      await deleteOldAuditLogs(activeSection); // Clean up old logs on load
      await refreshData();
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setDataError(`Failed to connect to the database. You may not have permission. Error: ${err.message}`);
    } finally {
      setDataLoading(false);
    }
  }, [activeSection, currentUser, encryptionKey, refreshData]);

  // Initial data load when activeSection or currentUser changes
  useEffect(() => {
    if (activeSection && currentUser && encryptionKey) {
        // Only load if section or user ID has changed from what we last loaded
        if (loadedRef.current.section !== activeSection || loadedRef.current.userId !== currentUser.id) {
            loadedRef.current = { section: activeSection, userId: currentUser.id };
            loadDataAndSettings();
        }
    } else if (!currentUser || !encryptionKey) {
      // Clear data if user logs out or key is missing
      setBoys([]);
      setSettings(null);
      setDataLoading(false);
      loadedRef.current = { section: null, userId: undefined };
    }
  }, [activeSection, currentUser?.id, encryptionKey, loadDataAndSettings]); // Depend on ID and key

  // Handle online/offline sync and background data refresh events
  useEffect(() => {
    const handleOnline = () => {
        console.log('App is online, attempting to sync...');
        if (!encryptionKey) {
            console.warn('Cannot sync: Encryption key not available.');
            return;
        }
        syncPendingWrites(encryptionKey).then(synced => {
            if (synced) {
                console.log('Sync complete, refreshing data.');
                showToast('Data synced successfully.', 'success');
                refreshData();
            }
        });
    };
    
    window.addEventListener('online', handleOnline);
    // Also attempt sync on mount in case we just came online
    if (encryptionKey) {
        syncPendingWrites(encryptionKey).then(synced => {
            if(synced) refreshData();
        });
    }

    const handleDataRefresh = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (activeSection && customEvent.detail.section === activeSection) {
            console.log('Cache updated in background, refreshing UI data...');
            refreshData();
        }
    };
    window.addEventListener('datarefreshed', handleDataRefresh);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('datarefreshed', handleDataRefresh);
    };
  }, [activeSection, encryptionKey, refreshData, showToast]);

  return { boys, settings, dataLoading, dataError, refreshData, setSettings };
};