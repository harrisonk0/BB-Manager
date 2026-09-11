import React, { useState } from 'react';
import { Section, ToastType } from '../types';
import * as supabaseAuth from '../services/supabaseAuth';
import { isPasskeyEnrollmentRequired, rememberPasswordForPasskeyMigration } from '../services/passkeyMigration';
import PasskeysCard from './PasskeysCard';

const MIN_PASSWORD_LENGTH = 8;

interface AccountSettingsPageProps {
  showToast: (message: string, type?: ToastType) => void;
  activeSection: Section;
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({
  showToast,
  activeSection,
  recoveryMode = false,
  onRecoveryComplete,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [newPasswordConfirmError, setNewPasswordConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setNewPasswordConfirmError(null);
    setGeneralError(null);

    let isValid = true;

    if (!recoveryMode && !currentPassword) {
      setCurrentPasswordError('Current password is required.');
      isValid = false;
    }
    if (!newPassword) {
      setNewPasswordError('New password is required.');
      isValid = false;
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setNewPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      isValid = false;
    }
    if (!newPasswordConfirm) {
      setNewPasswordConfirmError('Confirm new password is required.');
      isValid = false;
    } else if (newPassword !== newPasswordConfirm) {
      setNewPasswordConfirmError('New password and confirmation do not match.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsChangingPassword(true);
    try {
      if (!recoveryMode) {
        const user = await supabaseAuth.getCurrentUser();
        const email = user?.email;
        if (!email) {
          throw new Error('Could not confirm the signed-in account. Sign in again and retry.');
        }
        const { error: reauthError } = await supabaseAuth.signIn(email, currentPassword);
        if (reauthError) {
          setCurrentPasswordError('Current password is incorrect.');
          showToast('Current password is incorrect.', 'error');
          return;
        }
      }

      const { error } = await supabaseAuth.updatePassword(
        newPassword,
        recoveryMode ? undefined : currentPassword,
      );

      if (error) {
        throw error;
      }

      if (recoveryMode && isPasskeyEnrollmentRequired()) {
        const user = await supabaseAuth.getCurrentUser();
        if (user?.email) {
          rememberPasswordForPasskeyMigration(user.email, newPassword);
        }
      }

      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      onRecoveryComplete?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password. Please try again.';
      console.error('Failed to change password:', err);
      setGeneralError(message);
      showToast('Failed to change password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isCompany = activeSection === 'company';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';

  const formCard = (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
      <form onSubmit={handleChangePassword} className="space-y-6">
        <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>
          {recoveryMode ? 'Set a new password' : 'Change Password'}
        </h2>
        {recoveryMode && (
          <p className="text-sm text-slate-600">
            {isPasskeyEnrollmentRequired()
              ? 'This password is temporary. After you save it, you must create a passkey. The password then stops working.'
              : 'Choose a new password for this account. You will continue into the app afterwards.'}
          </p>
        )}
        {generalError && <p className="text-red-500 text-sm">{generalError}</p>}
        {!recoveryMode && (
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-slate-700">
              Current Password
            </label>
            <input
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm ${currentPasswordError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
              required
              aria-invalid={currentPasswordError ? 'true' : 'false'}
              aria-describedby={currentPasswordError ? 'current-password-error' : undefined}
            />
            {currentPasswordError && <p id="current-password-error" className="text-red-500 text-xs mt-1">{currentPasswordError}</p>}
          </div>
        )}
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
            New Password
          </label>
          <input
            type="password"
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm ${newPasswordError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
            required
            minLength={MIN_PASSWORD_LENGTH}
            aria-invalid={newPasswordError ? 'true' : 'false'}
            aria-describedby={newPasswordError ? 'new-password-error' : undefined}
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
            autoComplete="new-password"
            className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm ${newPasswordConfirmError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
            required
            minLength={MIN_PASSWORD_LENGTH}
            aria-invalid={newPasswordConfirmError ? 'true' : 'false'}
            aria-describedby={newPasswordConfirmError ? 'confirm-new-password-error' : undefined}
          />
          {newPasswordConfirmError && <p id="confirm-new-password-error" className="text-red-500 text-xs mt-1">{newPasswordConfirmError}</p>}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={isChangingPassword}
            className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-40 ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isChangingPassword ? 'Saving...' : recoveryMode ? 'Save Password' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );

  if (recoveryMode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4">
        <div className="w-full max-w-lg space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 text-center">Reset Password</h1>
          {formCard}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Account Settings</h1>
      <div className="max-w-2xl mx-auto space-y-6">
        {!recoveryMode && <PasskeysCard activeSection={activeSection} showToast={showToast} />}
        {isPasskeyEnrollmentRequired() ? (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md space-y-2">
            <h2 className={`text-xl font-semibold border-b pb-2 ${accentText}`}>Password</h2>
            <p className="text-sm text-slate-600">
              On the live site, password sign-in is turned off after you create a passkey. If you lose every passkey,
              use Forgot password on the sign-in screen, then add a new passkey before you sign out.
            </p>
          </div>
        ) : (
          formCard
        )}
      </div>
    </div>
  );
};

export default AccountSettingsPage;
