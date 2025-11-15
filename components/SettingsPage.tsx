/**
 * @file SettingsPage.tsx
 * @description This page provides a user interface for changing application settings,
 * such as the default meeting day. Changes made here are saved to Firestore and
 * recorded in the audit log. It also allows logged-in users to change their password.
 */

import React, { useState, useEffect } from 'react';
import { Section, SectionSettings, ToastType } from '../types';
import { saveSettings } from '../services/settings';
import { createAuditLog } from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'; // Import necessary Firebase Auth functions

interface SettingsPageProps {
  activeSection: Section;
  currentSettings: SectionSettings | null;
  /** Callback to update the settings state in the parent App component. */
  onSettingsSaved: (newSettings: SectionSettings) => void;
  showToast: (message: string, type?: ToastType) => void;
}

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const SettingsPage: React.FC<SettingsPageProps> = ({ activeSection, currentSettings, onSettingsSaved, showToast }) => {
  // Local state for the form inputs.
  const [meetingDay, setMeetingDay] = useState<number>(5); // Default to Friday
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for password change functionality
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  /**
   * EFFECT: Populates the local state with the current settings when they are loaded.
   */
  useEffect(() => {
    if (currentSettings) {
      setMeetingDay(currentSettings.meetingDay);
    }
  }, [currentSettings]);

  /**
   * Handles the save button click for general settings.
   * It persists the new settings to the database and creates an audit log entry.
   */
  const handleSaveSettings = async () => {
    // Prevent saving if no changes have been made.
    if (!currentSettings || currentSettings.meetingDay === meetingDay) {
        showToast('No changes to save.', 'info');
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

      // Create an audit log entry describing the change.
      await createAuditLog({
        userEmail,
        actionType: 'UPDATE_SETTINGS',
        description: `Updated meeting day from ${oldDay} to ${newDay}.`,
        revertData: { settings: currentSettings }, // Save old settings for potential revert.
      }, activeSection);

      await saveSettings(activeSection, newSettings);
      onSettingsSaved(newSettings); // Update the parent component's state.
      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      console.error("Failed to save settings:", err);
      showToast('Failed to save settings.', 'error');
      setError("An error occurred while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles the password change submission.
   * Re-authenticates the user and then updates their password.
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || !confirmNewPassword || !currentPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const auth = getAuthInstance();
      const user = auth.currentUser;

      if (!user || !user.email) {
        throw new Error("No authenticated user found or user email is missing.");
      }

      // Re-authenticate user for sensitive operation
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      showToast('Password changed successfully!', 'success');
      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.error("Failed to change password:", err);
      // Provide user-friendly error messages for common Firebase Auth errors
      switch (err.code) {
        case 'auth/wrong-password':
          setPasswordError('Your current password is incorrect.');
          break;
        case 'auth/weak-password':
          setPasswordError('The new password is too weak. Please choose a stronger one.');
          break;
        case 'auth/requires-recent-login':
          setPasswordError('Please log out and log back in to change your password.');
          break;
        case 'auth/network-request-failed':
          setPasswordError('Network error. Please check your internet connection.');
          break;
        default:
          setPasswordError('Failed to change password. Please try again.');
          break;
      }
      showToast('Failed to change password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!currentSettings) {
    return <div className="text-center p-8">Loading settings...</div>;
  }
  
  // --- Dynamic styles based on active section ---
  const isCompany = activeSection === 'company';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
      
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
                disabled={isSaving}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-28 ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <form onSubmit={handleChangePassword} className="space-y-6">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Change Password</h2>
            {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
            
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-slate-700">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="block text-sm font-medium text-slate-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
                required
              />
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={isChangingPassword}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-40 ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;