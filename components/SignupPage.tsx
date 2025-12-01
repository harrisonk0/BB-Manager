"use client";

import React, { useState } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { QuestionMarkCircleIcon } from './Icons';
import { ToastType, Section } from '../types';

interface SignupPageProps {
  /** Callback to navigate to the help page. */
  onNavigateToHelp: () => void;
  /** Function to display a toast notification. */
  showToast: (message: string, type?: ToastType) => void;
  /** Callback to navigate back to the login page. */
  onNavigateBack: () => void;
  /** Not used in new flow but kept for prop compatibility if needed */
  onSignupSuccess: (section: Section) => void; 
}

// Simple regex for basic email format validation (must contain @ and a dot)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignupPage: React.FC<SignupPageProps> = ({ onNavigateToHelp, showToast, onNavigateBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Granular error states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    let isValid = true;

    if (!email) {
      setEmailError('Email is required.');
      isValid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }
    
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      isValid = false;
    }
    if (!confirmPassword) {
      setConfirmPasswordError('Confirm password is required.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create User in Supabase Auth
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // The database trigger 'handle_new_user' will automatically 
      // create the 'pending' role in user_roles table.

      showToast('Account created! Please wait for approval.', 'success');
      // No navigation needed, auth state change in App.tsx will redirect to Pending Page
    } catch (err: any) {
      console.error("Sign up error:", err);
      if (err.message.includes('User already registered')) {
          setEmailError('The email address is already in use by another account.');
      } else if (err.message.includes('Password should be')) {
          setPasswordError(err.message);
      } else {
          setError(err.message || 'Failed to create account. Please try again.');
      }
      showToast('Failed to create account.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-slate-200 bg-cover bg-center"
      style={{ backgroundImage: 'url(https://i.postimg.cc/MKD36t18/mixed-activities.jpg)' }}
    >
      <div className="relative w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <button 
            onClick={onNavigateBack} 
            className="absolute top-4 left-4 text-slate-400 hover:text-junior-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue rounded-full p-2"
            aria-label="Back to Login"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
        </button>
        <button 
            onClick={onNavigateToHelp} 
            className="absolute top-4 right-4 text-slate-400 hover:text-junior-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue rounded-full"
            aria-label="Help"
        >
            <QuestionMarkCircleIcon className="h-7 w-7" />
        </button>

        <div className="text-center">
          <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
          <h2 className="text-xl text-slate-600">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-500">
              Your account will be reviewed by an administrator before you can access the system.
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
            <strong>Sign Up Failed:</strong> {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`relative block w-full px-3 py-2 border placeholder-slate-500 text-slate-900 bg-white rounded-t-md focus:outline-none focus:ring-junior-blue focus:border-junior-blue focus:z-10 sm:text-sm ${emailError ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailError ? "true" : "false"}
                aria-describedby={emailError ? "email-error" : undefined}
              />
              {emailError && <p id="email-error" className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>
            <div className="mt-px">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`relative block w-full px-3 py-2 border placeholder-slate-500 text-slate-900 bg-white focus:outline-none focus:ring-junior-blue focus:border-junior-blue focus:z-10 sm:text-sm ${passwordError ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={passwordError ? "true" : "false"}
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              {passwordError && <p id="password-error" className="text-red-500 text-xs mt-1">{passwordError}</p>}
            </div>
            <div className="mt-px">
              <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className={`relative block w-full px-3 py-2 border placeholder-slate-500 text-slate-900 bg-white rounded-b-md focus:outline-none focus:ring-junior-blue focus:border-junior-blue focus:z-10 sm:text-sm ${confirmPasswordError ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={confirmPasswordError ? "true" : "false"}
                aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
              />
              {confirmPasswordError && <p id="confirm-password-error" className="text-red-500 text-xs mt-1">{confirmPasswordError}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;