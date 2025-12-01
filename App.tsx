"use client";

import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import WeeklyMarksPage from './components/WeeklyMarksPage';
import BoyMarksPage from './components/BoyMarksPage';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import DashboardPage from './components/DashboardPage';
import AuditLogPage from './components/AuditLogPage';
import SettingsPage from './components/SettingsPage';
import SectionSelectPage from './components/SectionSelectPage';
import GlobalSettingsPage from './components/GlobalSettingsPage';
import AccountSettingsPage from './components/AccountSettingsPage';
import HelpPage from './components/HelpPage';
import PendingApprovalPage from './components/PendingApprovalPage';
import PasswordResetPage from './components/PasswordResetPage';
import Toast from './components/Toast';
import Modal from './components/Modal';
import { HomePageSkeleton } from './components/SkeletonLoaders';
import { View, BoyMarksPageView } from './types';

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
  const { currentUser, userRoleInfo, noRoleError, authLoading, roleLoading, performSignOut, setCurrentUser, setUserRoleInfo, isPasswordRecovery, encryptionKey } = useAuthAndRole();
  const userRole = userRoleInfo?.role || null;

  // State for unsaved changes protection
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [view, setView] = useState<View>({ page: 'home' }); 
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false); 

  // Use section management hook
  const { activeSection, setActiveSection, handleSelectSection, performSwitchSection } = useSectionManagement(
    setView, 
    setHasUnsavedChanges,
    performSignOut
  );

  // Use app data hook
  const { boys, settings, dataLoading, dataError, refreshData, setSettings } = useAppData(
    activeSection,
    showToast,
    currentUser,
    encryptionKey
  );

  // Use unsaved changes protection hook
  const {
    view: protectedView, 
    setView: navigateWithProtection,
    confirmModalType,
    confirmAction,
    cancelAction,
    handleSwitchSection: handleSwitchSectionWithProtection,
    handleSignOut: handleSignOutWithProtection,
  } = useUnsavedChangesProtection(
    setView, 
    performSwitchSection,
    performSignOut
  );

  useEffect(() => {
    setView(protectedView);
  }, [protectedView]);

  useEffect(() => {
    if (noRoleError) {
      setActiveSection(null);
      setUserRoleInfo(null);
      localStorage.removeItem('activeSection');
    }
  }, [noRoleError, setActiveSection, setUserRoleInfo]);

  const renderMainContent = () => {
    if (!activeSection) return null; 

    switch (view.page) {
      case 'home':
        return <HomePage boys={boys} setView={navigateWithProtection} refreshData={refreshData} activeSection={activeSection!} showToast={showToast} encryptionKey={encryptionKey} />;
      case 'weeklyMarks':
        return <WeeklyMarksPage boys={boys} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection!} settings={settings} showToast={showToast} encryptionKey={encryptionKey} />;
      case 'dashboard':
        return <DashboardPage boys={boys} activeSection={activeSection!} />;
      case 'auditLog':
        return <AuditLogPage refreshData={refreshData} activeSection={activeSection!} showToast={showToast} userRole={userRole} encryptionKey={encryptionKey} />;
      case 'settings': 
        return <SettingsPage activeSection={activeSection!} currentSettings={settings} onSettingsSaved={setSettings} showToast={showToast} userRole={userRole} onNavigateToGlobalSettings={() => navigateWithProtection({ page: 'globalSettings' })} onNavigateToAccountSettings={() => navigateWithProtection({ page: 'accountSettings' })} encryptionKey={encryptionKey} />;
      case 'globalSettings': 
        return <GlobalSettingsPage activeSection={activeSection!} showToast={showToast} userRole={userRole} refreshData={refreshData} currentUser={currentUser} encryptionKey={encryptionKey} />;
      case 'accountSettings': 
        return <AccountSettingsPage showToast={showToast} encryptionKey={encryptionKey} />;
      case 'boyMarks':
        const boyMarksView = view as BoyMarksPageView;
        return <BoyMarksPage boyId={boyMarksView.boyId} refreshData={refreshData} setHasUnsavedChanges={setHasUnsavedChanges} activeSection={activeSection!} showToast={showToast} encryptionKey={encryptionKey} />;
      case 'signup':
        return null;
      default:
        return <HomePage boys={boys} setView={navigateWithProtection} refreshData={refreshData} activeSection={activeSection!} showToast={showToast} encryptionKey={encryptionKey} />;
    }
  };
  
  const renderApp = () => {
    // Check if we are loading auth, or if we have a user but are still loading their role or app data.
    if (authLoading || roleLoading || (currentUser && dataLoading && view.page !== 'signup' && userRole !== 'pending')) {
        return <HomePageSkeleton />;
    }

    if (isPasswordRecovery) {
        return <PasswordResetPage showToast={showToast} encryptionKey={encryptionKey} />;
    }

    if (noRoleError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
                    <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                    <p className="text-slate-700">{noRoleError}</p>
                    <button
                        onClick={() => setCurrentUser(null)} 
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
            return <SignupPage onNavigateToHelp={() => setIsHelpModalOpen(true)} showToast={showToast} onSignupSuccess={handleSelectSection} onNavigateBack={() => navigateWithProtection({ page: 'home' })} />;
        }
        return <LoginPage onOpenHelpModal={() => setIsHelpModalOpen(true)} showToast={showToast} onNavigateToSignup={navigateWithProtection} encryptionKey={encryptionKey} />;
    }

    // Handle Pending Approval State
    if (userRole === 'pending') {
        return <PendingApprovalPage />;
    }
    
    if (!activeSection) {
        switch (view.page) {
            case 'globalSettings':
                return (
                    <>
                        <Header setView={navigateWithProtection} user={currentUser} onSignOut={handleSignOutWithProtection} activeSection={'company'} onSwitchSection={handleSwitchSectionWithProtection} userRole={userRole} onOpenHelpModal={() => setIsHelpModalOpen(true)} />
                        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <GlobalSettingsPage activeSection={'company'} showToast={showToast} userRole={userRole} refreshData={refreshData} currentUser={currentUser} encryptionKey={encryptionKey} />
                        </main>
                    </>
                );
            case 'accountSettings':
                return (
                    <>
                        <Header setView={navigateWithProtection} user={currentUser} onSignOut={handleSignOutWithProtection} activeSection={'company'} onSwitchSection={handleSwitchSectionWithProtection} userRole={userRole} onOpenHelpModal={() => setIsHelpModalOpen(true)} />
                        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <AccountSettingsPage showToast={showToast} encryptionKey={encryptionKey} />
                        </main>
                    </>
                );
            default:
                return <SectionSelectPage onSelectSection={handleSelectSection} onOpenHelpModal={() => setIsHelpModalOpen(true)} onNavigateToGlobalSettings={() => navigateWithProtection({ page: 'globalSettings' })} userRoleInfo={userRoleInfo} onSignOut={handleSignOutWithProtection} showToast={showToast} />;
        }
    }
    
    if (dataError) {
        return <div className="text-center p-8 text-red-500">{dataError}</div>;
    }

    return (
        <>
            <Header setView={navigateWithProtection} user={currentUser} onSignOut={handleSignOutWithProtection} activeSection={activeSection} onSwitchSection={handleSwitchSectionWithProtection} userRole={userRole} onOpenHelpModal={() => setIsHelpModalOpen(true)} />
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
      
      <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} title="User Guide" size="full">
        <HelpPage />
      </Modal>

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