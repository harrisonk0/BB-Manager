import { NativeButton, NativeSegmented, EmptyState } from "./ui";
import "./portal/portal.css";
import React, { useEffect, useMemo, useState } from "react";
import { isCalendarEventVisible } from "../supabase/functions/_shared/calendar";
import type { CompanyEvent } from "../types/portal";
import { eventDateLabel, londonDateTime } from "../services/portal";
import {
  CalendarIcon,
  MapPinIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./Icons";

export function EventCard({
  event,
  onEdit,
  onPoster,
}: {
  event: CompanyEvent;
  onEdit?: () => void;
  onPoster?: () => void;
}) {
  return (
    <article
      className={`bb-event ${event.cancelled ? "bb-event--cancelled" : ""}`}
    >
      <div className="bb-event-heading">
        <span className="bb-event-date" aria-hidden="true">
          <strong>
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              timeZone: "Europe/London",
            }).format(new Date(event.starts_at))}
          </strong>
          <span>
            {new Intl.DateTimeFormat("en-GB", {
              month: "short",
              timeZone: "Europe/London",
            }).format(new Date(event.starts_at))}
          </span>
        </span>
        <div>
          <h3>{event.title}</h3>
          {event.cancelled && (
            <span className="bb-event-cancelled">Cancelled</span>
          )}
          <p>
            <CalendarIcon className="w-4 h-4" aria-hidden="true" />
            {eventDateLabel(event.starts_at)} –{" "}
            {londonDateTime(event.starts_at).slice(0, 10) ===
            londonDateTime(event.ends_at).slice(0, 10)
              ? londonDateTime(event.ends_at).slice(11)
              : eventDateLabel(event.ends_at)}
          </p>
        </div>
      </div>
      {event.location && (
        <p className="bb-event-location">
          <MapPinIcon className="w-4 h-4" aria-hidden="true" />
          {event.location}
        </p>
      )}
      {event.details && <p className="bb-event-details">{event.details}</p>}
      {(onEdit || onPoster) && (
        <div className="bb-portal-actions">
          {onEdit && (
            <NativeButton variant="secondary" onClick={onEdit}>
              <PencilIcon className="w-4 h-4" aria-hidden="true" />
              Edit event
            </NativeButton>
          )}
          {onPoster && (
            <NativeButton variant="plain" onClick={onPoster}>
              <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
              Poster PDF
            </NativeButton>
          )}
        </div>
      )}
    </article>
  );
}
export default function CompanyCalendar({
  events,
  onEdit,
  onPoster,
}: {
  events: CompanyEvent[];
  onEdit?: (event: CompanyEvent) => void;
  onPoster?: (event: CompanyEvent) => void;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  const [month, setMonth] = useState(() =>
    londonDateTime(new Date().toISOString()).slice(0, 7),
  );
  const [day, setDay] = useState<string | null>(null);
  const [view, setView] = useState("agenda");
  const monthEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          isCalendarEventVisible(e, now) &&
          londonDateTime(e.starts_at).startsWith(month),
      ),
    [events, month, now],
  );
  const first = new Date(`${month}-01T12:00:00Z`);
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const move = (delta: number) => {
    const date = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + delta, 1),
    );
    setMonth(date.toISOString().slice(0, 7));
    setDay(null);
  };
  const visible = day
    ? monthEvents.filter(
        (e) => londonDateTime(e.starts_at).slice(0, 10) === day,
      )
    : monthEvents;
  return (
    <section className="bb-calendar">
      <NativeSegmented
        label="Calendar presentation"
        value={view}
        onChange={setView}
        options={[
          { value: "agenda", label: "Agenda" },
          { value: "month", label: "Month" },
        ]}
      />
      <p className="bb-portal-note">
        Events clear automatically 24 hours after they end.
      </p>
      <div className="flex items-center justify-between">
        <NativeButton
          aria-label="Previous month"
          onClick={() => move(-1)}
          variant="plain"
        >
          <span aria-hidden="true">
            <ChevronLeftIcon className="w-4 h-4" />
          </span>
        </NativeButton>
        <h2 className="font-semibold">
          {first.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h2>
        <NativeButton
          aria-label="Next month"
          onClick={() => move(1)}
          variant="plain"
        >
          <span aria-hidden="true">
            <ChevronRightIcon className="w-4 h-4" />
          </span>
        </NativeButton>
      </div>
      {view === "month" && (
        <div className="bb-calendar-month">
          <div className="bb-calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const nights = monthEvents.filter(
                (e) => londonDateTime(e.starts_at).slice(0, 10) === date,
              );
              const today =
                date === londonDateTime(new Date().toISOString()).slice(0, 10);
              return (
                <NativeButton
                  key={date}
                  aria-label={`${date}${nights.length ? `, ${nights.length} events` : ""}`}
                  aria-pressed={day === date}
                  aria-current={today ? "date" : undefined}
                  onClick={() => setDay(day === date ? null : date)}
                  variant="plain"
                  className={`bb-calendar-day ${day === date ? "is-selected" : today ? "is-today" : ""}`}
                >
                  {i + 1}
                  <span
                    className="flex h-2 items-center gap-1 mt-1"
                    aria-hidden="true"
                  >
                    {nights.slice(0, 3).map((night) => (
                      <span
                        key={night.id}
                        className={`bb-calendar-dot ${night.cancelled ? "is-cancelled" : day === date ? "is-selected" : ""}`}
                      />
                    ))}
                  </span>
                </NativeButton>
              );
            })}
          </div>
          <div className="bb-calendar-legend">
            <span className="flex items-center gap-2">
              <span className="bb-calendar-dot" />
              Night or event
            </span>
            <span className="flex items-center gap-2">
              <span className="bb-calendar-dot is-cancelled" />
              Cancelled
            </span>
          </div>
        </div>
      )}
      {day && (
        <NativeButton onClick={() => setDay(null)} variant="plain">
          Show all this month
        </NativeButton>
      )}
      <div className="space-y-3">
        {visible.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onEdit={onEdit ? () => onEdit(event) : undefined}
            onPoster={onPoster ? () => onPoster(event) : undefined}
          />
        ))}
        {!visible.length && (
          <EmptyState title={`No events ${day ? "on this day" : "this month"}`}>
            <span>Choose another month to explore upcoming nights.</span>
          </EmptyState>
        )}
      </div>
    </section>
  );
}
