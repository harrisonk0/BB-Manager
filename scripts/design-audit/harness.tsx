// Dedicated component inspection surface; does not mount App or alter authentication.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import Header from '../../components/Header';
import HomePage from '../../components/HomePage';
import WeeklyMarksPage from '../../components/WeeklyMarksPage';
import DashboardPage from '../../components/DashboardPage';
import BoyMarksPage from '../../components/BoyMarksPage';
import SettingsPage from '../../components/SettingsPage';
import ArchivesPage from '../../components/ArchivesPage';
import AccountSettingsPage from '../../components/AccountSettingsPage';
import CompanyCalendarPage from '../../components/CompanyCalendarPage';
import PortalAccessPage from '../../components/PortalAccessPage';
import PortalHomePage from '../../components/PortalHomePage';
import PortalSetupPage from '../../components/PortalSetupPage';
import PasskeyEnrollmentGate from '../../components/PasskeyEnrollmentGate';
import SectionSelectPage from '../../components/SectionSelectPage';
import LoginPage from '../../components/LoginPage';
import { HomePageSkeleton, BoyMarksPageSkeleton } from '../../components/SkeletonLoaders';
import { boys, settings } from './fixtures';
import type { Section, View } from '../../types';

const noop = () => {};

function Harness() {
  const params = new URLSearchParams(location.search);
  const section: Section = params.get('section') === 'junior' ? 'junior' : 'company';
  // Extra case names are workbench-only; normal navigation still uses the app View type.
  const [view, setView] = useState<{ page: string }>({ page: params.get('page') || 'home' });
  const navigate = (next: View) => setView(next);
  const common = {
    boys: params.get('state') === 'empty' ? [] : boys.map(boy => ({
      ...boy,
      year: section === 'junior' ? 'P5' as const : boy.year,
      marks: section === 'junior' ? boy.marks : boy.marks.map(({ date, score }) => ({ date, score })),
    })),
    settings,
    activeSection: section,
    refreshData: async () => {},
    showToast: noop,
  };
  const pages: Record<string, React.ReactNode> = {
    home: <HomePage {...common} setView={navigate} />,
    weeklyMarks: <WeeklyMarksPage {...common} setHasUnsavedChanges={noop} />,
    dashboard: <DashboardPage {...common} />,
    boyMarks: <BoyMarksPage {...common} boyId="fixture-0" setHasUnsavedChanges={noop} onBack={() => setView({ page: 'home' })} />,
    settings: <SettingsPage {...common} currentSettings={settings} onSettingsSaved={noop} userRole="captain"
      onNavigateToAccountSettings={() => setView({ page: 'accountSettings' })}
      onNavigateToArchives={() => setView({ page: 'archives' })} />,
    archives: <ArchivesPage {...common} liveBoys={common.boys} />,
    accountSettings: <AccountSettingsPage {...common} />,
    companyCalendar: <CompanyCalendarPage {...common} />,
    portalAccess: <PortalAccessPage {...common} />,
    login: <LoginPage />,
    sections: <SectionSelectPage onSelectSection={noop} onSignOut={noop} />,
    portal: <PortalHomePage onSignOut={noop} showToast={noop} />,
    setup: <PortalSetupPage setup={{ username: 'alex.example', code: 'synthetic-unused' }} onComplete={noop} />,
    passkey: <PasskeyEnrollmentGate onComplete={noop} onSignOut={noop} />,
    skeleton: <HomePageSkeleton />,
    boySkeleton: <BoyMarksPageSkeleton />,
  };
  if (['login', 'sections', 'portal', 'setup', 'passkey', 'skeleton', 'boySkeleton'].includes(view.page)) {
    return pages[view.page];
  }
  return (
    <div className="min-h-screen bg-slate-200 text-slate-800">
      <Header setView={navigate} onSignOut={noop} activeSection={section} onSwitchSection={noop}
        currentUser={{ id: 'fixture-user', email: 'staff@example.invalid' }} userRole="captain"
        currentPage={view.page as View['page']} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{pages[view.page]}</main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
