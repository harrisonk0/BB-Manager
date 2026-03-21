import { describe, expect, it } from 'vitest';

import { getNearestMeetingDay } from './weeklyMarksDates';

describe('getNearestMeetingDay', () => {
  it('returns today when the meeting day matches the base date', () => {
    const result = getNearestMeetingDay(5, new Date('2026-03-20T12:00:00Z'));
    expect(result).toBe('2026-03-20');
  });

  it('rolls forward to the next week when the meeting day has already passed', () => {
    const result = getNearestMeetingDay(1, new Date('2026-03-20T12:00:00Z'));
    expect(result).toBe('2026-03-23');
  });
});
