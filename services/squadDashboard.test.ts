import { describe, expect, it } from 'vitest';
import type { PortalSquadMember } from '../types/portal';
import { buildSquadDashboard } from './squadDashboard';

const member = (id: string, scores: [string, number][]): PortalSquadMember => ({
  id,
  name: id,
  isSquadLeader: false,
  marks: scores.map(([date, score]) => ({ date, score })),
});

describe('Squad leader dashboard', () => {
  it('counts zero marks as present and excludes missing records from attendance', () => {
    const dashboard = buildSquadDashboard([
      member('Alex', [
        ['2026-10-01', 0],
        ['2026-10-08', 5],
      ]),
      member('Ben', [['2026-10-01', -1]]),
      member('Chris', []),
    ]);
    expect(dashboard.overall).toEqual({
      total: 5,
      attended: 2,
      recorded: 3,
      attendance: 67,
      averageMarks: 2.5,
    });
    expect(dashboard.weeks).toEqual([
      {
        date: '2026-10-08',
        total: 5,
        attended: 1,
        recorded: 1,
        attendance: 100,
        averageMarks: 5,
      },
      {
        date: '2026-10-01',
        total: 0,
        attended: 1,
        recorded: 2,
        attendance: 50,
        averageMarks: 0,
      },
    ]);
    expect(dashboard.members.find((m) => m.id === 'Ben')).toMatchObject({
      attendance: 0,
      rank: 2,
    });
    expect(dashboard.members.find((m) => m.id === 'Chris')).toMatchObject({
      attendance: null,
      rank: null,
    });
  });

  it('shares ranks for tied totals and skips the next position', () => {
    const dashboard = buildSquadDashboard([
      member('Ben', [['2026-10-08', 10]]),
      member('Alex', [['2026-10-01', 10]]),
      member('Chris', [['2026-10-08', 5]]),
    ]);
    expect(dashboard.members.map(({ name, rank }) => [name, rank])).toEqual([
      ['Alex', 1],
      ['Ben', 1],
      ['Chris', 3],
    ]);
  });

  it('keeps absent-only nights with zero attendance and no average present score', () => {
    const dashboard = buildSquadDashboard([
      member('Alex', [['2026-10-01', -1]]),
    ]);
    expect(dashboard.weeks[0]).toMatchObject({
      total: 0,
      attendance: 0,
      averageMarks: null,
    });
  });

  it('handles an empty squad and a squad with no marks', () => {
    expect(buildSquadDashboard([])).toMatchObject({
      members: [],
      weeks: [],
      overall: { attendance: null },
    });
    const members = [member('Alex', [])];
    expect(buildSquadDashboard(members)).toMatchObject({
      weeks: [],
      overall: { total: 0, recorded: 0 },
    });
    expect(members[0].marks).toEqual([]);
  });
});
