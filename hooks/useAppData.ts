"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchBoys, syncPendingWrites, deleteOldAuditLogs } from '../services/db';
import { getSettings } from '../services/settings';
import { Boy, Section, SectionSettings, ToastType } from '../types';
import { Logger } from '../services/logger';

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
  const [dataLoading, setDataLoading] = useState(true); // Internal loading state
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Use a ref to track if we've already loaded data for a specific section/user combo
  const loadedRef = useRef<{ section: Section | null, userId: string | undefined }>({ section: null, userId: undefined });
  const syncAttempts = useRef(0);

  // Derived state to prevent UI flicker: 
  // If we have an active section and user, but the loaded reference doesn't match,
  // we are technically "loading" (syncing) even if the effect hasn't run yet.
  const isSyncingData = activeSection && currentUser && (
      loadedRef.current.section !== activeSection || 
      loadedRef.current.userId !== currentUser.id
  );
  
  // The effective loading state exposed to the component
  const isLoading = dataLoading || !!isSyncingData;

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
        Logger.error("Failed to refresh data", err);
        setDataError(`Could not refresh data. Please check your connection. Error: ${err.message}`);
    }
  }, [activeSection, encryptionKey]);

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
      Logger.error("Failed to fetch data", err);
      setDataError(`Failed to connect to the database. You may not have permission. Error: ${err.message}`);
    } finally {
      setDataLoading(false);
    }
  }, [activeSection, currentUser, encryptionKey, refreshData]);

  // Initial data load when activeSection or currentUser changes
  useEffect(() => {
    if (activeSection && currentUser && encryptionKey) {
        if (loadedRef.current.section !== activeSection || loadedRef.current.userId !== currentUser.id) {
            loadedRef.current = { section: activeSection, userId: currentUser.id };
            loadDataAndSettings();
        }
    } else if (!currentUser || !encryptionKey) {
      setBoys([]);
      setSettings(null);
      setDataLoading(false);
      loadedRef.current = { section: null, userId: undefined };
    } else if (!activeSection && currentUser) {
      // FIX: If logged in but no section selected, we are not loading data.
      setDataLoading(false);
      loadedRef.current = { section: null, userId: currentUser.id };
    }
  }, [activeSection, currentUser?.id, encryptionKey, loadDataAndSettings]);

  // Handle online/offline sync with Exponential Backoff
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout;

    const performSync = async () => {
        if (!encryptionKey || !navigator.onLine) return;

        try {
            const success = await syncPendingWrites(encryptionKey);
            if (success) {
                Logger.info('Sync complete.');
                syncAttempts.current = 0; // Reset attempts on success
                refreshData();
            } else {
                throw new Error('Sync failed (likely network)');
            }
        } catch (error) {
            syncAttempts.current++;
            const delay = Math.min(1000 * (2 ** syncAttempts.current), 30000); // Cap at 30 seconds
            Logger.warn(`Sync failed. Retrying in ${delay}ms...`, error);
            syncTimeout = setTimeout(performSync, delay);
        }
    };

    const handleOnline = () => {
        Logger.info('App came online. Starting sync...');
        performSync();
    };
    
    window.addEventListener('online', handleOnline);
    
    // Attempt sync on mount if online
    if (encryptionKey && navigator.onLine) {
        performSync();
    }

    const handleDataRefresh = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (activeSection && customEvent.detail.section === activeSection) {
            Logger.info('Cache updated in background, refreshing UI data...');
            refreshData();
        }
    };
    window.addEventListener('datarefreshed', handleDataRefresh);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('datarefreshed', handleDataRefresh);
        clearTimeout(syncTimeout);
    };
  }, [activeSection, encryptionKey, refreshData]);

  return { boys, settings, dataLoading: isLoading, dataError, refreshData, setSettings };
};