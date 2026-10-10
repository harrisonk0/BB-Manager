import React, { useEffect, useState } from 'react';
import type { ToastType } from '../types';
import type { CalendarSettings, CompanyEvent } from '../types/portal';
import {
  generateCompanyNights,
  getCalendarSettings,
  listCompanyEvents,
  londonDateTime,
  saveCompanyEvent,
} from '../services/portal';
import CompanyCalendar from './CompanyCalendar';
import Modal from './Modal';
import { CalendarIcon, PlusIcon } from './Icons';

type EventDraft = {
  id?: string;
  revision?: number;
  title: string;
  startsLocal: string;
  endsLocal: string;
  location: string;
  details: string;
  cancelled: boolean;
};
const emptyDraft: EventDraft = {
  title: '',
  startsLocal: '',
  endsLocal: '',
  location: '',
  details: '',
  cancelled: false,
};
const emptySettings: CalendarSettings = {
  id: true,
  starts_on: '',
  ends_on: '',
  starts_at: '',
  ends_at: '',
  location: '',
  timezone: 'Europe/London',
};
const input =
  'block w-full rounded-lg border border-slate-300 bg-white p-2.5 mt-1 text-sm';
export default function CompanyCalendarPage({
  showToast,
}: {
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [settings, setSettings] = useState<CalendarSettings>(emptySettings);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const refresh = async () => {
    const [e, s] = await Promise.all([
      listCompanyEvents(),
      getCalendarSettings(),
    ]);
    setEvents(e);
    if (s)
      setSettings({
        ...s,
        starts_at: s.starts_at.slice(0, 5),
        ends_at: s.ends_at.slice(0, 5),
      });
  };
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, []);
  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const count = await generateCompanyNights(settings);
      await refresh();
      showToast(`${count} weekly nights added. Existing nights were kept.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate nights.');
    } finally {
      setBusy(false);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await saveCompanyEvent(draft);
      await refresh();
      setEditing(false);
      showToast(
        'Event saved. Calendar subscriptions and notifications will update.',
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save event.');
    } finally {
      setBusy(false);
    }
  };
  const poster = async (event: CompanyEvent) => {
    setBusy(true);
    try {
      const [{ pdf }, { default: EventPoster }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./reports/EventPosterDocument'),
      ]);
      const blob = await pdf(<EventPoster event={event} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.title.replace(/[^a-z0-9]/gi, '-') || 'event'}-poster.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      showToast(
        'Could not create the event poster. Please try again.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 rounded-2xl bg-gradient-to-br from-company-blue via-[#2a3e61] to-[#3b5f91] p-6 sm:p-8 text-white shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="rounded-xl bg-white/10 p-3">
              <CalendarIcon className="w-7 h-7" />
            </span>
            <h1 className="text-3xl font-bold">Company calendar</h1>
          </div>
          <p className="text-sm text-blue-100 mt-2">
            Plan nights, share updates and create event posters.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            setDraft(emptyDraft);
            setFormError('');
            setEditing(true);
          }}
          className="bg-white text-company-blue font-semibold px-5 py-3 rounded-xl shadow-sm hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <span aria-hidden="true">
            <PlusIcon className="w-5 h-5" />
          </span>
          Add event
        </button>
      </div>
      {error && (
        <p role="alert" className="bg-red-50 text-red-700 rounded-lg p-4">
          {error}
        </p>
      )}
      <details className="bg-white border rounded-xl p-5">
        <summary className="font-semibold cursor-pointer">
          Weekly nights for the BB year
        </summary>
        <form onSubmit={(e) => void generate(e)} className="space-y-4 mt-5">
          <p className="text-sm text-slate-500">
            Uses the Company meeting weekday from Section Settings. Existing
            events, edits and cancellations are preserved. Times are in
            Europe/London.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              First date
              <input
                required
                type="date"
                value={settings.starts_on}
                onChange={(e) =>
                  setSettings({ ...settings, starts_on: e.target.value })
                }
                className={input}
              />
            </label>
            <label className="text-sm">
              Last date
              <input
                required
                type="date"
                min={settings.starts_on}
                value={settings.ends_on}
                onChange={(e) =>
                  setSettings({ ...settings, ends_on: e.target.value })
                }
                className={input}
              />
            </label>
            <label className="text-sm">
              Normal start time
              <input
                required
                type="time"
                value={settings.starts_at}
                onChange={(e) =>
                  setSettings({ ...settings, starts_at: e.target.value })
                }
                className={input}
              />
            </label>
            <label className="text-sm">
              Normal end time
              <input
                required
                type="time"
                value={settings.ends_at}
                onChange={(e) =>
                  setSettings({ ...settings, ends_at: e.target.value })
                }
                className={input}
              />
            </label>
          </div>
          <label className="block text-sm">
            Normal location
            <input
              maxLength={500}
              value={settings.location}
              onChange={(e) =>
                setSettings({ ...settings, location: e.target.value })
              }
              className={input}
            />
          </label>
          <button
            disabled={busy}
            className="bg-company-blue text-white rounded-lg px-4 py-2 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Save and generate weekly nights'}
          </button>
        </form>
      </details>
      <CompanyCalendar
        events={events}
        onEdit={(event) => {
          setDraft({
            id: event.id,
            revision: event.revision,
            title: event.title,
            startsLocal: londonDateTime(event.starts_at),
            endsLocal: londonDateTime(event.ends_at),
            location: event.location,
            details: event.details,
            cancelled: event.cancelled,
          });
          setFormError('');
          setEditing(true);
        }}
        onPoster={(event) => {
          if (!busy) void poster(event);
        }}
      />
      <Modal
        isOpen={editing}
        onClose={() => {
          if (!busy) setEditing(false);
        }}
        title={draft.id ? 'Edit event' : 'Add event'}
      >
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          {formError && (
            <p role="alert" className="bg-red-50 text-red-700 rounded-lg p-3">
              {formError}
            </p>
          )}
          <label className="block text-sm">
            Title
            <input
              autoFocus
              required
              maxLength={160}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={input}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm">
              Starts (London time)
              <input
                required
                type="datetime-local"
                value={draft.startsLocal}
                onChange={(e) =>
                  setDraft({ ...draft, startsLocal: e.target.value })
                }
                className={input}
              />
            </label>
            <label className="text-sm">
              Ends (London time)
              <input
                required
                type="datetime-local"
                min={draft.startsLocal}
                value={draft.endsLocal}
                onChange={(e) =>
                  setDraft({ ...draft, endsLocal: e.target.value })
                }
                className={input}
              />
            </label>
          </div>
          <label className="block text-sm">
            Location
            <input
              maxLength={500}
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              className={input}
            />
          </label>
          <label className="block text-sm">
            Details
            <textarea
              rows={5}
              maxLength={10000}
              value={draft.details}
              onChange={(e) => setDraft({ ...draft, details: e.target.value })}
              className={input}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.cancelled}
              onChange={(e) =>
                setDraft({ ...draft, cancelled: e.target.checked })
              }
            />
            This event is cancelled
          </label>
          <p className="text-xs text-slate-500">
            New events, cancellations, and changes to date, times or location
            send browser notifications.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="px-4 py-2"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              className="bg-company-blue text-white rounded-lg px-4 py-2 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
