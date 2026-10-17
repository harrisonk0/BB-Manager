import {
  NativeButton,
  NativeSwitch,
  NativeInput,
  NativeField,
  GroupedList,
  SettingsRow,
  InlineNotice,
  LoadingState,
} from "./ui";
import "./portal/portal.css";
import React, { useCallback, useEffect, useState } from "react";
import type { ToastType } from "../types";
import type { CalendarSettings, CompanyEvent } from "../types/portal";
import {
  generateCompanyNights,
  getCalendarSettings,
  listCompanyEvents,
  londonDateTime,
  saveCompanyEvent,
} from "../services/portal";
import CompanyCalendar from "./CompanyCalendar";
import Modal from "./Modal";
import { CalendarIcon, PlusIcon } from "./Icons";

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
  title: "",
  startsLocal: "",
  endsLocal: "",
  location: "",
  details: "",
  cancelled: false,
};
const emptySettings: CalendarSettings = {
  id: true,
  starts_on: "",
  ends_on: "",
  starts_at: "",
  ends_at: "",
  location: "",
  timezone: "Europe/London",
};
export default function CompanyCalendarPage({
  showToast,
}: {
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [settings, setSettings] = useState<CalendarSettings>(emptySettings);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  // Keep the modal focus trap stable while staff type into the event fields.
  const closeEditor = useCallback(() => {
    if (!busy) setEditing(false);
  }, [busy]);
  const refresh = async () => {
    const [e, s] = await Promise.all([
      listCompanyEvents(),
      getCalendarSettings(),
    ]);
    setEvents(e);
    setLoaded(true);
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
    setError("");
    try {
      const count = await generateCompanyNights(settings);
      await refresh();
      showToast(`${count} weekly nights added. Existing nights were kept.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate nights.");
    } finally {
      setBusy(false);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await saveCompanyEvent(draft);
      await refresh();
      setEditing(false);
      showToast(
        "Event saved. Calendar subscriptions and notifications will update.",
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save event.");
    } finally {
      setBusy(false);
    }
  };
  const poster = async (event: CompanyEvent) => {
    setBusy(true);
    try {
      const [{ pdf }, { default: EventPoster }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./reports/EventPosterDocument"),
      ]);
      const blob = await pdf(<EventPoster event={event} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.className = "external"; // Downloads belong to the browser, never the page router.
      link.download = `${event.title.replace(/[^a-z0-9]/gi, "-") || "event"}-poster.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      showToast(
        "Could not create the event poster. Please try again.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!loaded && !error)
    return <LoadingState label="Loading Company calendar…" />;
  return (
    <div className="bb-portal-content bb-calendar-page">
      <div className="bb-portal-intro">
        <div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="rounded-xl bg-white/10 p-3">
              <CalendarIcon className="w-7 h-7" />
            </span>
            <h2>Plan Company nights</h2>
          </div>
          <p className="bb-portal-note">
            Plan nights, share updates and create event posters.
          </p>
        </div>
        <NativeButton
          disabled={busy}
          onClick={() => {
            setDraft(emptyDraft);
            setFormError("");
            setEditing(true);
          }}
        >
          <span aria-hidden="true">
            <PlusIcon />
          </span>
          Add event
        </NativeButton>
      </div>
      {error && (
        <InlineNotice kind="error">
          <p>{error}</p>
          <NativeButton
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void refresh()
                .then(() => setError(""))
                .catch((e) => setError(e.message))
            }
          >
            Try again
          </NativeButton>
        </InlineNotice>
      )}
      <details className="bb-portal-disclosure">
        <summary className="font-semibold cursor-pointer">
          Weekly nights for the BB year
        </summary>
        <form onSubmit={(e) => void generate(e)} className="space-y-4 mt-5">
          <p className="text-sm text-slate-500">
            Uses the Company meeting weekday from Section Settings. Existing
            events, edits and cancellations are preserved. Times are in
            Europe/London.
          </p>
          <div className="bb-portal-form-grid">
            <NativeInput
              disabled={busy}
              label="First date"
              required
              type="date"
              value={settings.starts_on}
              onChange={(e) =>
                setSettings({ ...settings, starts_on: e.target.value })
              }
              className="bb-input"
            />
            <NativeInput
              disabled={busy}
              label="Last date"
              required
              type="date"
              min={settings.starts_on}
              value={settings.ends_on}
              onChange={(e) =>
                setSettings({ ...settings, ends_on: e.target.value })
              }
              className="bb-input"
            />
            <NativeInput
              disabled={busy}
              label="Normal start time"
              required
              type="time"
              value={settings.starts_at}
              onChange={(e) =>
                setSettings({ ...settings, starts_at: e.target.value })
              }
              className="bb-input"
            />
            <NativeInput
              disabled={busy}
              label="Normal end time"
              required
              type="time"
              value={settings.ends_at}
              onChange={(e) =>
                setSettings({ ...settings, ends_at: e.target.value })
              }
              className="bb-input"
            />
          </div>
          <NativeInput
            disabled={busy}
            label="Normal location"
            maxLength={500}
            value={settings.location}
            onChange={(e) =>
              setSettings({ ...settings, location: e.target.value })
            }
            className="bb-input"
          />
          <NativeButton type="submit" disabled={busy}>
            {busy ? "Working…" : "Save and generate weekly nights"}
          </NativeButton>
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
          setFormError("");
          setEditing(true);
        }}
        onPoster={(event) => {
          if (!busy) void poster(event);
        }}
      />
      <Modal
        isOpen={editing}
        dismissible={!busy}
        onClose={closeEditor}
        title={draft.id ? "Edit event" : "Add event"}
      >
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          {formError && <InlineNotice kind="error">{formError}</InlineNotice>}
          <NativeInput
            disabled={busy}
            label="Title"
            autoFocus
            required
            maxLength={160}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="bb-input"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NativeInput
              disabled={busy}
              label="Starts (London time)"
              required
              type="datetime-local"
              value={draft.startsLocal}
              onChange={(e) =>
                setDraft({ ...draft, startsLocal: e.target.value })
              }
              className="bb-input"
            />
            <NativeInput
              disabled={busy}
              label="Ends (London time)"
              required
              type="datetime-local"
              min={draft.startsLocal}
              value={draft.endsLocal}
              onChange={(e) =>
                setDraft({ ...draft, endsLocal: e.target.value })
              }
              className="bb-input"
            />
          </div>
          <NativeInput
            disabled={busy}
            label="Location"
            maxLength={500}
            value={draft.location}
            onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            className="bb-input"
          />
          <NativeField label="Details" htmlFor="event-details">
            <textarea
              disabled={busy}
              id="event-details"
              rows={5}
              maxLength={10000}
              value={draft.details}
              onChange={(e) => setDraft({ ...draft, details: e.target.value })}
              className="bb-input"
            />
          </NativeField>
          <GroupedList title="Event status">
            <SettingsRow
              title="Cancelled"
              detail="Keep the event visible with a cancellation notice"
              trailing={
                <NativeSwitch
                  disabled={busy}
                  label="This event is cancelled"
                  checked={draft.cancelled}
                  onChange={(cancelled) => setDraft({ ...draft, cancelled })}
                />
              }
            />
          </GroupedList>
          <p className="text-sm text-slate-500">
            New events, cancellations, and changes to date, times or location
            send browser notifications.
          </p>
          <div className="flex justify-end gap-3">
            <NativeButton
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </NativeButton>
            <NativeButton type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save event"}
            </NativeButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
