"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import HomePage from './components/HomePage';
import WeeklyMarksPage from './components/WeeklyMarksPage';
import BoyMarksPage from './components/BoyMarksPage';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import DashboardPage from './components/DashboardPage';
import AuditLogPage from './components/AuditLogPage';
import SectionSelectPage from './components/SectionSelectPage';
import SettingsPage from './components/SettingsPage'; // This is now Section-Specific Settings
import GlobalSettingsPage from './components/GlobalSettingsPage'; // New: Global Settings
import AccountSettingsPage from './components/AccountSettingsPage'; // New: Account Settings
import HelpPage from './components/HelpPage';
import Toast from './components/Toast';
import { HomePageSkeleton } from './components/SkeletonLoaders';
import { fetchBoys, syncPendingWrites, deleteOldAuditLogs, fetchUserRole } from './services/db';
import { initializeFirebase, getAuthInstance } from './services/firebase';
import { getSettings } from './services/settings';
import { Boy, View, Page, BoyMarksPageView, Section, SectionSettings, ToastMessage, ToastType, UserRole } from './types';
import Modal from './components/Modal';

type ConfirmationModalType = 'navigate' | 'switchSection' | 'signOut' | null;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [activeSection, setActiveSection] = useState<Section | null>(() => localStorage.getItem('activeSection') as Section | null);
  const [view, setView] = useState<View>({ page: 'home' });
  const [boys, setBoys] = useState<Boy[]>([]);
  const [settings, setSettings] = useState<SectionSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noRoleError, setNoRoleError] = useState<string | null>(null);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState<ConfirmationModalType>(null);
  const [nextView, setNextView] = useState<View | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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
  
  useEffect(() => {
    try {
      initializeFirebase();
      const auth = getAuthInstance();
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const role = await fetchUserRole(user.uid);
          if (role === null) {
            setNoRoleError('Your account does not have an assigned role. Please contact an administrator to gain access.');
            await signOut(auth);
            setCurrentUser(null);
            setIsLoading(false);
            return;
          }
          setUserRole(role);
          setNoRoleError(null);
        } else {
          setIsLoading(false); 
          setActiveSection(null);
          setSettings(null);
          setUserRole(null);
          localStorage.removeItem('activeSection');
          setNoRoleError(null);
        }
        setCurrentUser(user);
      });
      return () => unsubscribe();
    } catch (err: any) {
      setError(`Failed to initialize Firebase. Error: ${err.message}`);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser === undefined) {
      setIsLoading(true);
    } else if (currentUser) {
      if (activeSection) {
        deleteOldAuditLogs(activeSection).then(() => {
          loadDataAndSettings();
        });
      } else {
        setIsLoading(false);
      }
    }
  }, [currentUser, activeSection, loadDataAndSettings]);

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
    syncPendingWrites().then(synced => {
        if(synced) refreshData();
    });

    return () => {
        window.removeEventListener('online', handleOnline);
    };
  }, [refreshData, showToast]);
  
  useEffect(() => {
    const handleDataRefresh = (event: Event) => {
        const customEvent = event as CustomEvent;
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
      setBoys([]);
      setSettings(null);
      setUserRole(null);
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

  const handleNavigation = (newView: View) => {
    if (hasUnsavedChanges && newView.page !== view.page) {
      setNextView(newView);
      setConfirmModalType('navigate');
    } else {
      setView(newView);
    }
  };

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
      case 'settings': // Section-specific settings
        return <SettingsPage activeSection={activeSection!} currentSettings={settings} onSettingsSaved={setSettings} showToast={showToast} userRole={userRole} />;
      case 'globalSettings': // New: Global settings
        return <GlobalSettingsPage activeSection={activeSection!} showToast={showToast} userRole={userRole} refreshData={refreshData} />;
      case 'accountSettings': // New: Account settings
        return <AccountSettingsPage showToast={showToast} />;
      case 'help':
        return <HelpPage />;
      case 'boyMarks':
        const boyMarksView = view as BoyMarksPageView;
        return <BoyMarksPage boyId={boyMarksView.boyId} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection!} showToast={showToast} />;
      case 'signup':
        return null;
      default:
        return <HomePage boys={boys} setView={handleNavigation} refreshData={refreshData} activeSection={activeSection!} showToast={showToast} />;
    }
  };
  
  const handleGoBackFromHelp = () => {
    setView({ page: 'home' });
  };
  
  const renderApp = () => {
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
    
    if (currentUser === undefined || (currentUser && isLoading && activeSection && view.page !== 'signup')) {
        return <HomePageSkeleton />;
    }

    if (noRoleError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
                    <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                    <p className="text-slate-700">{noRoleError}</p>
                    <p className="text-slate-500">Please ensure your email address is registered with an administrator.</p>
                    <button
                        onClick={() => setNoRoleError(null)}
                        className="mt-6 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }
    
    if (!currentUser) {
        if (view.page === 'signup') {
            return <SignupPage onNavigateToHelp={() => setView({ page: 'help' })} showToast={showToast} onSignupSuccess={handleSelectSection} onNavigateBack={() => setView({ page: 'home' })} />;
        }
        return <LoginPage onNavigateToHelp={() => setView({ page: 'help' })} showToast={showToast} onNavigateToSignup={handleNavigation} />;
    }
    
    if (!activeSection) {
        return <SectionSelectPage onSelectSection={handleSelectSection} onNavigateToHelp={() => setView({ page: 'help' })} />;
    }
    
    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

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