import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import WeeklyMarksPage from './components/WeeklyMarksPage';
import BoyMarksPage from './components/BoyMarksPage';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import SettingsPage from './components/SettingsPage';
import SectionSelectPage from './components/SectionSelectPage';
import AccountSettingsPage from './components/AccountSettingsPage';
import Toast from './components/Toast';
import { HomePageSkeleton } from './components/SkeletonLoaders';
import { View, BoyMarksPageView } from './types';
import Modal from './components/Modal';

// Import custom hooks
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { useAuthAndRole } from '@/hooks/useAuthAndRole';
import { useSectionManagement } from '@/hooks/useSectionManagement';
import { useAppData } from '@/hooks/useAppData';
import { useUnsavedChangesProtection } from '@/hooks/useUnsavedChangesProtection';

const App: React.FC = () => {
  // Use toast notifications hook
  const { toasts, showToast, removeToast } = useToastNotifications();

  // Use auth and role hook
  const {
    currentUser,
    userRole,
    noRoleError,
    authLoading,
    performSignOut,
    setCurrentUser,
    setUserRole,
  } = useAuthAndRole();

  // State for unsaved changes protection
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [view, setView] = useState<View>({ page: 'home' });

  // Use section management hook
  const { activeSection, setActiveSection, handleSelectSection, performSwitchSection } = useSectionManagement(setView);

  // Use app data hook
  const { boys, settings, dataLoading, dataError, refreshData, setSettings } = useAppData(
    activeSection,
    showToast,
    currentUser
  );

  // Use unsaved changes protection hook
  const {
    setView: navigateWithProtection,
    confirmModalType,
    confirmAction,
    cancelAction,
    handleSwitchSection: handleSwitchSectionWithProtection,
    handleSignOut: handleSignOutWithProtection,
  } = useUnsavedChangesProtection(
    view,
    setView, // Pass internal setView
    hasUnsavedChanges,
    setHasUnsavedChanges,
    performSwitchSection,
    performSignOut
  );

  // Handle no role error: if noRoleError is set, force sign out and clear section
  useEffect(() => {
    if (noRoleError) {
      // Clear any active section and user role if there's a no-role error
      setActiveSection(null);
      setUserRole(null);
      localStorage.removeItem('activeSection');
    }
  }, [noRoleError, setActiveSection, setUserRole]);

  const renderMainContent = () => {
    if (!activeSection) return null; // Should not happen if logic below is correct

    switch (view.page) {
      case 'home':
        return <HomePage boys={boys} setView={navigateWithProtection} refreshData={refreshData} activeSection={activeSection!} showToast={showToast} />;
      case 'weeklyMarks':
        return <WeeklyMarksPage boys={boys} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection!} settings={settings} showToast={showToast} />;
      case 'dashboard':
        return <DashboardPage boys={boys} activeSection={activeSection!} />;
      case 'settings': // Section-specific settings
        return <SettingsPage activeSection={activeSection!} currentSettings={settings} onSettingsSaved={setSettings} showToast={showToast} userRole={userRole} onNavigateToAccountSettings={() => navigateWithProtection({ page: 'accountSettings' })} />;
      case 'accountSettings': // New: Account settings
        return <AccountSettingsPage showToast={showToast} activeSection={activeSection!} />;
      case 'boyMarks':
        const boyMarksView = view as BoyMarksPageView;
        return <BoyMarksPage boyId={boyMarksView.boyId} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection!} showToast={showToast} />;
      default:
        return <HomePage boys={boys} setView={navigateWithProtection} refreshData={refreshData} activeSection={activeSection!} showToast={showToast} />;
    }
  };
  
  const renderApp = () => {
    // Handle loading state first
    if (authLoading) {
        return <HomePageSkeleton />;
    }

    if (currentUser && dataLoading) {
        return <HomePageSkeleton />;
    }

    // Handle no role error
    if (noRoleError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
                    <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
                    <h2 className="2xl font-bold text-red-600">Access Denied</h2>
                    <p className="text-slate-700">{noRoleError}</p>
                    <p className="text-slate-500">Please ensure your email address is registered with an administrator.</p>
                    <button
                        onClick={() => setCurrentUser(null)} // Reset currentUser to trigger login page
                        className="mt-6 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }
    
    // Handle unauthenticated user
    if (!currentUser) {
        return <LoginPage />;
    }
    
    // Handle authenticated user, but no active section selected yet
    if (!activeSection) {
        return <SectionSelectPage onSelectSection={handleSelectSection} onSignOut={handleSignOutWithProtection} />;
    }
    
    // Handle general errors
    if (dataError) {
        return <div className="text-center p-8 text-red-500">{dataError}</div>;
    }

    // Render main app content with header
    return (
        <>
            <Header setView={navigateWithProtection} onSignOut={handleSignOutWithProtection} activeSection={activeSection} onSwitchSection={handleSwitchSectionWithProtection} />
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
