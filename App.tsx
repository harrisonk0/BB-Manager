import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import HomePage from './components/HomePage';
import WeeklyMarksPage from './components/WeeklyMarksPage';
import BoyMarksPage from './components/BoyMarksPage';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import AuditLogPage from './components/AuditLogPage';
import { HomePageSkeleton } from './components/SkeletonLoaders';
import { fetchBoys, syncPendingWrites } from './services/db';
import { initializeFirebase, getAuthInstance } from './services/firebase';
import { Boy, View, Page, BoyMarksPageView } from './types';
import Modal from './components/Modal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [view, setView] = useState<View>({ page: 'home' });
  const [boys, setBoys] = useState<Boy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New states for navigation confirmation
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [viewToNavigateTo, setViewToNavigateTo] = useState<View | null>(null);

  const refreshData = useCallback(async () => {
    try {
        const allBoys = await fetchBoys();
        setBoys(allBoys.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
        console.error("Failed to refresh data:", err);
        setError("Could not refresh data. Please check your connection.");
    }
  }, []);

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
    // Attempt sync on initial load as well in case app was closed while offline
    syncPendingWrites().then(synced => {
        if(synced) refreshData();
    });

    return () => {
        window.removeEventListener('online', handleOnline);
    };
  }, [refreshData]);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allBoys = await fetchBoys();
      setBoys(allBoys.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(`Failed to connect to the database. You may not have permission. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    try {
      initializeFirebase();
      const auth = getAuthInstance();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        if (user) {
          loadData();
        } else {
          setIsLoading(false); // Not logged in, stop loading
        }
      });
      return () => unsubscribe();
    } catch (err: any) {
      setError(`Failed to initialize Firebase. Error: ${err.message}`);
      setIsLoading(false);
    }
  }, [loadData]);

  const handleNavigation = (newView: View) => {
    if (hasUnsavedChanges && newView.page !== view.page) {
      setViewToNavigateTo(newView);
      setIsConfirmModalOpen(true);
    } else {
      setView(newView);
    }
  };

  const confirmNavigation = () => {
    if (viewToNavigateTo) {
      setHasUnsavedChanges(false); // Allow navigation
      setView(viewToNavigateTo);
    }
    setIsConfirmModalOpen(false);
    setViewToNavigateTo(null);
  };

  const cancelNavigation = () => {
    setIsConfirmModalOpen(false);
    setViewToNavigateTo(null);
  };

  const handleSignOut = async () => {
    const performSignOut = async () => {
      try {
        const auth = getAuthInstance();
        await signOut(auth);
        setBoys([]); // Clear data on sign out
        setView({ page: 'home' });
      } catch (error) {
        console.error('Sign out failed', error);
        setError('Failed to sign out. Please try again.');
      }
    };

    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.')) {
        setHasUnsavedChanges(false);
        await performSignOut();
      }
    } else {
      await performSignOut();
    }
  };

  const allWeeks = useMemo(() => {
    const allDates = new Set<string>();
    boys.forEach(boy => {
      boy.marks.forEach(mark => {
        allDates.add(mark.date);
      });
    });
    return Array.from(allDates);
  }, [boys]);


  const renderMainContent = () => {
    switch (view.page) {
      case 'home':
        return <HomePage boys={boys} setView={handleNavigation} refreshData={refreshData} />;
      case 'weeklyMarks':
        return <WeeklyMarksPage boys={boys} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} />;
      case 'dashboard':
        return <DashboardPage boys={boys} />;
      case 'auditLog':
        return <AuditLogPage refreshData={refreshData} />;
      case 'boyMarks':
        const boyMarksView = view as BoyMarksPageView;
        return <BoyMarksPage boyId={boyMarksView.boyId} refreshData={refreshData} totalWeeks={allWeeks.length} setHasUnsavedChanges={setHasUnsavedChanges} />;
      default:
        return <HomePage boys={boys} setView={handleNavigation} refreshData={refreshData} />;
    }
  };

  const renderApp = () => {
    if (currentUser === undefined || (currentUser && isLoading)) {
        return <HomePageSkeleton />;
    }
    
    if (!currentUser) {
        return <LoginPage />;
    }
    
    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

    return (
        <>
            <Header setView={handleNavigation} user={currentUser} onSignOut={handleSignOut} />
            <main className="p-4 sm:p-6 lg:p-8">
                {renderMainContent()}
            </main>
        </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {renderApp()}
      <Modal isOpen={isConfirmModalOpen} onClose={cancelNavigation} title="Unsaved Changes">
        <div className="space-y-4">
            <p>You have unsaved changes. Are you sure you want to leave? Your changes will be lost.</p>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={cancelNavigation}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 dark:text-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Stay
              </button>
              <button
                onClick={confirmNavigation}
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
