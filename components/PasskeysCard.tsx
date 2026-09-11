import React, { useCallback, useEffect, useState } from 'react';
import { Section, ToastType } from '../types';
import * as supabaseAuth from '../services/supabaseAuth';
import type { AppPasskey } from '../services/supabaseAuth';
import { browserSupportsPasskeys } from '../services/passkeyErrors';
import Modal from './Modal';

interface PasskeysCardProps {
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
}

const formatPasskeyDate = (value?: string) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const PasskeysCard: React.FC<PasskeysCardProps> = ({ activeSection, showToast }) => {
  const [passkeys, setPasskeys] = useState<AppPasskey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [passkeyToDelete, setPasskeyToDelete] = useState<AppPasskey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supported = browserSupportsPasskeys();
  const isCompany = activeSection === 'company';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentRing = isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue';

  const refreshPasskeys = useCallback(async () => {
    setIsLoading(true);
    try {
      setPasskeys(await supabaseAuth.listPasskeys());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not load passkeys.';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshPasskeys();
  }, [refreshPasskeys]);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const { error } = await supabaseAuth.registerPasskey();
      if (error) {
        showToast(error.message, 'error');
        return;
      }
      showToast('Passkey added. You can sign in with it on bb-manager.vercel.app.', 'success');
      await refreshPasskeys();
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRename = async (passkey: AppPasskey) => {
    const nextName = renameValue.trim();
    if (!nextName) {
      showToast('Enter a name for this passkey.', 'error');
      return;
    }
    try {
      await supabaseAuth.renamePasskey(passkey.id, nextName);
      setRenamingId(null);
      setRenameValue('');
      showToast('Passkey renamed.', 'success');
      await refreshPasskeys();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Could not rename that passkey.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!passkeyToDelete) return;
    setIsDeleting(true);
    try {
      await supabaseAuth.deletePasskey(passkeyToDelete.id);
      setPasskeyToDelete(null);
      showToast('Passkey removed.', 'success');
      await refreshPasskeys();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Could not remove that passkey.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md space-y-4">
      <h2 className={`text-xl font-semibold border-b pb-2 ${accentText}`}>Passkeys</h2>
      <p className="text-sm text-slate-600">
        Passkeys sign you in with this device&apos;s fingerprint, face, PIN, or a password manager. They are bound to
        {' '}<code className="text-xs">bb-manager.vercel.app</code>, so add them while you are on the live site.
      </p>
      {!supported && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          This browser cannot create passkeys. Use a current Chrome, Safari, or Edge on the live site.
        </p>
      )}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading passkeys...</p>
      ) : passkeys.length === 0 ? (
        <p className="text-sm text-slate-500">No passkeys on this account yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="py-3">
              {renamingId === passkey.id ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    aria-label="Passkey name"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    maxLength={120}
                    className={`flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm ${accentRing}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { void handleRename(passkey); }}
                      className={`rounded-md px-3 py-2 text-sm font-medium text-white ${accentBg}`}
                    >
                      Save name
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRenamingId(null); setRenameValue(''); }}
                      className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{passkey.friendly_name || 'Unnamed passkey'}</p>
                    <p className="text-xs text-slate-500">
                      Added {formatPasskeyDate(passkey.created_at)} · Last used {formatPasskeyDate(passkey.last_used_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(passkey.id);
                        setRenameValue(passkey.friendly_name || '');
                      }}
                      className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasskeyToDelete(passkey)}
                      className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={() => { void handleRegister(); }}
          disabled={!supported || isRegistering}
          className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'}`}
        >
          {isRegistering ? 'Waiting for passkey…' : 'Add a passkey'}
        </button>
      </div>
      <Modal
        isOpen={Boolean(passkeyToDelete)}
        onClose={() => { if (!isDeleting) setPasskeyToDelete(null); }}
        title="Remove this passkey?"
      >
        <p className="text-slate-700">
          You will not be able to sign in with {passkeyToDelete?.friendly_name || 'this passkey'} until you add it again.
        </p>
        <div className="flex justify-end gap-3 pt-6">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setPasskeyToDelete(null)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => { void handleDelete(); }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md"
          >
            {isDeleting ? 'Removing...' : 'Remove passkey'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PasskeysCard;
