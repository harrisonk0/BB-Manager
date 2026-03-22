import { describe, expect, it } from 'vitest';

import type { Boy } from '../types';
import {
  areMarkListsEqual,
  buildWeeklyMarksSnapshot,
  normalizeEditableMarksForSave,
} from './weeklyMarksSavePlan';

const baseBoy: Boy = {
  id: 'member-1',
  name: 'Alex',
  squad: 1,
  year: 10,
  marks: [],
  isSquadLeader: false,
};

describe('buildWeeklyMarksSnapshot', () => {
  it('creates an absent mark entry when attendance is toggled off', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [baseBoy],
        selectedDate: '2026-03-27',
        attendance: { 'member-1': 'absent' },
        marks: {},
        activeSection: 'company',
      }),
    ).toEqual([{ memberId: 'member-1', mark: { date: '2026-03-27', score: -1 } }]);
  });

  it('creates a delete entry when a saved company mark is cleared', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [{ ...baseBoy, marks: [{ date: '2026-03-27', score: 9 }] }],
        selectedDate: '2026-03-27',
        attendance: { 'member-1': 'present' },
        marks: { 'member-1': '' },
        activeSection: 'company',
      }),
    ).toEqual([{ memberId: 'member-1', mark: null }]);
  });

  it('builds a changed-entry snapshot for the selected date', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [
          { ...baseBoy, marks: [{ date: '2026-03-27', score: 8 }] },
          {
            ...baseBoy,
            id: 'member-2',
            name: 'Ben',
            marks: [{ date: '2026-03-27', score: 6 }],
          },
          {
            ...baseBoy,
            id: 'member-3',
            name: 'Chris',
            marks: [],
          },
        ],
        selectedDate: '2026-03-27',
        attendance: {
          'member-1': 'present',
          'member-2': 'present',
          'member-3': 'absent',
        },
        marks: {
          'member-1': 9,
          'member-2': '',
          'member-3': -1,
        },
        activeSection: 'company',
      }),
    ).toEqual([
      { memberId: 'member-1', mark: { date: '2026-03-27', score: 9 } },
      { memberId: 'member-2', mark: null },
      { memberId: 'member-3', mark: { date: '2026-03-27', score: -1 } },
    ]);
  });

  it('keeps absent state in the snapshot', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [{ ...baseBoy, marks: [{ date: '2026-03-27', score: -1 }] }],
        selectedDate: '2026-03-27',
        attendance: { 'member-1': 'present' },
        marks: { 'member-1': '' },
        activeSection: 'company',
      }),
    ).toEqual([{ memberId: 'member-1', mark: null }]);
  });

  it('builds junior totals from partial entries', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [{ ...baseBoy, year: 'P6' }],
        selectedDate: '2026-03-27',
        attendance: { 'member-1': 'present' },
        marks: { 'member-1': { uniform: 4, behaviour: '' } },
        activeSection: 'junior',
      }),
    ).toEqual([
      {
        memberId: 'member-1',
        mark: { date: '2026-03-27', score: 4, uniformScore: 4, behaviourScore: 0 },
      },
    ]);
  });

  it('omits unchanged weekly rows from the snapshot', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [{ ...baseBoy, marks: [{ date: '2026-03-27', score: -1 }] }],
        selectedDate: '2026-03-27',
        attendance: { 'member-1': 'absent' },
        marks: {},
        activeSection: 'company',
      }),
    ).toEqual([]);
  });
});

describe('normalizeEditableMarksForSave', () => {
  it('normalizes editable company marks', () => {
    expect(
      normalizeEditableMarksForSave([{ date: '2026-03-27', score: 8 }], 'company'),
    ).toEqual([{ date: '2026-03-27', score: 8 }]);
  });

  it('preserves absent junior marks', () => {
    expect(
      normalizeEditableMarksForSave(
        [{ date: '2026-03-27', score: -1, uniformScore: '', behaviourScore: '' }],
        'junior',
      ),
    ).toEqual([{ date: '2026-03-27', score: -1 }]);
  });
});

describe('areMarkListsEqual', () => {
  it('treats reordered equivalent lists as equal', () => {
    expect(
      areMarkListsEqual(
        [
          { date: '2026-03-27', score: 8 },
          { date: '2026-03-20', score: -1 },
        ],
        [
          { date: '2026-03-20', score: -1 },
          { date: '2026-03-27', score: 8 },
        ],
      ),
    ).toBe(true);
  });
});
