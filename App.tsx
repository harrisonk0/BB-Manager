/**
 * @file App.tsx
 * @description The root component of the application.
 * It manages global state such as the current user, active section, and current view.
 * It also handles routing, data fetching, authentication, and offline synchronization.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Use named imports for Firebase v9 compatibility.
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import HomePage from './components/HomePage';
import WeeklyMarksPage from './components/WeeklyMarksPage';
import BoyMarksPage from './components/BoyMarksPage';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import AuditLogPage from './components/AuditLogPage';
import SectionSelectPage from './components/SectionSelectPage';
import SettingsPage from './components/SettingsPage';
import HelpPage from './components/HelpPage';
import Toast from './components/Toast';
import { HomePageSkeleton } from './components/SkeletonLoaders';
import { fetchBoys, syncPendingWrites, deleteOldAuditLogs, updateUserActivity, fetchRecentActivity } from './services/db';
import { initializeFirebase, getAuthInstance } from './services/firebase';
import { getSettings } from './services/settings';
import { Boy, View, Page, BoyMarksPageView, Section, SectionSettings, ToastMessage, ToastType } from './types';
import Modal from './components/Modal';

// Defines the possible reasons for showing the confirmation modal.
type ConfirmationModalType = 'navigate' | 'switchSection' | 'signOut' | null;

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  // `undefined` represents the initial state before auth status is checked.
  // `null` means the user is logged out.
  // `User` object means the user is logged in.
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  // The currently active section ('company' or 'junior'), persisted in localStorage.
  const [activeSection, setActiveSection] = useState<Section | null>(() => localStorage.getItem('activeSection') as Section | null);
  // The current view/page being displayed to the user.
  const [view, setView] = useState<View>({ page: 'home' });
  // The list of all boys for the active section.
  const [boys, setBoys] = useState<Boy[]>([]);
  // The settings for the active section (e.g., meeting day).
  const [settings, setSettings] = useState<SectionSettings | null>(null);
  // Global loading state, primarily used on initial data load.
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Global error state to display critical errors to the user.
  const [error, setError] = useState<string | null>(null);
  
  // State for handling unsaved changes warning.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState<ConfirmationModalType>(null);
  const [nextView, setNextView] = useState<View | null>(null);

  // State for toast notifications.
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /**
   * Displays a toast notification.
   */
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  
  /**
   * Removes a toast notification by its ID.
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /**
   * Fetches all necessary data for the active section (boys, settings) and updates the state.
   */
  const refreshData = useCallback(async () => {
    if (!activeSection) return;
    try {
        const [allBoys, sectionSettings] = await Promise.all([
          fetchBoys(activeSection),
          getSettings(activeSection)
        ]);
        setBoys(allBoys.sort((a, b) => a.name.localeCompare(b.name)));
        setSettings(sectionSettings);
    } catch (err) {
        console.error("Failed to refresh data:", err);
        setError("Could not refresh data. Please check your connection.");
    }
  }, [activeSection]);

  /**
   * EFFECT: Handles online/offline status changes.
   * When the app comes online, it attempts to sync any pending offline writes.
   * If the sync is successful, it refreshes the local data.
   */
  useEffect(() => {
    const handleOnline = () => {
        console.log('App is online, attempting to sync...');
        syncPendingWrites().then(synced => {
            if (synced) {
                console.log('Sync complete, refreshing data.');
                showToast('Data synced successfully.', 'success');
                refreshData();
            }
        });
    };
    
    window.addEventListener('online', handleOnline);
    // Also attempt a sync on initial app load.
    syncPendingWrites().then(synced => {
        if(synced) refreshData();
    });

    return () => {
        window.removeEventListener('online', handleOnline);
    };
  }, [refreshData, showToast]);
  
  /**
   * A wrapper around refreshData that also manages the global loading state.
   */
  const loadDataAndSettings = useCallback(async () => {
    if (!activeSection) return;
    setIsLoading(true);
    setError(null);
    try {
      await refreshData();
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(`Failed to connect to the database. You may not have permission. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSection, refreshData]);
  
  /**
   * EFFECT: Handles Firebase initialization and authentication state.
   * This is the main effect that drives the application's lifecycle.
   */
  useEffect(() => {
    try {
      initializeFirebase();
      const auth = getAuthInstance();
      // Listen for changes in the user's authentication state.
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        if (user) {
          // Fire-and-forget activity update and toast notification.
          if (user.email) {
            (async () => {
              await updateUserActivity(user.email!);
              const recentUsers = await fetchRecentActivity(user.email!);
              if (recentUsers.length > 0) {
                  const usersToShow = recentUsers.slice(0, 3);
                  const usersString = usersToShow.join(', ');
                  const message = `Last active: ${usersString}`;
                  showToast(message, 'info');
              }
            })();
          }
          // If user is logged in, run cleanup tasks.
          if(activeSection) {
            deleteOldAuditLogs(activeSection).then(() => {
              loadDataAndSettings();
            });
          } else {
            // If logged in but no section selected, stop loading and show section select page.
            setIsLoading(false); 
          }
        } else {
          // If user is logged out, clear all state and stop loading.
          setIsLoading(false); 
          setActiveSection(null);
          setSettings(null);
          localStorage.removeItem('activeSection');
        }
      });
      // Cleanup subscription on component unmount.
      return () => unsubscribe();
    } catch (err: any) {
      setError(`Failed to initialize Firebase. Error: ${err.message}`);
      setIsLoading(false);
    }
  }, [loadDataAndSettings, activeSection, showToast]);

  /**
   * EFFECT: Listens for custom 'datarefreshed' event.
   * This is triggered by the background sync in services/db.ts. When the local cache
   * is updated with fresh data from the server, this effect will trigger a UI refresh.
   */
  useEffect(() => {
    const handleDataRefresh = (event: Event) => {
        const customEvent = event as CustomEvent;
        // Only refresh if the update was for the currently active section
        if (activeSection && customEvent.detail.section === activeSection) {
            console.log('Cache updated in background, refreshing UI data...');
            refreshData();
        }
    };

    window.addEventListener('datarefreshed', handleDataRefresh);

    return () => {
        window.removeEventListener('datarefreshed', handleDataRefresh);
    };
  }, [activeSection, refreshData]);
  
  // --- EVENT HANDLERS ---
  
  const handleSelectSection = (section: Section) => {
    localStorage.setItem('activeSection', section);
    setActiveSection(section);
    setView({ page: 'home' });
  };
  
  const performSwitchSection = () => {
    localStorage.removeItem('activeSection');
    setActiveSection(null);
    setBoys([]);
    setSettings(null);
    setView({ page: 'home' });
    setHasUnsavedChanges(false);
  };

  const handleSwitchSection = () => {
    if (hasUnsavedChanges) {
      setConfirmModalType('switchSection');
    } else {
      performSwitchSection();
    }
  };

  const performSignOut = async () => {
    try {
      const auth = getAuthInstance();
      await signOut(auth);
      // Clear all user-related state after sign out.
      setBoys([]);
      setSettings(null);
      setView({ page: 'home' });
      setActiveSection(null);
      localStorage.removeItem('activeSection');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Sign out failed', error);
      setError('Failed to sign out. Please try again.');
    }
  };

  const handleSignOut = () => {
    if (hasUnsavedChanges) {
      setConfirmModalType('signOut');
    } else {
      performSignOut();
    }
  };

  /**
   * Handles navigation requests. If there are unsaved changes, it shows a confirmation modal.
   * Otherwise, it navigates directly.
   */
  const handleNavigation = (newView: View) => {
    if (hasUnsavedChanges && newView.page !== view.page) {
      setNextView(newView);
      setConfirmModalType('navigate');
    } else {
      setView(newView);
    }
  };

  /**
   * Logic for the confirmation modal's "Leave" button.
   * Performs the action that was originally blocked.
   */
  const confirmAction = () => {
    switch (confirmModalType) {
      case 'navigate':
        if (nextView) {
          setHasUnsavedChanges(false);
          setView(nextView);
        }
        break;
      case 'switchSection':
        performSwitchSection();
        break;
      case 'signOut':
        performSignOut();
        break;
    }
    cancelAction();
  };

  const cancelAction = () => {
    setConfirmModalType(null);
    setNextView(null);
  };

  // --- RENDER LOGIC ---

  /**
   * Renders the main content based on the current view state.
   */
  const renderMainContent = () => {
    if (!activeSection) return null;

    switch (view.page) {
      case 'home':
        return <HomePage boys={boys} setView={handleNavigation} refreshData={refreshData} activeSection={activeSection!} showToast={showToast} />;
      case 'weeklyMarks':
        return <WeeklyMarksPage boys={boys} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection!} settings={settings} showToast={showToast} />;
      case 'dashboard':
        return <DashboardPage boys={boys} activeSection={activeSection!} />;
      case 'auditLog':
        return <AuditLogPage refreshData={refreshData} activeSection={activeSection!} showToast={showToast} />;
      case 'settings':
        return <SettingsPage activeSection={activeSection!} currentSettings={settings} onSettingsSaved={setSettings} showToast={showToast} />;
      case 'help':
        return <HelpPage />;
      case 'boyMarks':
        const boyMarksView = view as BoyMarksPageView;
        return <BoyMarksPage boyId={boyMarksView.boyId} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection!} showToast={showToast} />;
      default:
        return <HomePage boys={boys} setView={handleNavigation} refreshData={refreshData} activeSection={activeSection!} showToast={showToast} />;
    }
  };
  
  const handleGoBackFromHelp = () => {
    setView({ page: 'home' });
  };
  
  /**
   * The main render function that decides what to show based on the app's state
   * (e.g., loading, logged out, no section selected, error).
   */
  const renderApp = () => {
    // Special case for the Help page to ensure it has a proper header/back button
    // even when the user is not fully logged in.
    if (view.page === 'help') {
      return (
        <>
          {currentUser && activeSection ? (
            <Header setView={handleNavigation} user={currentUser} onSignOut={handleSignOut} activeSection={activeSection} onSwitchSection={handleSwitchSection} />
          ) : (
            <header className="bg-slate-700 text-white shadow-md sticky top-0 z-20">
              <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                  <div className="flex items-center space-x-4">
                     <img 
                        src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" 
                        alt="The Boys' Brigade Logo" 
                        className="h-14 rounded-md"
                      />
                  </div>
                  <button onClick={handleGoBackFromHelp} className="px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-slate-700">
                    Back to App
                  </button>
                </div>
              </nav>
            </header>
          )}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <HelpPage />
          </main>
        </>
      );
    }
    
    // 1. Show skeleton loader while checking auth or loading initial data.
    if (currentUser === undefined || (currentUser && isLoading && activeSection)) {
        return <HomePageSkeleton />;
    }
    
    // 2. If user is not logged in, show the login page.
    if (!currentUser) {
        return <LoginPage onNavigateToHelp={() => setView({ page: 'help' })} />;
    }
    
    // 3. If logged in but no section is selected, show the section select page.
    if (!activeSection) {
        return <SectionSelectPage onSelectSection={handleSelectSection} onNavigateToHelp={() => setView({ page: 'help' })} />;
    }
    
    // 4. If there's a critical error, display it.
    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

    // 5. If fully loaded and authenticated, render the main app layout.
    return (
        <>
            <Header setView={handleNavigation} user={currentUser} onSignOut={handleSignOut} activeSection={activeSection} onSwitchSection={handleSwitchSection} />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderMainContent()}
            </main>
        </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 text-slate-800">
      {/* Toast Notification Container */}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex flex-col items-end px-4 py-6 space-y-2 pointer-events-none sm:p-6 sm:items-end sm:justify-start z-[100]"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </div>

      {renderApp()}
      
      <Modal isOpen={!!confirmModalType} onClose={cancelAction} title="Unsaved Changes">
        <div className="space-y-4">
            <p className="text-slate-600">You have unsaved changes. Are you sure you want to leave? Your changes will be lost.</p>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={cancelAction}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                Stay
              </button>
              <button
                onClick={confirmAction}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Leave
              </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;