import React, { useState } from 'react';
import { branding } from './branding';
import { KeyIcon } from './Icons';
import { browserSupportsPasskeys } from '../services/passkeyErrors';
import { registerPasskey, retireRememberedPasswordAfterPasskey } from '../services/supabaseAuth';

interface PasskeyEnrollmentGateProps {
  onComplete: () => void;
  onSignOut: () => void;
}

const PasskeyEnrollmentGate: React.FC<PasskeyEnrollmentGateProps> = ({ onComplete, onSignOut }) => {
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRetiring, setIsRetiring] = useState(false);
  const [passkeySaved, setPasskeySaved] = useState(false);
  const supported = browserSupportsPasskeys();

  const retirePassword = async (): Promise<boolean> => {
    setIsRetiring(true);
    try {
      const result = await retireRememberedPasswordAfterPasskey();
      if (!result.retired) {
        setError(
          result.error
            ? `Your passkey was saved, but the old password could not be turned off: ${result.error}`
            : 'Your passkey was saved, but the old password could not be turned off. Try again.',
        );
        return false;
      }
      return true;
    } finally {
      setIsRetiring(false);
    }
  };

  const handleCreatePasskey = async () => {
    setError(null);
    setIsRegistering(true);
    try {
      const { error: registerError } = await registerPasskey();
      if (registerError) {
        setError(registerError.message);
        return;
      }
      setPasskeySaved(true);
      if (await retirePassword()) {
        onComplete();
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRetryPasswordOff = async () => {
    setError(null);
    if (await retirePassword()) {
      onComplete();
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-slate-200 bg-cover bg-center"
      style={{ backgroundImage: `url(${branding.bbBackground})` }}
    >
      <div className="relative w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img src={branding.bbLogo} alt="The Boys' Brigade Logo" className="w-48 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800">Create your passkey</h2>
        </div>
        <p className="text-sm text-slate-600">
          This is a one-time step. After you create a passkey, this account can no longer sign in with the old password.
          Use this device&apos;s fingerprint, face, PIN, or password manager.
        </p>
        {!supported && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            This browser cannot create passkeys. Open BB Manager in current Chrome, Safari, or Edge on
            {' '}<code className="text-xs">bb-manager.vercel.app</code>, then sign in with your password once.
          </p>
        )}
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        {passkeySaved ? (
          <button
            type="button"
            onClick={() => { void handleRetryPasswordOff(); }}
            disabled={isRetiring}
            className="group relative w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetiring ? 'Turning off password sign-in…' : 'Turn off password sign-in'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { void handleCreatePasskey(); }}
            disabled={!supported || isRegistering || isRetiring}
            className="group relative w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-junior-blue hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-junior-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <KeyIcon className="h-5 w-5 mr-2" />
            {isRegistering ? 'Waiting for passkey…' : isRetiring ? 'Turning off password sign-in…' : 'Create passkey'}
          </button>
        )}
        <button
          type="button"
          onClick={onSignOut}
          disabled={isRegistering || isRetiring}
          className="w-full py-2 px-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default PasskeyEnrollmentGate;
