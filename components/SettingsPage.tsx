"use client";

import React, { useState, useEffect } from 'react';
import { Section, SectionSettings, ToastType, UserRole, Page } from '../types';
import { saveSettings } from '../services/settings';
import { createAuditLog } from '../services/db';
import { getAuthInstance } from '../services/firebase';

interface SettingsPageProps {
  activeSection: Section;
  currentSettings: SectionSettings | null;
  /** Callback to update the settings state in the parent App component. */
  onSettingsSaved: (newSettings: SectionSettings) => void;
  showToast: (message: string, type?: ToastType) => void;
  /** The role of the currently logged-in user. */
  userRole: UserRole | null;
  /** Callback to navigate to the global settings page. */
  onNavigateToGlobalSettings: () => void;
  /** Callback to navigate to the account settings page. */
  onNavigateToAccountSettings: () => void;
}

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const SettingsPage: React.FC<SettingsPageProps> = ({ activeSection, currentSettings, onSettingsSaved, showToast, userRole, onNavigateToGlobalSettings, onNavigateToAccountSettings }) => {
  const [meetingDay, setMeetingDay] = useState<number>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEditSettings = userRole && ['admin', 'captain'].includes(userRole);
  const canAccessGlobalSettings = userRole && ['admin', 'captain'].includes(userRole);

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
      
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      const oldDay = WEEKDAYS[currentSettings.meetingDay];
      const newDay = WEEKDAYS[meetingDay];

      await createAuditLog({
        userEmail,
        actionType: 'UPDATE_SETTINGS',
        description: `Updated meeting day from ${oldDay} to ${newDay}.`,
        revertData: { settings: currentSettings },
      }, activeSection);

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
  
  const isCompany = activeSection === 'company';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';

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

        {canAccessGlobalSettings && (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Global Application Settings</h2>
            <p className="text-slate-600 mb-4">Manage invite codes, user roles, and development controls that affect the entire application.</p>
            <div className="flex justify-end">
              <button
                onClick={onNavigateToGlobalSettings}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'}`}
              >
                Go to Global Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;