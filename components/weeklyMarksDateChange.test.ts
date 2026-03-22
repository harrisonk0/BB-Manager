import { describe, expect, it } from 'vitest';

import { shouldConfirmWeeklyMarksDateChange } from './weeklyMarksDateChange';

describe('shouldConfirmWeeklyMarksDateChange', () => {
  it('requires confirmation when the sheet is dirty and the date changes', () => {
    expect(
      shouldConfirmWeeklyMarksDateChange({
        currentDate: '2026-03-20',
        nextDate: '2026-03-27',
        isDirty: true,
      }),
    ).toBe(true);
  });

  it('does not require confirmation when the date stays the same', () => {
    expect(
      shouldConfirmWeeklyMarksDateChange({
        currentDate: '2026-03-20',
        nextDate: '2026-03-20',
        isDirty: true,
      }),
    ).toBe(false);
  });

  it('does not require confirmation when the sheet is clean', () => {
    expect(
      shouldConfirmWeeklyMarksDateChange({
        currentDate: '2026-03-20',
        nextDate: '2026-03-27',
        isDirty: false,
      }),
    ).toBe(false);
  });
});
