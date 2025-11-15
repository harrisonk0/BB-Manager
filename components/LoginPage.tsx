/**
 * @file LoginPage.tsx
 * @description The component responsible for handling user authentication.
 * It provides a simple form for email and password sign-in.
 */

import React, { useState } from 'react';
// FIX: Use named imports for Firebase v9 compatibility.
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getAuthInstance } from '../services/firebase';
import { QuestionMarkCircleIcon } from './Icons';
import { ToastType } from '../types'; // Import ToastType

interface LoginPageProps {
  /** Callback to navigate to the help page. */
  onNavigateToHelp: () => void;
  /** Function to display a toast notification. */
  showToast: (message: string, type?: ToastType) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToHelp, showToast }) => {
  // State for form inputs, error messages, and loading status.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  /**
   * Handles the sign-in form submission.
   * It calls the Firebase authentication service and provides user-friendly error messages
   * for common authentication failures.
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const auth = getAuthInstance();
      // FIX: Use signInWithEmailAndPassword function from named import.
      await signInWithEmailAndPassword(auth, email, password);
      // After successful sign-in, the onAuthStateChanged listener in App.tsx
      // will detect the change and update the application state accordingly.
    } catch (err: any) {
      // Handle specific Firebase auth errors with user-friendly messages.
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
          break;
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the "Forgot Password" request.
   * Sends a password reset email to the provided email address.
   */
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    setIsSendingResetEmail(true);
    setError(null);
    try {
      const auth = getAuthInstance();
      await sendPasswordResetEmail(auth, email);
      showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (err: any) {
      console.error("Forgot password error:", err);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-email':
          showToast('No user found with that email address.', 'error');
          break;
        default:
          showToast('Failed to send password reset email. Please try again.', 'error');
          break;
      }
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-200">
      <div className="relative w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
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
            Sign in to your account
          </h2>
        </div>

        {/* Display error message if login fails */}
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

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSendingResetEmail}
                className="font-medium text-junior-blue hover:text-junior-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingResetEmail ? 'Sending...' : 'Forgot your password?'}
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