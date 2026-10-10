import React, { useEffect, useState } from 'react';
import type { Boy, ToastType } from '../types';
import type { PortalAccount, SetupLink } from '../types/portal';
import { listPortalAccounts, provisionPortalAccount } from '../services/portal';
import Modal from './Modal';
import { KeyIcon, UserCircleIcon } from './Icons';

export default function PortalAccessPage({
  boys,
  showToast,
}: {
  boys: Boy[];
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [links, setLinks] = useState<Record<string, SetupLink>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reset, setReset] = useState<Boy | null>(null);
  const refresh = async () => {
    setLoaded(false);
    const a = await listPortalAccounts();
    setAccounts(a);
    setLoaded(true);
  };
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, []);
  const generate = async (targets: Boy[]) => {
    setBusy(true);
    setError('');
    let count = 0;
    try {
      for (const boy of targets) {
        if (!boy.id) continue;
        const link = await provisionPortalAccount(boy.id);
        setLinks((prev) => ({ ...prev, [boy.id!]: link }));
        count++;
      }
      showToast(`${count} setup ${count === 1 ? 'link' : 'links'} generated.`);
    } catch (e) {
      setError(
        `Generated ${count} links. ${e instanceof Error ? e.message : 'Could not finish.'}`,
      );
    } finally {
      try {
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not refresh.');
      }
      setBusy(false);
      setReset(null);
    }
  };
  const missing = boys.filter(
    (b) => b.id && !accounts.some((a) => a.member_id === b.id),
  );
  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Setup link copied.');
    } catch {
      showToast(
        'Could not copy. Select the link and copy it manually.',
        'error',
      );
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="p-3 bg-blue-50 text-company-blue rounded-xl"
            >
              <KeyIcon className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-bold">Boys’ portal access</h1>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Give each Company boy his personal link. He creates a passkey and
            signs in from the normal login page.
          </p>
        </div>
        <button
          disabled={busy || !loaded || !missing.length}
          onClick={() => void generate(missing)}
          className="bg-company-blue text-white rounded-lg px-5 py-3 disabled:opacity-50"
        >
          {!loaded
            ? 'Loading access…'
            : busy
              ? 'Generating…'
              : `Generate for ${missing.length} boys without access`}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Copy new links before leaving this page. If a link is lost, generate a
        replacement. Resetting access removes existing passkeys and calendar
        subscriptions.
      </p>
      {error && (
        <p role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
          {!loaded && (
            <button
              disabled={busy}
              onClick={() =>
                void refresh()
                  .then(() => setError(''))
                  .catch((e) => setError(e.message))
              }
              className="underline ml-3"
            >
              Try again
            </button>
          )}
        </p>
      )}
      <div className="space-y-3">
        {boys.map((boy) => {
          const a = accounts.find((a) => a.member_id === boy.id);
          const link = links[boy.id!];
          return (
            <article
              key={boy.id}
              className="bg-white border rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <span aria-hidden="true">
                      <UserCircleIcon className="w-5 h-5 text-slate-400" />
                    </span>
                    {boy.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {!loaded
                      ? 'Loading…'
                      : a
                        ? `${a.username} · ${a.activated_at ? 'Active' : 'Awaiting passkey setup'}`
                        : 'Not generated'}
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  {link && (
                    <button
                      disabled={busy}
                      onClick={() => void copy(link.link)}
                      className="text-sm text-company-blue underline"
                    >
                      Copy setup link
                    </button>
                  )}
                  <button
                    disabled={busy || !loaded}
                    onClick={() => (a ? setReset(boy) : void generate([boy]))}
                    className="border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {a ? 'Reset access' : 'Generate link'}
                  </button>
                </div>
              </div>
              {link && (
                <input
                  aria-label={`Setup link for ${boy.name}`}
                  readOnly
                  value={link.link}
                  className="w-full border rounded-lg p-2 text-xs text-slate-600"
                />
              )}
            </article>
          );
        })}
      </div>
      {!boys.length && (
        <p className="text-slate-500">Add Company boys to the roster first.</p>
      )}
      <Modal
        isOpen={!!reset}
        onClose={() => {
          if (!busy) setReset(null);
        }}
        title="Reset portal access"
      >
        <div className="space-y-4">
          <p>
            Generate a fresh setup link for {reset?.name}? His existing passkeys
            and calendar subscription will stop working.
          </p>
          <div className="flex justify-end gap-3">
            <button
              disabled={busy}
              onClick={() => setReset(null)}
              className="px-4 py-2"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() => reset && void generate([reset])}
              className="bg-company-blue text-white rounded-lg px-4 py-2"
            >
              {busy ? 'Resetting…' : 'Reset and generate link'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
