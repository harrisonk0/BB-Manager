import React, { useState } from 'react';
import * as supabaseAuth from '../services/supabaseAuth';
import { branding } from './branding';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { error: signInError } = await supabaseAuth.signIn(email, password);
      if (signInError) {
        setError(signInError.message || 'Invalid email or password.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Enter your email address first, then request a reset link.');
      return;
    }
    setIsResetting(true);
    try {
      const { error: resetError } = await supabaseAuth.requestPasswordReset(email.trim());
      if (resetError) {
        setError(resetError.message || 'Could not send a reset email.');
        return;
      }
      setInfo('If that email is registered, a reset link is on its way.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send a reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-slate-200 bg-cover bg-center"
      style={{ backgroundImage: `url(${branding.bbBackground})` }}
    >
      <div className="relative w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img src={branding.bbLogo} alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
          <h2 className="text-xl text-slate-600">
            Sign in to your account
          </h2>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
            <strong>Login Failed:</strong> {error}
          </div>
        )}
        {info && (
          <div className="p-4 text-sm text-slate-700 bg-slate-100 rounded-md">
            {info}
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { void handleForgotPassword(); }}
              disabled={isResetting}
              className="text-sm font-medium text-junior-blue hover:underline disabled:opacity-50"
            >
              {isResetting ? 'Sending reset link…' : 'Forgot password?'}
            </button>
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
