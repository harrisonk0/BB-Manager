export interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string;
  details: string;
  cancelled: boolean;
  revision: number;
  updated_at: string;
}
const escapeText = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
const stamp = (value: string) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
// RFC 5545 limits physical lines to 75 octets, including continuation whitespace.
export const foldCalendarLine = (line: string) => {
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = new TextEncoder().encode(char).length;
    if (size + bytes > 75) {
      parts.push(current);
      current = ' ';
      size = 1;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n');
};
export const buildCalendarFeed = (events: CalendarEvent[]) =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BB Manager//Company Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BB Company Section',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ...events.flatMap((event) => [
      'BEGIN:VEVENT',
      `UID:${event.id}@bb-manager.vercel.app`,
      `DTSTAMP:${stamp(event.updated_at)}`,
      `LAST-MODIFIED:${stamp(event.updated_at)}`,
      `SEQUENCE:${event.revision}`,
      `DTSTART:${stamp(event.starts_at)}`,
      `DTEND:${stamp(event.ends_at)}`,
      `SUMMARY:${escapeText(event.cancelled ? 'CANCELLED: ' + event.title : event.title)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(event.details)}`,
      `STATUS:${event.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ]
    .map(foldCalendarLine)
    .join('\r\n') + '\r\n';

export const isAllowedPushEndpoint = (endpoint: string): boolean => {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === '443') &&
      ([
        'fcm.googleapis.com',
        'updates.push.services.mozilla.com',
        'web.push.apple.com',
      ].includes(u.hostname) ||
        u.hostname.endsWith('.notify.windows.com') ||
        u.hostname.endsWith('.push.apple.com'))
    );
  } catch {
    return false;
  }
};
export const generateAccessCode = (): string => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  // Rejection sampling avoids modulo bias.
  while (code.length < 6)
    for (const b of crypto.getRandomValues(new Uint8Array(12))) {
      if (b < 252 && code.length < 6) code += alphabet[b % 36];
    }
  return code;
};
