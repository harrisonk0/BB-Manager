"use client";

import React, { useState } from 'react';
import { performLogin } from '../services/auth';
import { QuestionMarkCircleIcon } from './Icons';
import { ToastType, View } from '../types';

interface LoginPageProps {
  onOpenHelpModal: () => void;
  showToast: (message: string, type?: ToastType) => void;
  onNavigateToSignup: (view: View) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onOpenHelpModal, showToast, onNavigateToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Use our new service that checks Firebase if Supabase login fails
      const result = await performLogin(email, password);
      
      if (result.source === 'migration') {
        showToast('Account migrated successfully!', 'success');
      }
      // Login successful, App.tsx will detect state change
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
      // TODO: Implement Supabase password reset
      showToast('Please contact your Captain to reset password during migration.', 'info');
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-slate-200 bg-cover bg-center"
      style={{ backgroundImage: 'url(https://i.postimg.cc/MKD36t18/mixed-activities.jpg)' }}
    >
      <div className="relative w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <button 
            onClick={onOpenHelpModal}
            className="absolute top-4 right-4 text-slate-400 hover:text-junior-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue rounded-full"
            aria-label="Help"
        >
            <QuestionMarkCircleIcon className="h-7 w-7" />
        </button>

        <div className="text-center">
          <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
          <h2 className="text-xl text-slate-600">
            Sign in to your account
          </h2>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
            <strong>Login Failed:</strong> {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 bg-white rounded-t-md focus:outline-none focus:ring-junior-blue focus:border-junior-blue focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 bg-white rounded-b-md focus:outline-none focus:ring-junior-blue focus:border-junior-blue focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="font-medium text-junior-blue hover:text-junior-blue/80"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default LoginPage;