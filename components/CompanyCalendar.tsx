import React, { useMemo, useState } from 'react';
import type { CompanyEvent } from '../types/portal';
import { eventDateLabel, londonDateTime } from '../services/portal';

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
      className={`rounded-xl border p-5 ${event.cancelled ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{event.title}</h3>
        {event.cancelled && (
          <span className="text-xs font-semibold text-red-700">Cancelled</span>
        )}
      </div>
      <p className="text-sm text-company-blue mt-2">
        {eventDateLabel(event.starts_at)} –{' '}
        {londonDateTime(event.ends_at).slice(11)}
      </p>
      {event.location && (
        <p className="text-sm text-slate-600 mt-1">{event.location}</p>
      )}
      {event.details && (
        <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap break-words">
          {event.details}
        </p>
      )}
      {(onEdit || onPoster) && (
        <div className="flex gap-4 mt-4 text-sm font-medium">
          <button
            onClick={onEdit}
            className="text-company-blue hover:underline"
          >
            Edit event
          </button>
          <button
            onClick={onPoster}
            className="text-company-blue hover:underline"
          >
            Download poster PDF
          </button>
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
  const [month, setMonth] = useState(() =>
    londonDateTime(new Date().toISOString()).slice(0, 7),
  );
  const [day, setDay] = useState<string | null>(null);
  const monthEvents = useMemo(
    () => events.filter((e) => londonDateTime(e.starts_at).startsWith(month)),
    [events, month],
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
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          aria-label="Previous month"
          onClick={() => move(-1)}
          className="rounded-lg bg-white border px-4 py-2"
        >
          ‹
        </button>
        <h2 className="font-semibold">
          {first.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </h2>
        <button
          aria-label="Next month"
          onClick={() => move(1)}
          className="rounded-lg bg-white border px-4 py-2"
        >
          ›
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, '0')}`;
            const nights = monthEvents.filter(
              (e) => londonDateTime(e.starts_at).slice(0, 10) === date,
            );
            return (
              <button
                key={date}
                aria-label={`${date}${nights.length ? `, ${nights.length} events` : ''}`}
                aria-pressed={day === date}
                onClick={() => setDay(day === date ? null : date)}
                className={`h-12 rounded-lg text-sm flex flex-col items-center justify-center ${day === date ? 'bg-company-blue text-white' : 'hover:bg-slate-100'}`}
              >
                {i + 1}
                <span
                  className={`h-1 w-1 rounded-full mt-1 ${nights.length ? (nights.every((e) => e.cancelled) ? 'bg-red-500' : 'bg-blue-500') : 'bg-transparent'}`}
                />
              </button>
            );
          })}
        </div>
      </div>
      {day && (
        <button
          onClick={() => setDay(null)}
          className="text-sm text-company-blue"
        >
          Show all this month
        </button>
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
          <p className="text-sm text-slate-500 py-5 text-center">
            No events {day ? 'on this day' : 'this month'}.
          </p>
        )}
      </div>
    </section>
  );
}
