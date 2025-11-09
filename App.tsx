import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { HomePageSkeleton } from './components/SkeletonLoaders';
import { fetchBoys, syncPendingWrites, deleteOldAuditLogs, migrateFirestoreDataIfNeeded } from './services/db';
import { initializeFirebase, getAuthInstance } from './services/firebase';
import { getSettings } from './services/settings';
import { Boy, View, Page, BoyMarksPageView, Section, SectionSettings } from './types';
import Modal from './components/Modal';

type ConfirmationModalType = 'navigate' | 'switchSection' | 'signOut' | null;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<Section | null>(() => localStorage.getItem('activeSection') as Section | null);
  const [view, setView] = useState<View>({ page: 'home' });
  const [boys, setBoys] = useState<Boy[]>([]);
  const [settings, setSettings] = useState<SectionSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState<ConfirmationModalType>(null);
  const [nextView, setNextView] = useState<View | null>(null);

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

  useEffect(() => {
    const handleOnline = () => {
        console.log('App is online, attempting to sync...');
        syncPendingWrites().then(synced => {
            if (synced) {
                console.log('Sync complete, refreshing data.');
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
  }, [refreshData]);
  
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
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        if (user) {
          migrateFirestoreDataIfNeeded().then(() => {
            if(activeSection) {
              deleteOldAuditLogs(activeSection).then(() => {
                loadDataAndSettings();
              });
            } else {
              setIsLoading(false); 
            }
          });
        } else {
          setIsLoading(false); 
          setActiveSection(null);
          setSettings(null);
          localStorage.removeItem('activeSection');
        }
      });
      return () => unsubscribe();
    } catch (err: any)
{
      setError(`Failed to initialize Firebase. Error: ${err.message}`);
      setIsLoading(false);
    }
  }, [loadDataAndSettings, activeSection]);
  
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
        return <HomePage boys={boys} setView={handleNavigation} refreshData={refreshData} activeSection={activeSection} />;
      case 'weeklyMarks':
        return <WeeklyMarksPage boys={boys} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection} settings={settings} />;
      case 'dashboard':
        return <DashboardPage boys={boys} activeSection={activeSection} />;
      case 'auditLog':
        return <AuditLogPage refreshData={refreshData} activeSection={activeSection} />;
      case 'settings':
        return <SettingsPage activeSection={activeSection} currentSettings={settings} onSettingsSaved={setSettings} />;
      case 'boyMarks':
        const boyMarksView = view as BoyMarksPageView;
        return <BoyMarksPage boyId={boyMarksView.boyId} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection} />;
      default:
        return <HomePage boys={boys} setView={handleNavigation} refreshData={refreshData} activeSection={activeSection} />;
    }
  };

  const renderApp = () => {
    if (currentUser === undefined || (currentUser && isLoading && activeSection)) {
        return <HomePageSkeleton />;
    }
    
    if (!currentUser) {
        return <LoginPage />;
    }
    
    if (!activeSection) {
        return <SectionSelectPage onSelectSection={handleSelectSection} />;
    }
    
    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

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