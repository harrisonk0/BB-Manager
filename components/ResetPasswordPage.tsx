"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import * as supabaseAuth from '../services/supabaseAuth';
import { ToastType } from '../types';

interface ResetPasswordPageProps {
  showToast: (message: string, type?: ToastType) => void;
  onNavigateHome: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ showToast, onNavigateHome }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionAvailable, setSessionAvailable] = useState(false);

  useEffect(() => {
    const prepareSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) {
          setSessionAvailable(false);
        } else {
          setSessionAvailable(true);
        }

        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        if (hashParams.has('access_token') || hashParams.get('type') === 'recovery') {
          const url = new URL(window.location.href);
          window.history.replaceState({}, document.title, `${url.origin}/reset-password`);
        }
      } catch (err) {
        console.error('Failed to verify recovery session', err);
        setSessionAvailable(false);
      } finally {
        setSessionChecked(true);
      }
    };

    prepareSession();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!sessionChecked || !sessionAvailable) {
      setError('Your recovery link is invalid or has expired. Please request a new reset email.');
      return;
    }

    if (newPassword.trim().length < 8) {
      setError('Please choose a password with at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabaseAuth.updatePassword(newPassword);
      if (updateError) {
        setError(updateError.message || 'Unable to reset your password right now.');
        return;
      }

      showToast('Password updated successfully. You can now continue to the app.', 'success');
      onNavigateHome();
    } catch (err: any) {
      console.error('Password reset failed', err);
      setError(err?.message || 'Unable to reset your password right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-slate-200 bg-cover bg-center"
      style={{ backgroundImage: 'url(https://i.postimg.cc/MKD36t18/mixed-activities.jpg)' }}
    >
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img
            src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png"
            alt="The Boys' Brigade Logo"
            className="w-48 mx-auto mb-4"
          />
          <h2 className="text-xl font-semibold text-slate-700">Reset your password</h2>
          <p className="text-sm text-slate-500 mt-1">
            Enter a new password to secure your account.
          </p>
        </div>

        {!sessionChecked ? (
          <div className="p-4 text-sm text-slate-700 bg-slate-100 rounded-md">Verifying your recovery link...</div>
        ) : !sessionAvailable ? (
          <div className="space-y-4">
            <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
              The recovery link is invalid or has expired. Please request a new password reset email and try again.
            </div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full py-2 px-4 text-sm font-medium text-white bg-junior-blue hover:brightness-90 rounded-md"
            >
              Return to sign in
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
                <strong>Reset failed:</strong> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                  New password
                </label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-junior-blue focus:border-junior-blue sm:text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-junior-blue focus:border-junior-blue sm:text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 px-4 text-sm font-medium text-white bg-junior-blue hover:brightness-90 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating password...' : 'Update password'}
              </button>
              <button
                type="button"
                onClick={onNavigateHome}
                className="w-full py-2 px-4 text-sm font-medium text-junior-blue bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Return to app
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
