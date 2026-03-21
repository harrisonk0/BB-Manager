"use client";

import React, { useEffect, useState } from 'react';
import { ToastType } from '../types';
import * as supabaseAuth from '../services/supabaseAuth';

interface PasswordResetPageProps {
  onComplete: () => void;
  onSignOut: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ onComplete, onSignOut, showToast }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('reset-password');
      const cleanPath = `${url.pathname}${url.search}`;
      window.history.replaceState({}, document.title, cleanPath);
    };

    cleanUrl();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNewPasswordError(null);
    setConfirmPasswordError(null);
    setGeneralError(null);

    let isValid = true;

    if (!newPassword) {
      setNewPasswordError('New password is required.');
      isValid = false;
    } else if (newPassword.length < 6) {
      setNewPasswordError('New password must be at least 6 characters long.');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password.');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('New password and confirmation do not match.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabaseAuth.updatePassword(newPassword);

      if (error) {
        throw error;
      }

      showToast('Password updated successfully.', 'success');
      onComplete();
    } catch (err: any) {
      console.error('Failed to reset password:', err);
      setGeneralError(err?.message || 'Failed to reset password. Please try again.');
      showToast('Failed to reset password.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-slate-200 bg-cover bg-center p-4"
      style={{ backgroundImage: 'url(https://i.postimg.cc/MKD36t18/mixed-activities.jpg)' }}
    >
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <img
            src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png"
            alt="The Boys' Brigade Logo"
            className="mx-auto mb-4 w-48"
          />
          <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {generalError && (
            <div className="rounded-md bg-red-100 p-4 text-sm text-red-700">
              {generalError}
            </div>
          )}

          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-junior-blue focus:outline-none focus:ring-junior-blue sm:text-sm ${newPasswordError ? 'border-red-500' : 'border-slate-300'}`}
              aria-invalid={newPasswordError ? 'true' : 'false'}
              aria-describedby={newPasswordError ? 'reset-password-error' : undefined}
            />
            {newPasswordError && (
              <p id="reset-password-error" className="mt-1 text-xs text-red-500">
                {newPasswordError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="reset-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-junior-blue focus:outline-none focus:ring-junior-blue sm:text-sm ${confirmPasswordError ? 'border-red-500' : 'border-slate-300'}`}
              aria-invalid={confirmPasswordError ? 'true' : 'false'}
              aria-describedby={confirmPasswordError ? 'reset-password-confirm-error' : undefined}
            />
            {confirmPasswordError && (
              <p id="reset-password-confirm-error" className="mt-1 text-xs text-red-500">
                {confirmPasswordError}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onSignOut}
              className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-junior-blue px-4 py-2 text-sm font-medium text-white hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-junior-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetPage;
