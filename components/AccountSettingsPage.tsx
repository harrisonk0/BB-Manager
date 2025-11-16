"use client";

import React, { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getAuthInstance } from '../services/firebase';
import { ToastType } from '../types';

interface AccountSettingsPageProps {
  showToast: (message: string, type?: ToastType) => void;
}

const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({ showToast }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordErrorState] = useState<string | null>(null);

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

      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      showToast('Password changed successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err: any) {
      console.error("Failed to change password:", err);
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
  
  const isCompany = localStorage.getItem('activeSection') === 'company'; // Assuming activeSection is in localStorage
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

export default AccountSettingsPage;