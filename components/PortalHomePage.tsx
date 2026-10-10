import React, { useCallback, useEffect, useState } from 'react';
import type {
  CompanyEvent,
  PortalAccount,
  PortalSummary,
} from '../types/portal';
import {
  getPortalAccount,
  getPortalSummary,
  listCompanyEvents,
  portalRequest,
  notificationSupport,
  enablePortalNotifications,
  disablePortalNotifications,
  portalNotificationsEnabled,
} from '../services/portal';
import { registerPasskey, listPasskeys } from '../services/supabaseAuth';
import { branding } from './branding';
import CompanyCalendar, { EventCard } from './CompanyCalendar';
import PasskeysCard from './PasskeysCard';
import type { ToastType } from '../types';

export default function PortalHomePage({
  onSignOut,
  showToast,
}: {
  onSignOut: () => void;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [page, setPage] = useState<'home' | 'calendar' | 'account'>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState('');
  const [notified, setNotified] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const a = await getPortalAccount();
      setAccount(a);
      if (!a) {
        setSummary(null);
        setEvents([]);
        throw new Error(
          'Portal access is no longer available. Please speak to a staff member.',
        );
      }
      if (a.activated_at) {
        const [s, e] = await Promise.all([
          getPortalSummary(),
          listCompanyEvents(),
        ]);
        setSummary(s);
        setEvents(e);
      }
      setError('');
    } catch (e) {
      setSummary(null);
      setEvents([]);
      setError(e instanceof Error ? e.message : 'Could not load your portal.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    window.addEventListener('focus', refresh);
    const id = window.setInterval(() => void refresh(), 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(id);
    };
  }, [refresh]);
  useEffect(() => {
    if (!notificationSupport() || !account?.activated_at) return;
    portalNotificationsEnabled()
      .then(setNotified)
      .catch(() => {});
  }, [account?.user_id, account?.activated_at]);
  const task = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : 'Could not complete this action.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };
  const setup = () =>
    task(async () => {
      if (!(await listPasskeys()).length) {
        const r = await registerPasskey();
        if (r.error) throw r.error;
      }
      await portalRequest('complete');
      await refresh();
    });
  const next = events.find((e) => new Date(e.ends_at).getTime() >= Date.now());
  const metric = (label: string, value: string | number) => (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-company-blue text-white">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setPage('home')}
            className="flex items-center gap-3"
          >
            <img
              src={branding.bbLogo}
              alt="The Boys’ Brigade"
              className="w-12"
            />
            <span className="font-semibold">Company Section</span>
          </button>
          <button
            onClick={() => setPage(page === 'account' ? 'home' : 'account')}
            className="text-sm underline"
          >
            {page === 'account' ? 'Home' : 'Account'}
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-5 sm:p-8 space-y-6">
        {loading ? (
          <p>Loading your portal…</p>
        ) : error ? (
          <div role="alert" className="bg-red-50 p-5 rounded-xl space-y-3">
            <p>{error}</p>
            <button onClick={() => void refresh()} className="underline">
              Try again
            </button>
            <button onClick={onSignOut} className="underline ml-5">
              Sign out
            </button>
          </div>
        ) : !account?.activated_at ? (
          <section className="bg-white p-6 rounded-xl space-y-4">
            <h1 className="text-2xl font-bold">Finish setting up</h1>
            <p>Create a passkey to open your calendar and stats.</p>
            <button
              onClick={() => void setup()}
              disabled={busy}
              className="bg-company-blue text-white rounded-lg px-5 py-3 disabled:opacity-50"
            >
              {busy ? 'Setting up…' : 'Create my passkey'}
            </button>
            <button onClick={onSignOut} className="block text-sm underline">
              Sign out
            </button>
          </section>
        ) : (
          summary && (
            <>
              {page === 'home' && (
                <>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-company-blue via-[#2a3e61] to-[#3b5f91] p-5 sm:p-6 text-white shadow-sm">
                    <div>
                      <p className="text-xs text-blue-100">
                        Your Company portal
                      </p>
                      <h1 className="text-2xl font-bold text-white mt-1">
                        Hi, {summary.name.split(' ')[0]}
                      </h1>
                    </div>
                    <button
                      onClick={() => setPage('calendar')}
                      className="rounded-xl bg-white text-company-blue px-4 py-2 text-sm font-semibold shadow-sm"
                    >
                      Calendar
                    </button>
                  </div>
                  <section className="space-y-3">
                    <h2 className="font-semibold text-slate-900">Next night</h2>
                    {next ? (
                      <EventCard event={next} />
                    ) : (
                      <p className="bg-white rounded-xl p-5 text-sm text-slate-500">
                        No upcoming nights yet.
                      </p>
                    )}
                  </section>
                  <section className="space-y-3">
                    <h2 className="font-semibold text-slate-900">
                      My stats{' '}
                      <span className="font-normal text-xs text-slate-500">
                        This BB year
                      </span>
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      {metric('Total marks', summary.total)}
                      {metric(
                        'Attendance',
                        summary.recorded
                          ? `${Math.round((summary.attended / summary.recorded) * 100)}%`
                          : '—',
                      )}
                      {metric(
                        'Position in my squad',
                        summary.recorded ? `#${summary.squadRank}` : '—',
                      )}
                      {metric(
                        'Position in Company',
                        summary.recorded ? `#${summary.companyRank}` : '—',
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {summary.attended} present out of {summary.recorded}{' '}
                      recorded nights. Equal totals share a position.
                    </p>
                  </section>
                  <section className="space-y-3">
                    <h2 className="font-semibold text-slate-900">My squad</h2>
                    <div className="bg-white rounded-xl border overflow-hidden">
                      {summary.squads.map((s) => (
                        <div
                          key={s.number}
                          className={`flex justify-between gap-3 p-4 border-b last:border-b-0 ${s.number === summary.squad ? 'bg-blue-50' : ''}`}
                        >
                          <span className="text-sm font-medium">
                            #
                            {1 +
                              summary.squads.filter(
                                (other) => other.total > s.total,
                              ).length}{' '}
                            · Squad {s.number}
                            {s.label ? ` · ${s.label}` : ''}
                            {s.number === summary.squad ? ' · Yours' : ''}
                          </span>
                          <span className="text-sm">
                            {s.total} marks ·{' '}
                            {s.recorded
                              ? Math.round((s.attended / s.recorded) * 100) +
                                '%'
                              : '—'}{' '}
                            attendance
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <details className="bg-white border rounded-xl p-5">
                    <summary className="cursor-pointer font-semibold text-sm">
                      My weekly marks
                    </summary>
                    <div className="mt-3 space-y-2">
                      {summary.marks.map((m) => (
                        <div
                          key={m.date}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {new Date(m.date + 'T12:00:00Z').toLocaleDateString(
                              'en-GB',
                              {
                                day: 'numeric',
                                month: 'short',
                                timeZone: 'UTC',
                              },
                            )}
                          </span>
                          <span>
                            {m.score < 0 ? 'Absent' : `${m.score} marks`}
                          </span>
                        </div>
                      ))}
                      {!summary.marks.length && (
                        <p className="text-sm text-slate-500">
                          No marks recorded yet.
                        </p>
                      )}
                    </div>
                  </details>
                </>
              )}
              {page === 'calendar' && (
                <>
                  <button
                    onClick={() => setPage('home')}
                    className="text-sm text-company-blue"
                  >
                    ‹ Home
                  </button>
                  <h1 className="text-2xl font-bold">Calendar</h1>
                  <CompanyCalendar events={events} />
                  <button
                    disabled={busy}
                    onClick={() =>
                      void task(async () => {
                        const r = await portalRequest<{ url: string }>('feed');
                        setFeed(r.url);
                      })
                    }
                    className="bg-company-blue text-white rounded-lg px-5 py-3 disabled:opacity-50"
                  >
                    Create calendar subscription link
                  </button>
                  {feed && (
                    <div className="rounded-xl bg-white border p-4 space-y-3">
                      <p className="text-sm">
                        Keep this link private. Creating another link replaces
                        the previous one.
                      </p>
                      <input
                        aria-label="Calendar subscription URL"
                        readOnly
                        value={feed}
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                      <div className="flex gap-4">
                        <a
                          href={feed.replace(/^https:/, 'webcal:')}
                          className="text-company-blue text-sm underline"
                        >
                          Open calendar app
                        </a>
                        <button
                          onClick={() =>
                            void task(async () => {
                              await navigator.clipboard.writeText(feed);
                              showToast('Calendar link copied.');
                            })
                          }
                          className="text-company-blue text-sm underline"
                        >
                          Copy link
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        In Google Calendar, use “From URL”. Your calendar app
                        controls how quickly changes appear.
                      </p>
                    </div>
                  )}
                </>
              )}
              {page === 'account' && (
                <>
                  <h1 className="text-2xl font-bold">Account</h1>
                  <p className="text-sm text-slate-500">
                    Username: {account.username}
                  </p>
                  <PasskeysCard activeSection="company" showToast={showToast} />
                  <section className="bg-white border rounded-xl p-5 space-y-3">
                    <h2 className="font-semibold">Notifications</h2>
                    <p className="text-sm text-slate-600">
                      Get updates when nights are added, cancelled, moved or
                      change time.
                    </p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void task(async () => {
                          if (notified) {
                            await disablePortalNotifications();
                            setNotified(false);
                          } else {
                            await enablePortalNotifications();
                            setNotified(true);
                          }
                          showToast(
                            notified
                              ? 'Notifications disabled on this device.'
                              : 'Notifications enabled on this device.',
                          );
                        })
                      }
                      className="rounded-lg bg-company-blue text-white px-4 py-2 disabled:opacity-50"
                    >
                      {notified
                        ? 'Disable notifications'
                        : 'Enable notifications'}
                    </button>
                    {!notificationSupport() && (
                      <p className="text-xs text-slate-500">
                        On iPhone, add BB Manager to your Home Screen and open
                        it there.
                      </p>
                    )}
                  </section>
                  <button
                    onClick={onSignOut}
                    className="text-sm text-company-blue underline"
                  >
                    Sign out
                  </button>
                </>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}
