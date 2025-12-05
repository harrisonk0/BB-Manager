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
  // Start with dataLoading as false, as we only load data once a section is selected.
  const [boys, setBoys] = useState<Boy[]>([]);
  const [settings, setSettings] = useState<SectionSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(false); 
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Use a ref to track the last successfully loaded context (user/section)
  const loadedContextRef = useRef<{ section: Section | null, userId: string | undefined }>({ section: null, userId: undefined });
  const syncAttempts = useRef(0);

  // Determine if we are currently waiting for data based on context change
  const isContextChanging = activeSection && currentUser && (
      loadedContextRef.current.section !== activeSection || 
      loadedContextRef.current.userId !== currentUser.id
  );
  
  // The effective loading state exposed to the component
  const isLoading = dataLoading || !!isContextChanging;

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
    const contextValid = activeSection && currentUser && encryptionKey;
    
    if (!contextValid) {
        // If context is invalid, ensure we are not loading and clear data
        setDataLoading(false);
        setBoys([]);
        setSettings(null);
        return;
    }
    
    setDataLoading(true);
    setDataError(null);
    
    try {
      try {
        await deleteOldAuditLogs(activeSection); // Best-effort cleanup
      } catch (cleanupErr: any) {
        Logger.warn("Skipping audit log cleanup", cleanupErr);
      }

      await refreshData();
    } catch (err: any) {
      Logger.error("Failed to fetch data", err);
      setDataError(`Failed to connect to the database. You may not have permission. Error: ${err.message}`);
    } finally {
      // CRITICAL FIX: Update the loaded context ref here regardless of success/failure
      // to prevent infinite loop if data loading fails.
      loadedContextRef.current = { section: activeSection, userId: currentUser.id };
      setDataLoading(false);
    }
  }, [activeSection, currentUser, encryptionKey, refreshData]);

  // Core data loading effect: runs when user/section context changes
  useEffect(() => {
    if (isContextChanging) {
        loadDataAndSettings();
    } else if (!currentUser || !activeSection) {
        // If logged out or no section selected, reset data and context ref
        setBoys([]);
        setSettings(null);
        setDataLoading(false);
        loadedContextRef.current = { section: null, userId: undefined };
    }
  }, [isContextChanging, currentUser, activeSection, loadDataAndSettings]);

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