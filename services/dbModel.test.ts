import { describe, expect, it } from 'vitest';

import { mapBoyRow, mapMarkRow, parseSchoolYear, toStoredMark, validateBoyMarks } from './dbModel';
import type { Boy } from '../types';

describe('dbModel', () => {
  it('parses company school years as numbers', () => {
    expect(parseSchoolYear('company', '12')).toBe(12);
    expect(parseSchoolYear('junior', 'P6')).toBe('P6');
  });

  it('stores absent marks as null scores with present false', () => {
    expect(toStoredMark({ date: '2026-03-20', score: -1 }, 'company')).toEqual({
      date: '2026-03-20',
      section: 'company',
      score: null,
      uniform_score: null,
      behaviour_score: null,
      present: false,
    });
  });

  it('maps stored rows back into junior marks', () => {
    expect(mapMarkRow({
      id: 'mark-1',
      member_id: 'member-1',
      section: 'junior',
      date: '2026-03-20',
      score: 8,
      uniform_score: 5,
      behaviour_score: 3,
      present: true,
    })).toEqual({
      date: '2026-03-20',
      score: 8,
      uniformScore: 5,
      behaviourScore: 3,
    });
  });

  it('sorts mapped marks by date and normalizes the member shape', () => {
    const boy = mapBoyRow(
      {
        id: 'member-1',
        name: 'Alex',
        squad: 2,
        section: 'company',
        school_year: '10',
        is_squad_leader: null,
      },
      [
        {
          id: 'mark-2',
          member_id: 'member-1',
          section: 'company',
          date: '2026-03-21',
          score: 7,
          uniform_score: null,
          behaviour_score: null,
          present: true,
        },
        {
          id: 'mark-1',
          member_id: 'member-1',
          section: 'company',
          date: '2026-03-14',
          score: 9,
          uniform_score: null,
          behaviour_score: null,
          present: true,
        },
      ],
    );

    expect(boy.year).toBe(10);
    expect(boy.isSquadLeader).toBe(false);
    expect(boy.marks.map((mark) => mark.date)).toEqual(['2026-03-14', '2026-03-21']);
  });

  it('accepts valid junior marks', () => {
    const boy: Boy = {
      id: 'member-1',
      name: 'Ben',
      squad: 1,
      year: 'P7',
      marks: [{ date: '2026-03-20', score: 7.5, uniformScore: 5, behaviourScore: 2.5 }],
      isSquadLeader: false,
    };

    expect(() => validateBoyMarks(boy, 'junior')).not.toThrow();
  });

  it('rejects company marks with junior-only fields', () => {
    const boy: Boy = {
      id: 'member-1',
      name: 'Chris',
      squad: 1,
      year: 10,
      marks: [{ date: '2026-03-20', score: 8, uniformScore: 4 }],
      isSquadLeader: false,
    };

    expect(() => validateBoyMarks(boy, 'company')).toThrow(/junior-specific scores/i);
  });

  it('rejects junior totals that do not match their parts', () => {
    const boy: Boy = {
      id: 'member-1',
      name: 'Dylan',
      squad: 2,
      year: 'P6',
      marks: [{ date: '2026-03-20', score: 9, uniformScore: 5, behaviourScore: 3 }],
      isSquadLeader: false,
    };

    expect(() => validateBoyMarks(boy, 'junior')).toThrow(/does not match sum/i);
  });

  it('rejects duplicate mark dates', () => {
    const boy: Boy = {
      id: 'member-1',
      name: 'Euan',
      squad: 2,
      year: 10,
      marks: [
        { date: '2026-03-20', score: 8 },
        { date: '2026-03-20', score: 7 },
      ],
      isSquadLeader: false,
    };

    expect(() => validateBoyMarks(boy, 'company')).toThrow(/duplicate mark date/i);
  });
});
