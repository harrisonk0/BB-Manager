import { describe, expect, it } from 'vitest';
import {
  buildCalendarFeed,
  foldCalendarLine,
  generateAccessCode,
  isAllowedPushEndpoint,
} from '../supabase/functions/_shared/calendar';
const event = {
  id: 'event-1',
  title: 'Sports, games; pizza',
  starts_at: '2026-10-09T18:00:00Z',
  ends_at: '2026-10-09T20:00:00Z',
  location: 'Hall',
  details: 'Bring kit\nMeet outside',
  cancelled: false,
  revision: 2,
  updated_at: '2026-10-01T10:00:00Z',
};
describe('Company calendar subscriptions', () => {
  it('preserves event identity and revision when a night is cancelled', () => {
    const before = buildCalendarFeed([event]);
    const after = buildCalendarFeed([
      { ...event, cancelled: true, revision: 3 },
    ]);
    expect(before).toContain('UID:event-1@bb-manager.vercel.app');
    expect(after).toContain('UID:event-1@bb-manager.vercel.app');
    expect(after).toContain('SEQUENCE:3');
    expect(after).toContain('STATUS:CANCELLED');
    expect(after).toContain('DTSTART:20261009T180000Z');
  });
  it('escapes user text so newlines cannot inject calendar properties', () => {
    const feed = buildCalendarFeed([
      { ...event, details: 'Hello\r\nATTENDEE:evil\\person' },
    ]);
    expect(feed).toContain('Hello\\nATTENDEE:evil\\\\person');
    expect(feed).not.toContain('\r\nATTENDEE:');
    expect(feed).toContain('SUMMARY:Sports\\, games\\; pizza');
  });
  it('folds unicode lines to at most 75 UTF-8 octets without breaking characters', () => {
    const line = 'DESCRIPTION:' + 'BB 🏀 é '.repeat(50);
    const folded = foldCalendarLine(line);
    for (const part of folded.split('\r\n'))
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });
});
describe('Portal setup and push validation', () => {
  it('generates six-character uppercase alphanumeric setup codes', () => {
    for (let i = 0; i < 100; i++)
      expect(generateAccessCode()).toMatch(/^[A-Z0-9]{6}$/);
  });
  it.each([
    'https://fcm.googleapis.com/fcm/send/example',
    'https://updates.push.services.mozilla.com/wpush/v2/example',
    'https://web.push.apple.com/example',
    'https://wns.notify.windows.com/example',
  ])('accepts browser push provider %s', (value) =>
    expect(isAllowedPushEndpoint(value)).toBe(true),
  );
  it.each([
    'http://fcm.googleapis.com/example',
    'https://fcm.googleapis.com.evil.example/',
    'https://127.0.0.1/',
    'https://localhost/',
    'https://fcm.googleapis.com:8443/',
    'https://user:secret@fcm.googleapis.com/',
    'https://example.com/',
    'not-a-url',
  ])('rejects unsafe push destination %s', (value) =>
    expect(isAllowedPushEndpoint(value)).toBe(false),
  );
});
