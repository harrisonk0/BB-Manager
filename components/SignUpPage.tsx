import React, { useState, useEffect } from 'react';
import { createOfficerAccount } from '../services/firebase';
import { getInviteById } from '../services/db';

interface SignUpPageProps {
  inviteId: string;
  onNavigateToLogin: () => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ inviteId, onNavigateToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const validateInvite = async () => {
      try {
        await getInviteById(inviteId);
      } catch (err: any) {
        setValidationError(err.message);
      } finally {
        setIsValidating(false);
      }
    };
    validateInvite();
  }, [inviteId]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await createOfficerAccount(email, password, inviteId);
      // onAuthStateChanged in App.tsx will handle the redirect after login
    } catch (err: any) {
      if (err.message.includes('invitation')) {
        setError(err.message);
      } else {
         switch (err.code) {
            case 'auth/email-already-in-use':
                setError('An account with this email address already exists.');
                break;
            case 'auth/weak-password':
                setError('Password is too weak. It must be at least 6 characters long.');
                break;
            case 'auth/invalid-email':
                setError('Please enter a valid email address.');
                break;
            default:
                setError('An unexpected error occurred. Please try again.');
                break;
        }
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isValidating) {
      return <p className="text-center text-slate-600">Validating invitation link...</p>;
    }

    if (validationError) {
      return (
        <div className="text-center">
            <h2 className="text-xl text-slate-600 mb-4">Invalid Invitation</h2>
            <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
                <strong>Error:</strong> {validationError}
            </div>
            <p className="mt-4 text-sm text-slate-500">
                Please request a new link from an officer.
            </p>
        </div>
      );
    }

    return (
        <>
            <div className="text-center">
                <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
                <h2 className="text-xl text-slate-600">
                    Create Officer Account
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                    Welcome! Please create your account to continue.
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
                    autoComplete="new-password"
                    required
                    className="relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 bg-white rounded-b-md focus:outline-none focus:ring-junior-blue focus:border-junior-blue focus:z-10 sm:text-sm"
                    placeholder="Password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                </div>
            </div>

            <div>
                <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
            </div>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button 
                    onClick={onNavigateToLogin}
                    className="font-medium text-junior-blue hover:text-junior-blue/80 focus:outline-none focus:underline"
                >
                    Sign In
                </button>
            </p>
        </>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-200">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        {renderContent()}
      </div>
    </div>
  );
};

export default SignUpPage;