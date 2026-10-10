import React, { useMemo, useState } from 'react';
import type { CompanyEvent } from '../types/portal';
import { eventDateLabel, londonDateTime } from '../services/portal';
import {
  CalendarIcon,
  MapPinIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './Icons';

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
      className={`rounded-2xl border p-5 shadow-sm ${event.cancelled ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{event.title}</h3>
        {event.cancelled && (
          <span className="text-xs font-semibold text-red-700">Cancelled</span>
        )}
      </div>
      <p className="text-sm text-company-blue mt-3 flex items-start gap-2">
        <span aria-hidden="true">
          <CalendarIcon className="w-4 h-4 mt-0.5 shrink-0" />
        </span>
        <span>
          {eventDateLabel(event.starts_at)} –{' '}
          {londonDateTime(event.starts_at).slice(0, 10) ===
          londonDateTime(event.ends_at).slice(0, 10)
            ? londonDateTime(event.ends_at).slice(11)
            : eventDateLabel(event.ends_at)}
        </span>
      </p>
      {event.location && (
        <p className="text-sm text-slate-600 mt-2 flex items-start gap-2">
          <MapPinIcon className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{event.location}</span>
        </p>
      )}
      {event.details && (
        <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap break-words">
          {event.details}
        </p>
      )}
      {(onEdit || onPoster) && (
        <div className="flex flex-wrap gap-3 mt-4 text-sm font-medium">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-company-blue border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 inline-flex items-center gap-2"
            >
              <span aria-hidden="true">
                <PencilIcon className="w-4 h-4" />
              </span>
              Edit event
            </button>
          )}
          {onPoster && (
            <button
              onClick={onPoster}
              className="text-company-blue bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100 inline-flex items-center gap-2"
            >
              <span aria-hidden="true">
                <ArrowDownTrayIcon className="w-4 h-4" />
              </span>
              Download poster PDF
            </button>
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
          <span aria-hidden="true">
            <ChevronLeftIcon className="w-4 h-4" />
          </span>
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
          <span aria-hidden="true">
            <ChevronRightIcon className="w-4 h-4" />
          </span>
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
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
            const today =
              date === londonDateTime(new Date().toISOString()).slice(0, 10);
            return (
              <button
                key={date}
                aria-label={`${date}${nights.length ? `, ${nights.length} events` : ''}`}
                aria-pressed={day === date}
                aria-current={today ? 'date' : undefined}
                onClick={() => setDay(day === date ? null : date)}
                className={`h-12 sm:h-14 rounded-xl text-sm flex flex-col items-center justify-center ${day === date ? 'bg-company-blue text-white shadow-sm' : today ? 'bg-blue-50 text-company-blue font-bold' : 'hover:bg-slate-100'}`}
              >
                {i + 1}
                <span
                  className="flex h-2 items-center gap-1 mt-1"
                  aria-hidden="true"
                >
                  {nights.slice(0, 3).map((night) => (
                    <span
                      key={night.id}
                      className={`h-1.5 w-1.5 rounded-full ${night.cancelled ? 'bg-red-500' : day === date ? 'bg-white' : 'bg-company-blue'}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 border-t border-slate-100 mt-3 pt-3">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-company-blue" />
            Night or event
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Cancelled
          </span>
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
