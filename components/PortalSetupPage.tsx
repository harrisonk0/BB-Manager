import React, { useState } from 'react';
import { branding } from './branding';
import { supabase } from '../services/supabaseClient';
import { listPasskeys, registerPasskey } from '../services/supabaseAuth';
import { browserSupportsPasskeys } from '../services/passkeyErrors';
import { portalRequest } from '../services/portal';

export default function PortalSetupPage({
  setup,
  onComplete,
}: {
  setup: { username: string; code: string };
  onComplete: () => void;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = async () => {
    setBusy(true);
    setError('');
    try {
      if (!signedIn) {
        const signedOut = await supabase.auth.signOut();
        if (signedOut.error) throw signedOut.error;
        const { tokenHash } = await portalRequest<{ tokenHash: string }>(
          'exchange',
          setup,
        );
        const verified = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });
        if (verified.error) throw verified.error;
        setSignedIn(true);
      }
      if (!(await listPasskeys()).length) {
        const r = await registerPasskey();
        if (r.error) throw r.error;
      }
      await portalRequest('complete');
      onComplete();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not create your passkey. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-5 text-center">
        <img
          src={branding.bbLogo}
          alt="The Boys’ Brigade"
          className="w-32 mx-auto"
        />
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Company Section
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {setup.username}
        </h1>
        <p className="text-sm text-slate-600">
          Create a passkey to open your calendar and see your progress.
        </p>
        {error && (
          <p
            role="alert"
            className="text-sm text-red-700 bg-red-50 rounded-lg p-3"
          >
            {error}
          </p>
        )}
        {!browserSupportsPasskeys() && (
          <p className="text-sm text-amber-800">
            Open this link in a browser that supports passkeys, such as current
            Safari, Chrome or Edge.
          </p>
        )}
        <button
          disabled={busy || !browserSupportsPasskeys()}
          onClick={() => void create()}
          className="w-full rounded-lg bg-company-blue text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Setting up…' : 'Create my passkey'}
        </button>
        <p className="text-xs text-slate-500">
          This link stops working once your passkey is set up.
        </p>
      </div>
    </div>
  );
}
