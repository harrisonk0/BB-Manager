"use client";

import React, { useState } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { ToastType } from '../types';
import { createAuditLog } from '../services/db';

interface AccountSettingsPageProps {
  showToast: (message: string, type?: ToastType) => void;
  /** The encryption key derived from the user session. */
  encryptionKey: CryptoKey | null;
}

const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({ showToast, encryptionKey }) => {
  const [oldPassword, setOldPassword] = useState(''); // Note: Supabase updateUser doesn't strictly require this if logged in, but useful for extra verification logic if implemented manually.
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Granular error states
  const [oldPasswordError, setOldPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [newPasswordConfirmError, setNewPasswordConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear previous errors
    setOldPasswordError(null);
    setNewPasswordError(null);
    setNewPasswordConfirmError(null);
    setGeneralError(null);

    let isValid = true;
    
    if (!newPassword) {
      setNewPasswordError('New password is required.');
      isValid = false;
    } else if (newPassword.length < 6) {
      setNewPasswordError('New password must be at least 6 characters long.');
      isValid = false;
    }
    if (!newPasswordConfirm) {
      setNewPasswordConfirmError('Confirm new password is required.');
      isValid = false;
    } else if (newPassword !== newPasswordConfirm) {
      setNewPasswordConfirmError('New password and confirmation do not match.');
      isValid = false;
    }
    if (!encryptionKey) {
        setGeneralError('Authentication error: Encryption key missing.');
        isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsChangingPassword(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not found');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await createAuditLog({
          actionType: 'PASSWORD_CHANGE',
          description: `User ${user.email} changed their password.`,
          revertData: {},
      }, null, encryptionKey);

      showToast('Password changed successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err: any) {
      console.error("Failed to change password:", err);
      // Map Supabase errors
      if (err.message.includes('Password should be')) {
          setNewPasswordError(err.message);
      } else {
          setGeneralError(err.message || 'Failed to change password. Please try again.');
      }
      showToast('Failed to change password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  const isCompany = localStorage.getItem('activeSection') === 'company';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Account Settings</h1>
      
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Change Password Section */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <form onSubmit={handleChangePassword} className="space-y-6">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Change Password</h2>
            {generalError && <p className="text-red-500 text-sm">{generalError}</p>}
            
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm ${newPasswordError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
                required
                aria-invalid={newPasswordError ? "true" : "false"}
                aria-describedby={newPasswordError ? "new-password-error" : undefined}
              />
              {newPasswordError && <p id="new-password-error" className="text-red-500 text-xs mt-1">{newPasswordError}</p>}
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
                className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm ${newPasswordConfirmError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
                required
                aria-invalid={newPasswordConfirmError ? "true" : "false"}
                aria-describedby={newPasswordConfirmError ? "confirm-new-password-error" : undefined}
              />
              {newPasswordConfirmError && <p id="confirm-new-password-error" className="text-red-500 text-xs mt-1">{newPasswordConfirmError}</p>}
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

export default AccountSettingsPage;