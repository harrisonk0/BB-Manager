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
import { branding } from './components/branding';
import Modal from './components/Modal';
import { clearStoredSection } from '@/hooks/sectionStorage';

import { useToastNotifications } from '@/hooks/useToastNotifications';
import { useAuthAndRole } from '@/hooks/useAuthAndRole';
import { useSectionManagement } from '@/hooks/useSectionManagement';
import { useAppData } from '@/hooks/useAppData';
import { useUnsavedChangesProtection } from '@/hooks/useUnsavedChangesProtection';

const App: React.FC = () => {
  const { toasts, showToast, removeToast } = useToastNotifications();
  const {
    currentUser,
    userRole,
    noRoleError,
    authLoading,
    passwordRecovery,
    performSignOut,
    completePasswordRecovery,
    setUserRole,
  } = useAuthAndRole();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [view, setView] = useState<View>({ page: 'home' });
  const { activeSection, setActiveSection, handleSelectSection, performSwitchSection } = useSectionManagement(setView);
  const { boys, settings, dataLoading, dataError, refreshData, setSettings } = useAppData(
    activeSection,
    showToast,
    currentUser
  );
  const {
    setView: navigateWithProtection,
    confirmModalType,
    confirmAction,
    cancelAction,
    handleSwitchSection: handleSwitchSectionWithProtection,
    handleSignOut: handleSignOutWithProtection,
  } = useUnsavedChangesProtection(
    view,
    setView,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    performSwitchSection,
    performSignOut
  );

  useEffect(() => {
    if (noRoleError) {
      setActiveSection(null);
      setUserRole(null);
      clearStoredSection();
    }
  }, [noRoleError, setActiveSection, setUserRole]);

  const renderMainContent = () => {
    if (!activeSection) return null;

    switch (view.page) {
      case 'home':
        return <HomePage boys={boys} setView={navigateWithProtection} refreshData={refreshData} activeSection={activeSection} showToast={showToast} />;
      case 'weeklyMarks':
        return <WeeklyMarksPage boys={boys} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection} settings={settings} showToast={showToast} />;
      case 'dashboard':
        return <DashboardPage boys={boys} activeSection={activeSection} />;
      case 'settings':
        return <SettingsPage activeSection={activeSection} currentSettings={settings} onSettingsSaved={setSettings} showToast={showToast} userRole={userRole} onNavigateToAccountSettings={() => navigateWithProtection({ page: 'accountSettings' })} />;
      case 'accountSettings':
        return <AccountSettingsPage showToast={showToast} activeSection={activeSection} />;
      case 'boyMarks': {
        const boyMarksView = view as BoyMarksPageView;
        return (
          <BoyMarksPage
            boyId={boyMarksView.boyId}
            refreshData={refreshData}
            setHasUnsavedChanges={setHasUnsavedChanges}
            activeSection={activeSection}
            showToast={showToast}
            onBack={() => navigateWithProtection({ page: 'home' })}
          />
        );
      }
      default:
        return <HomePage boys={boys} setView={navigateWithProtection} refreshData={refreshData} activeSection={activeSection} showToast={showToast} />;
    }
  };

  const renderApp = () => {
    if (authLoading) {
      return <HomePageSkeleton />;
    }

    if (!currentUser) {
      return <LoginPage />;
    }

    if (passwordRecovery) {
      return (
        <AccountSettingsPage
          showToast={showToast}
          activeSection={activeSection ?? 'company'}
          recoveryMode
          onRecoveryComplete={completePasswordRecovery}
        />
      );
    }

    if (noRoleError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4">
          <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
            <img src={branding.bbLogo} alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
            <p className="text-slate-700">{noRoleError}</p>
            <p className="text-slate-500">Please ensure your email address is registered with an administrator.</p>
            <button
              type="button"
              onClick={() => { void performSignOut(); }}
              className="mt-6 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue"
            >
              Return to Login
            </button>
          </div>
        </div>
      );
    }

    if (currentUser && dataLoading) {
      return <HomePageSkeleton />;
    }

    if (!activeSection) {
      return <SectionSelectPage onSelectSection={handleSelectSection} onSignOut={handleSignOutWithProtection} />;
    }

    if (dataError) {
      return <div className="text-center p-8 text-red-500">{dataError}</div>;
    }

    return (
      <>
        <Header
          setView={navigateWithProtection}
          onSignOut={handleSignOutWithProtection}
          activeSection={activeSection}
          onSwitchSection={handleSwitchSectionWithProtection}
          currentUser={currentUser}
          userRole={userRole}
          currentPage={view.page}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderMainContent()}
        </main>
      </>
    );
  };

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
