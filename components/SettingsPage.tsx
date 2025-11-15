/**
 * @file SettingsPage.tsx
 * @description This page provides a user interface for changing application settings,
 * such as the default meeting day. Changes made here are saved to Firestore and
 * recorded in the audit log. It also allows logged-in users to change their password.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Section, SectionSettings, ToastType, InviteCode, UserRole } from '../types'; // Import UserRole
import { saveSettings } from '../services/settings';
import { createAuditLog, createInviteCode, fetchAllInviteCodes } from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'; // Import necessary Firebase Auth functions
import { ClipboardIcon } from './Icons'; // Import ClipboardIcon

interface SettingsPageProps {
  activeSection: Section;
  currentSettings: SectionSettings | null;
  /** Callback to update the settings state in the parent App component. */
  onSettingsSaved: (newSettings: SectionSettings) => void;
  showToast: (message: string, type?: ToastType) => void;
  /** The role of the currently logged-in user. */
  userRole: UserRole | null;
}

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const SettingsPage: React.FC<SettingsPageProps> = ({ activeSection, currentSettings, onSettingsSaved, showToast, userRole }) => {
  // Local state for the form inputs.
  const [meetingDay, setMeetingDay] = useState<number>(5); // Default to Friday
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for password change functionality
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordErrorState] = useState<string | null>(null);

  // State for invite code generation
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingInviteCodes, setLoadingInviteCodes] = useState(true);

  // Permission checks
  const canEditSettings = userRole && ['admin', 'captain'].includes(userRole);
  const canManageInviteCodes = userRole && ['admin', 'captain'].includes(userRole);

  /**
   * EFFECT: Populates the local state with the current settings when they are loaded.
   */
  useEffect(() => {
    if (currentSettings) {
      setMeetingDay(currentSettings.meetingDay);
    }
  }, [currentSettings]);

  /**
   * Fetches all invite codes for display.
   * @param showSpinner If true, sets the loading state to true before fetching. Defaults to true.
   */
  const loadInviteCodes = useCallback(async (showSpinner: boolean = true) => {
    if (!canManageInviteCodes) {
        setInviteCodes([]); // Clear codes if user doesn't have permission
        setLoadingInviteCodes(false);
        return;
    }
    if (showSpinner) {
      setLoadingInviteCodes(true);
    }
    try {
      const codes = await fetchAllInviteCodes(userRole); // Pass userRole
      setInviteCodes(codes);
    } catch (err) {
      console.error("Failed to load invite codes:", err);
      showToast("Failed to load invite codes.", "error");
    } finally {
      if (showSpinner) {
        setLoadingInviteCodes(false);
      }
    }
  }, [showToast, canManageInviteCodes, userRole]); // Add userRole to dependencies

  // Initial load of invite codes on component mount or when userRole changes
  useEffect(() => {
    loadInviteCodes();
  }, [loadInviteCodes, userRole]); // Add userRole to dependencies

  /**
   * EFFECT: Listens for the custom 'inviteCodesRefreshed' event.
   * This is triggered by the background sync in services/db.ts.
   */
  useEffect(() => {
    const handleInviteCodesRefresh = () => {
      console.log('Invite codes cache updated in background, refreshing UI...');
      // Call loadInviteCodes without showing the spinner, as data is updating in background
      loadInviteCodes(false); 
    };

    window.addEventListener('inviteCodesRefreshed', handleInviteCodesRefresh);
    return () => {
      window.removeEventListener('inviteCodesRefreshed', handleInviteCodesRefresh);
    };
  }, [loadInviteCodes]);

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

      // Create an audit log entry describing the change.
      await createAuditLog({
        userEmail,
        actionType: 'UPDATE_SETTINGS',
        description: `Updated meeting day from ${oldDay} to ${newDay}.`,
        revertData: { settings: currentSettings }, // Save old settings for potential revert.
      }, activeSection);

      await saveSettings(activeSection, newSettings, userRole); // Pass userRole
      onSettingsSaved(newSettings); // Update the parent component's state.
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      showToast(`Failed to save settings: ${err.message}`, 'error');
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
    setPasswordErrorState(null);

    if (!newPassword || !newPasswordConfirm || !oldPassword) {
      setPasswordErrorState('All password fields are required.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordErrorState('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorState('New password must be at least 6 characters long.');
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
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      showToast('Password changed successfully!', 'success');
      // Clear password fields on success
      setOldPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err: any) {
      console.error("Failed to change password:", err);
      // Provide user-friendly error messages for common Firebase Auth errors
      switch (err.code) {
        case 'auth/wrong-password':
          setPasswordErrorState('Your current password is incorrect.');
          break;
        case 'auth/weak-password':
          setPasswordErrorState('The new password is too weak. Please choose a stronger one.');
          break;
        case 'auth/requires-recent-login':
          setPasswordErrorState('Please log out and log back in to change your password.');
          break;
        case 'auth/network-request-failed':
          setPasswordErrorState('Network error. Please check your internet connection.');
          break;
        default:
          setPasswordErrorState('Failed to change password. Please try again.');
          break;
      }
      showToast('Failed to change password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  /**
   * Handles the generation of a new invite code.
   */
  const handleGenerateCode = async () => {
    if (!canManageInviteCodes) {
        showToast('Permission denied: You do not have permission to generate invite codes.', 'error');
        return;
    }
    setIsGeneratingCode(true);
    setGeneratedCode(null);
    try {
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      // The actual code generation logic is in db.ts, which also performs the role check.

      const newInviteCode: Omit<InviteCode, 'generatedAt'> = {
        id: '', // ID will be generated in db.ts
        generatedBy: userEmail,
        isUsed: false,
        section: activeSection, // Associate code with the current active section
      };

      const createdCode = await createInviteCode(newInviteCode, activeSection, userRole); // Pass userRole
      await createAuditLog({
        userEmail,
        actionType: 'GENERATE_INVITE_CODE',
        description: `Generated new invite code: ${createdCode.id}`,
        revertData: { inviteCodeId: createdCode.id }, // Store ID for potential future deletion (though not implemented)
      }, activeSection);

      setGeneratedCode(createdCode.id);
      showToast('Invite code generated successfully!', 'success');
      loadInviteCodes(); // Refresh the list of codes, showing spinner for this explicit action
    } catch (err: any) {
      console.error("Failed to generate invite code:", err);
      showToast(`Failed to generate invite code: ${err.message}`, 'error');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  /**
   * Copies the generated invite code to the clipboard.
   */
  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      showToast('Invite code copied to clipboard!', 'info');
    }).catch(err => {
      console.error("Failed to copy code:", err);
      showToast('Failed to copy code.', 'error');
    });
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
                  disabled={!canEditSettings} // Disable if not admin/captain
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
                disabled={isSaving || !canEditSettings} // Disable if not admin/captain
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-28 ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Invite Code Generation Section */}
        {canManageInviteCodes && ( // Only render if admin/captain
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Invite New Users</h2>
            <p className="text-slate-600 mb-4">Generate a one-time-use code to invite new users to the app. Share this code with them so they can sign up.</p>
            
            <button
                onClick={handleGenerateCode}
                disabled={isGeneratingCode}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {isGeneratingCode ? 'Generating...' : 'Generate New Invite Code'}
            </button>

            {generatedCode && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-slate-800 text-sm break-all">{generatedCode}</span>
                <button
                    onClick={() => copyCodeToClipboard(generatedCode)}
                    className="p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                    aria-label="Copy invite code to clipboard"
                >
                    <ClipboardIcon className="h-5 w-5" />
                </button>
                </div>
            )}

            <h3 className="text-lg font-semibold text-slate-700 mt-8 mb-3">Existing Invite Codes</h3>
            {loadingInviteCodes ? (
                <p className="text-slate-500">Loading codes...</p>
            ) : inviteCodes.length === 0 ? (
                <p className="text-slate-500">No invite codes generated yet.</p>
            ) : (
                <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                {inviteCodes.map(code => (
                    <li key={code.id} className="p-3 flex items-center justify-between text-sm">
                    <div className="flex-1">
                        <span className={`font-mono text-slate-800 ${code.isUsed ? 'line-through text-slate-500' : ''}`}>{code.id}</span>
                        <p className="text-xs text-slate-500 mt-1">
                        Generated by {code.generatedBy} on {code.generatedAt && !isNaN(code.generatedAt) ? new Date(code.generatedAt).toLocaleDateString() : 'N/A'}
                        {code.isUsed && code.usedAt && !isNaN(code.usedAt) && ` (${code.revoked ? 'Revoked' : 'Used'} by ${code.usedBy || 'Unknown'} on ${new Date(code.usedAt).toLocaleDateString()})`}
                        </p>
                    </div>
                    {code.isUsed ? (
                        code.revoked ? (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">Revoked</span>
                        ) : (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">Used</span>
                        )
                    ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                    )}
                    </li>
                ))}
                </ul>
            )}
            </div>
        )}

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
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
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
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
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