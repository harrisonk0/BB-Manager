"use client";

import React, { useState } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { ToastType } from '../types';
import { createAuditLog } from '../services/db';

interface PasswordResetPageProps {
  showToast: (message: string, type?: ToastType) => void;
  /** The encryption key derived from the user session. */
  encryptionKey: CryptoKey | null;
}

const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ showToast, encryptionKey }) => {
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [newPasswordConfirmError, setNewPasswordConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setIsUpdating(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not found for password reset');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await createAuditLog({
          actionType: 'PASSWORD_RESET',
          description: `User ${user.email} successfully reset their password.`,
          revertData: {},
      }, null, encryptionKey);

      showToast('Password updated successfully! You can now log in.', 'success');
      // After a successful update, we sign the user out to force them to log in
      // with their new credentials, which is a good security practice.
      await supabase.auth.signOut();
      // The app's auth listener will then redirect to the login page.
    } catch (err: any) {
      console.error("Failed to update password:", err);
      if (err.message.includes('Password should be')) {
          setNewPasswordError(err.message);
      } else {
          setGeneralError(err.message || 'Failed to update password. Please try again.');
      }
      showToast('Failed to update password.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const accentRing = 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = 'bg-junior-blue';

  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-slate-200 bg-cover bg-center"
      style={{ backgroundImage: 'url(https://i.postimg.cc/MKD36t18/mixed-activities.jpg)' }}
    >
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
          <h2 className="text-xl text-slate-600">
            Reset Your Password
          </h2>
        </div>
        
        {generalError && <p className="text-red-500 text-sm text-center">{generalError}</p>}
        
        <form onSubmit={handlePasswordReset} className="space-y-6">
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
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-full ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isUpdating ? 'Updating...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetPage;