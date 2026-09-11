import React, { useState, useEffect } from 'react';
import { Section, SectionSettings, ToastType, UserRole } from '../types';
import { saveSettings } from '../services/settings';
import { startNewBbSession } from '../services/sessions';
import {
  getDefaultClosedSessionLabel,
  NEW_SESSION_CONFIRMATION_PHRASE,
} from '../services/sessionArchiveModel';
import Modal from './Modal';

interface SettingsPageProps {
  activeSection: Section;
  currentSettings: SectionSettings | null;
  /** Callback to update the settings state in the parent App component. */
  onSettingsSaved: (newSettings: SectionSettings) => void;
  showToast: (message: string, type?: ToastType) => void;
  /** The role of the currently logged-in user. */
  userRole: UserRole | null;
  /** Callback to navigate to the account settings page. */
  onNavigateToAccountSettings: () => void;
  /** Reload the live roster after a session is archived. */
  refreshData: () => Promise<void>;
  /** Open the Past Sessions page after a successful archive. */
  onNavigateToArchives: () => void;
}

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const SettingsPage: React.FC<SettingsPageProps> = ({
  activeSection,
  currentSettings,
  onSettingsSaved,
  showToast,
  userRole,
  onNavigateToAccountSettings,
  refreshData,
  onNavigateToArchives,
}) => {
  const [meetingDay, setMeetingDay] = useState<number>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState(getDefaultClosedSessionLabel);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [pdfAcknowledged, setPdfAcknowledged] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const canEditSettings = userRole && ['admin', 'captain'].includes(userRole);
  useEffect(() => {
    if (currentSettings) {
      setMeetingDay(currentSettings.meetingDay);
    }
  }, [currentSettings]);

  const handleSaveSettings = async () => {
    if (!currentSettings || currentSettings.meetingDay === meetingDay) {
        showToast('No changes to save.', 'info');
        return;
    }
    if (!canEditSettings) {
        showToast('Permission denied: You do not have permission to save settings.', 'error');
        return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const newSettings: SectionSettings = { meetingDay };
      await saveSettings(activeSection, newSettings, userRole);
      onSettingsSaved(newSettings);
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      showToast(`Failed to save settings: ${err.message}`, 'error');
      setError("An error occurred while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeConfirmModal = () => {
    if (isStartingSession) return;
    setIsConfirmOpen(false);
    setConfirmationText('');
    setPdfAcknowledged(false);
  };

  const handleStartNewSession = async () => {
    if (!canEditSettings) {
      showToast('Permission denied: only captains and admins can start a new BB session.', 'error');
      return;
    }

    const trimmedLabel = sessionLabel.trim();
    if (!trimmedLabel) {
      showToast('Enter a label for the session you are closing.', 'error');
      return;
    }

    if (confirmationText.trim() !== NEW_SESSION_CONFIRMATION_PHRASE || !pdfAcknowledged) {
      return;
    }

    setIsStartingSession(true);
    try {
      const result = await startNewBbSession(trimmedLabel);
      await refreshData();
      setIsConfirmOpen(false);
      setConfirmationText('');
      setPdfAcknowledged(false);
      setSessionLabel(getDefaultClosedSessionLabel());
      showToast(
        `Archived ${result.label}: ${result.memberCount} members and ${result.markCount} marks. The live roster is now empty.`,
        'success',
      );
      onNavigateToArchives();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start a new BB session.';
      showToast(message, 'error');
    } finally {
      setIsStartingSession(false);
    }
  };
  
  const isCompany = activeSection === 'company';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';
  const canConfirmStart =
    confirmationText.trim() === NEW_SESSION_CONFIRMATION_PHRASE && pdfAcknowledged && !isStartingSession;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Section Settings</h1>
      
      <div className="max-w-2xl mx-auto space-y-6">
        {/* General Settings Section */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>General Settings</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <label htmlFor="meeting-day" className="block text-md font-medium text-slate-700 mb-2 sm:mb-0">
                  Weekly Meeting Day
                </label>
                <select
                  id="meeting-day"
                  value={meetingDay}
                  onChange={(e) => setMeetingDay(parseInt(e.target.value, 10))}
                  className={`w-full sm:w-auto mt-1 sm:mt-0 block px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
                  disabled={!canEditSettings}
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Set the default day for the Weekly Marks page.
              </p>
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving || !canEditSettings}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-28 ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {canEditSettings && (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Start a new BB session</h2>
            <p className="text-slate-600">
              Archive the current Company and Junior members and marks, then open empty live rosters for the next year.
              Meeting days, staff accounts, and already-archived sessions stay as they are.
            </p>
            <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Download Master PDFs from Dashboard for both sections first if you still need a live copy. After this runs, that data is only available from Past Sessions.
            </p>
            <div className="mt-6">
              <label htmlFor="session-label" className="block text-sm font-medium text-slate-700">
                Label for the session you are closing
              </label>
              <input
                id="session-label"
                type="text"
                maxLength={80}
                value={sessionLabel}
                onChange={(event) => setSessionLabel(event.target.value)}
                className={`mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
              />
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                disabled={!sessionLabel.trim()}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start new session
              </button>
            </div>
          </div>
        )}

        {/* Account Settings Link */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Your Account</h2>
            <p className="text-slate-600 mb-4">Manage your personal account settings, such as changing your password.</p>
            <div className="flex justify-end">
              <button
                onClick={onNavigateToAccountSettings}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'}`}
              >
                Go to Account Settings
              </button>
            </div>
          </div>
      </div>

      <Modal isOpen={isConfirmOpen} onClose={closeConfirmModal} title="Start a new BB session?" size="lg">
        <div className="space-y-4">
          <p className="text-slate-700">
            This archives <strong>{sessionLabel.trim() || 'the current session'}</strong> for both Company and Junior, then deletes the live working copies so you can add the next year&apos;s boys and marks.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
            <li>Every live member and mark in both sections is copied into Past Sessions.</li>
            <li>Home, Weekly Marks, and Dashboard for both sections become empty.</li>
            <li>This cannot be undone from the app. Only captains and admins can run it.</li>
          </ul>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={pdfAcknowledged}
              onChange={(event) => setPdfAcknowledged(event.target.checked)}
            />
            <span>I have downloaded Master PDFs from Dashboard if I still need a live copy, or I am happy to use Past Sessions instead.</span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Type {NEW_SESSION_CONFIRMATION_PHRASE} to confirm
            </span>
            <input
              type="text"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeConfirmModal}
              disabled={isStartingSession}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { void handleStartNewSession(); }}
              disabled={!canConfirmStart}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingSession ? 'Archiving...' : 'Archive and start fresh'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
