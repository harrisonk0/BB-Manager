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
import SignupPage from './components/SignupPage'; // Import the new SignupPage
import DashboardPage from './components/DashboardPage';
import AuditLogPage from './components/AuditLogPage';
import SectionSelectPage from './components/SectionSelectPage';
import SettingsPage from './components/SettingsPage';
import HelpPage from './components/HelpPage';
import Toast from './components/Toast';
import { HomePageSkeleton } from './components/SkeletonLoaders';
import { fetchBoys, syncPendingWrites, deleteOldAuditLogs, fetchUserRole } from './services/db'; // Import fetchUserRole
import { initializeFirebase, getAuthInstance } from './services/firebase';
import { getSettings } from './services/settings';
import { Boy, View, Page, BoyMarksPageView, Section, SectionSettings, ToastMessage, ToastType, UserRole } from './types'; // Import UserRole
import Modal from './components/Modal';

// Defines the possible reasons for showing the confirmation modal.
type ConfirmationModalType = 'navigate' | 'switchSection' | 'signOut' | null;

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  // `undefined` represents the initial state before auth status is checked.
  // `null` means the user is logged out.
  // `User` object means the user is logged in.
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  // The role of the currently logged-in user.
  const [userRole, setUserRole] = useState<UserRole | null>(null);
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
  // New state for handling users without an assigned role.
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  
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
   * EFFECT 1: Firebase Initialization and Auth State Listener (runs once on mount)
   * This effect is responsible for setting up the Firebase app and listening to auth state changes.
   * It should run only once to avoid re-subscribing the auth listener.
   */
  useEffect(() => {
    try {
      initializeFirebase();
      const auth = getAuthInstance();
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // User logged in, fetch their role
          const role = await fetchUserRole(user.uid);
          if (role === null) {
            // User has no role, sign them out and show error
            setNoRoleError('Your account does not have an assigned role. Please contact an administrator to gain access.');
            await signOut(auth); // Sign out the user immediately
            setCurrentUser(null); // Manually set to null to trigger re-render faster
            setIsLoading(false);
            return; // Stop further processing for this user
          }
          setUserRole(role);
          setNoRoleError(null); // Clear any previous no-role error
        } else {
          // If user is logged out, clear all user-related state.
          setIsLoading(false); 
          setActiveSection(null);
          setSettings(null);
          setUserRole(null); // Clear user role on logout
          localStorage.removeItem('activeSection');
          setNoRoleError(null); // Clear no-role error on logout
        }
        setCurrentUser(user); // Set currentUser after role check
        // Other actions related to user login (like data loading or toast)
        // will be handled in a separate useEffect that depends on `currentUser` and `activeSection`.
      });
      return () => unsubscribe(); // Cleanup the auth listener on component unmount.
    } catch (err: any) {
      setError(`Failed to initialize Firebase. Error: ${err.message}`);
      setIsLoading(false);
    }
  }, []); // Empty dependency array ensures this runs only once on mount.

  /**
   * EFFECT 2: Handle actions *after* user logs in or section changes (data loading)
   * This effect reacts to `currentUser` and `activeSection` changes to perform subsequent actions.
   */
  useEffect(() => {
    if (currentUser === undefined) {
      // Still checking auth status, show skeleton.
      setIsLoading(true);
    } else if (currentUser) { // User is logged in
      // If user is logged in AND activeSection is set, load data and clean up audit logs.
      // Otherwise, if logged in but no section, stop loading to show SectionSelectPage.
      if (activeSection) {
        deleteOldAuditLogs(activeSection).then(() => {
          loadDataAndSettings();
        });
      } else {
        setIsLoading(false);
      }
    }
  }, [currentUser, activeSection, loadDataAndSettings]); // Dependencies for this effect.

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
      setUserRole(null); // Clear user role on sign out
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
        return <AuditLogPage refreshData={refreshData} activeSection={activeSection!} showToast={showToast} userRole={userRole} />;
      case 'settings':
        return <SettingsPage activeSection={activeSection!} currentSettings={settings} onSettingsSaved={setSettings} showToast={showToast} userRole={userRole} />;
      case 'help':
        return <HelpPage />;
      case 'boyMarks':
        const boyMarksView = view as BoyMarksPageView;
        return <BoyMarksPage boyId={boyMarksView.boyId} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection!} showToast={showToast} />;
      case 'signup': // Should not be reached if activeSection is set
        return null;
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
            <Header setView={handleNavigation} user={currentUser} onSignOut={handleSignOut} activeSection={activeSection} onSwitchSection={handleSwitchSection} userRole={userRole} />
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
    if (currentUser === undefined || (currentUser && isLoading && activeSection && view.page !== 'signup')) {
        return <HomePageSkeleton />;
    }

    // 2. If user has no role, display the specific error message.
    if (noRoleError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
                    <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                    <p className="text-slate-700">{noRoleError}</p>
                    <p className="text-slate-500">Please ensure your email address is registered with an administrator.</p>
                    <button
                        onClick={() => setNoRoleError(null)} // Allow user to dismiss and try logging in again
                        className="mt-6 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }
    
    // 3. If user is not logged in, show the login page or signup page.
    if (!currentUser) {
        if (view.page === 'signup') {
            return <SignupPage onNavigateToHelp={() => setView({ page: 'help' })} showToast={showToast} onSignupSuccess={handleSelectSection} />;
        }
        return <LoginPage onNavigateToHelp={() => setView({ page: 'help' })} showToast={showToast} onNavigateToSignup={handleNavigation} />;
    }
    
    // 4. If logged in but no section is selected, show the section select page.
    if (!activeSection) {
        return <SectionSelectPage onSelectSection={handleSelectSection} onNavigateToHelp={() => setView({ page: 'help' })} />;
    }
    
    // 5. If there's a critical error, display it.
    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

    // 6. If fully loaded and authenticated, render the main app layout.
    return (
        <>
            <Header setView={handleNavigation} user={currentUser} onSignOut={handleSignOut} activeSection={activeSection} onSwitchSection={handleSwitchSection} userRole={userRole} />
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
        className="fixed bottom-0 w-full max-w-sm mx-auto flex flex-col-reverse items-center p-4 space-y-2 space-y-reverse pointer-events-none z-[100]"
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