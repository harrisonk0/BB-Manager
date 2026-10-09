import { describe, expect, it } from 'vitest';

import type { Boy } from '../types';
import { mapMarkRow, toStoredMark, validateWeeklyMarksSnapshot } from '../services/dbModel';
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

  it('saves zero when a present member’s saved company score is cleared', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [{ ...baseBoy, marks: [{ date: '2026-03-27', score: 9 }] }],
        selectedDate: '2026-03-27',
        attendance: { 'member-1': 'present' },
        marks: { 'member-1': '' },
        activeSection: 'company',
      }),
    ).toEqual([{ memberId: 'member-1', mark: { date: '2026-03-27', score: 0 } }]);
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
      { memberId: 'member-2', mark: { date: '2026-03-27', score: 0 } },
      { memberId: 'member-3', mark: { date: '2026-03-27', score: -1 } },
    ]);
  });

  it('changes an absent member to present with zero when no score is entered', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [{ ...baseBoy, marks: [{ date: '2026-03-27', score: -1 }] }],
        selectedDate: '2026-03-27',
        attendance: { 'member-1': 'present' },
        marks: { 'member-1': '' },
        activeSection: 'company',
      }),
    ).toEqual([{ memberId: 'member-1', mark: { date: '2026-03-27', score: 0 } }]);
  });

  it.each([
    { section: 'company' as const, markState: '', expected: { score: 0 } },
    { section: 'company' as const, markState: undefined, expected: { score: 0 } },
    { section: 'junior' as const, markState: { uniform: '', behaviour: '' }, expected: { score: 0, uniformScore: 0, behaviourScore: 0 } },
    { section: 'junior' as const, markState: undefined, expected: { score: 0, uniformScore: 0, behaviourScore: 0 } },
  ] as const)('records present attendance with blank $section marks ($markState)', ({ section, markState, expected }) => {
    const snapshot = buildWeeklyMarksSnapshot({
      boys: [baseBoy],
      selectedDate: '2026-03-27',
      attendance: { 'member-1': 'present' },
      marks: markState === undefined ? {} : { 'member-1': markState },
      activeSection: section,
    });

    expect(snapshot).toEqual([
      { memberId: 'member-1', mark: { date: '2026-03-27', ...expected } },
    ]);
    expect(() => validateWeeklyMarksSnapshot(snapshot, section)).not.toThrow();
    const storedMark = toStoredMark(snapshot[0].mark!, section);
    expect(storedMark.present).toBe(true);
    expect(mapMarkRow({ id: 'mark-1', member_id: baseBoy.id!, ...storedMark })).toEqual(snapshot[0].mark);

    // Once saved, the same blank inputs must not produce another change.
    expect(buildWeeklyMarksSnapshot({
      boys: [{ ...baseBoy, marks: [snapshot[0].mark!] }],
      selectedDate: '2026-03-27',
      attendance: { 'member-1': 'present' },
      marks: markState === undefined ? {} : { 'member-1': markState },
      activeSection: section,
    })).toEqual([]);
  });

  it.each(['company', 'junior'] as const)('clears a saved mark only when attendance is not recorded in $section', (activeSection) => {
    expect(buildWeeklyMarksSnapshot({
      boys: [{ ...baseBoy, marks: [{ date: '2026-03-27', score: 0 }] }],
      selectedDate: '2026-03-27',
      attendance: {},
      marks: {},
      activeSection,
    })).toEqual([{ memberId: 'member-1', mark: null }]);
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

  it('does not snapshot unmarked members with empty scores', () => {
    expect(
      buildWeeklyMarksSnapshot({
        boys: [baseBoy],
        selectedDate: '2026-03-27',
        attendance: {},
        marks: { 'member-1': '' },
        activeSection: 'company',
      }),
    ).toEqual([]);
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

  it('normalizes junior component scores into numeric totals', () => {
    expect(
      normalizeEditableMarksForSave(
        [{ date: '2026-03-27', score: 5, uniformScore: 2, behaviourScore: 3 }],
        'junior',
      ),
    ).toEqual([
      { date: '2026-03-27', score: 5, uniformScore: 2, behaviourScore: 3 },
    ]);
  });

  it('normalizes empty junior component scores to zero', () => {
    expect(
      normalizeEditableMarksForSave(
        [{ date: '2026-03-27', score: 0, uniformScore: '', behaviourScore: '' }],
        'junior',
      ),
    ).toEqual([
      { date: '2026-03-27', score: 0, uniformScore: 0, behaviourScore: 0 },
    ]);
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

  it('returns false when list lengths differ', () => {
    expect(
      areMarkListsEqual(
        [{ date: '2026-03-27', score: 8 }],
        [
          { date: '2026-03-20', score: -1 },
          { date: '2026-03-27', score: 8 },
        ],
      ),
    ).toBe(false);
  });

  it('returns false when scores differ for the same date', () => {
    expect(
      areMarkListsEqual(
        [{ date: '2026-03-27', score: 5 }],
        [{ date: '2026-03-27', score: 6 }],
      ),
    ).toBe(false);
  });

  it('compares junior mark components as part of equality', () => {
    expect(
      areMarkListsEqual(
        [{ date: '2026-03-27', score: 5, uniformScore: 2, behaviourScore: 3 }],
        [{ date: '2026-03-27', score: 5, uniformScore: 2, behaviourScore: 3 }],
      ),
    ).toBe(true);

    expect(
      areMarkListsEqual(
        [{ date: '2026-03-27', score: 5, uniformScore: 2, behaviourScore: 3 }],
        [{ date: '2026-03-27', score: 5, uniformScore: 1, behaviourScore: 4 }],
      ),
    ).toBe(false);
  });
});
