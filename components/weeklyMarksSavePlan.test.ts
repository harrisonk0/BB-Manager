import { describe, expect, it } from 'vitest';

import type { Boy } from '../types';
import { buildUpdatedMarksForBoy } from './weeklyMarksSavePlan';

const baseBoy: Boy = {
  id: 'member-1',
  name: 'Alex',
  squad: 1,
  year: 10,
  marks: [],
  isSquadLeader: false,
};

describe('buildUpdatedMarksForBoy', () => {
  it('creates an absent mark when attendance is toggled off', () => {
    expect(
      buildUpdatedMarksForBoy({
        boy: baseBoy,
        selectedDate: '2026-03-27',
        attendanceStatus: 'absent',
        markState: undefined,
        activeSection: 'company',
      }),
    ).toEqual([{ date: '2026-03-27', score: -1 }]);
  });

  it('skips company updates when no score has been entered', () => {
    expect(
      buildUpdatedMarksForBoy({
        boy: baseBoy,
        selectedDate: '2026-03-27',
        attendanceStatus: 'present',
        markState: '',
        activeSection: 'company',
      }),
    ).toBeNull();
  });

  it('normalizes company updates back to a single score mark', () => {
    const boy: Boy = {
      ...baseBoy,
      marks: [{ date: '2026-03-27', score: 9, uniformScore: 5, behaviourScore: 4 }],
    };

    expect(
      buildUpdatedMarksForBoy({
        boy,
        selectedDate: '2026-03-27',
        attendanceStatus: 'present',
        markState: '9',
        activeSection: 'company',
      }),
    ).toEqual([{ date: '2026-03-27', score: 9 }]);
  });

  it('builds junior totals from partial entries', () => {
    expect(
      buildUpdatedMarksForBoy({
        boy: baseBoy,
        selectedDate: '2026-03-27',
        attendanceStatus: 'present',
        markState: { uniform: 4, behaviour: '' },
        activeSection: 'junior',
      }),
    ).toEqual([{ date: '2026-03-27', score: 4, uniformScore: 4, behaviourScore: 0 }]);
  });

  it('skips junior updates when the existing mark is unchanged', () => {
    const boy: Boy = {
      ...baseBoy,
      year: 'P7',
      marks: [{ date: '2026-03-27', score: 7, uniformScore: 5, behaviourScore: 2 }],
    };

    expect(
      buildUpdatedMarksForBoy({
        boy,
        selectedDate: '2026-03-27',
        attendanceStatus: 'present',
        markState: { uniform: 5, behaviour: 2 },
        activeSection: 'junior',
      }),
    ).toBeNull();
  });

  it('skips junior updates when a score cannot be parsed', () => {
    expect(
      buildUpdatedMarksForBoy({
        boy: { ...baseBoy, year: 'P6' },
        selectedDate: '2026-03-27',
        attendanceStatus: 'present',
        markState: { uniform: 'oops' as never, behaviour: 2 },
        activeSection: 'junior',
      }),
    ).toBeNull();
  });
});
