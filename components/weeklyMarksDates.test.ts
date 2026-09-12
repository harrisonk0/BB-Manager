import { describe, expect, it } from 'vitest';

import { formatLocalYmd, getDefaultMarksDate, getNearestMeetingDay, getTodayString } from './weeklyMarksDates';

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

describe('getTodayString', () => {
  it('uses the local calendar date even late in the evening', () => {
    const lateEvening = new Date(2026, 2, 20, 23, 30, 0);
    expect(getTodayString(lateEvening)).toBe('2026-03-20');
    expect(formatLocalYmd(lateEvening)).toBe('2026-03-20');
  });
});

describe('getDefaultMarksDate', () => {
  it('uses today when it is the meeting day', () => {
    expect(getDefaultMarksDate(5, new Date(2026, 8, 11, 19, 0, 0))).toBe('2026-09-11');
  });

  it('uses the meeting that just happened for the next two days', () => {
    expect(getDefaultMarksDate(5, new Date(2026, 8, 12, 7, 42, 0))).toBe('2026-09-11');
    expect(getDefaultMarksDate(5, new Date(2026, 8, 13, 10, 0, 0))).toBe('2026-09-11');
  });

  it('rolls forward when the last meeting is further in the past', () => {
    expect(getDefaultMarksDate(5, new Date(2026, 8, 14, 12, 0, 0))).toBe('2026-09-18');
  });
});
