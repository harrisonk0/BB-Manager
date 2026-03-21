import { describe, expect, it } from 'vitest';

import { buildMemberMarkSyncPlan } from './dbSyncPlan';

describe('buildMemberMarkSyncPlan', () => {
  it('identifies deleted dates and builds upsert rows', () => {
    expect(
      buildMemberMarkSyncPlan({
        existingDates: ['2026-03-13', '2026-03-20'],
        marks: [{ date: '2026-03-20', score: 8 }],
        memberId: 'member-1',
        createdBy: 'user-1',
        section: 'company',
      }),
    ).toEqual({
      datesToDelete: ['2026-03-13'],
      markRows: [
        {
          member_id: 'member-1',
          created_by: 'user-1',
          date: '2026-03-20',
          section: 'company',
          score: 8,
          uniform_score: null,
          behaviour_score: null,
          present: true,
        },
      ],
    });
  });

  it('maps absent marks correctly for junior rows', () => {
    expect(
      buildMemberMarkSyncPlan({
        existingDates: [],
        marks: [{ date: '2026-03-20', score: -1 }],
        memberId: 'member-1',
        createdBy: 'user-1',
        section: 'junior',
      }),
    ).toEqual({
      datesToDelete: [],
      markRows: [
        {
          member_id: 'member-1',
          created_by: 'user-1',
          date: '2026-03-20',
          section: 'junior',
          score: null,
          uniform_score: null,
          behaviour_score: null,
          present: false,
        },
      ],
    });
  });

  it('returns an empty upsert payload when there are no marks left', () => {
    expect(
      buildMemberMarkSyncPlan({
        existingDates: ['2026-03-20'],
        marks: [],
        memberId: 'member-1',
        createdBy: 'user-1',
        section: 'company',
      }),
    ).toEqual({
      datesToDelete: ['2026-03-20'],
      markRows: [],
    });
  });
});
