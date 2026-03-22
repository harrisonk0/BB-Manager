import { describe, expect, it } from 'vitest';

import { buildSessionReportData, getSectionDateRange } from './sessionReport';
import type { Boy } from '../../types';

const companyBoys: Boy[] = [
  {
    id: 'member-1',
    name: 'Aaron',
    squad: 1,
    year: 12,
    isSquadLeader: true,
    marks: [
      { date: '2026-01-09', score: 8 },
      { date: '2026-01-16', score: -1 },
      { date: '2026-02-06', score: 9.5 },
    ],
  },
  {
    id: 'member-2',
    name: 'Ben',
    squad: 1,
    year: 11,
    isSquadLeader: false,
    marks: [
      { date: '2026-01-09', score: 7 },
      { date: '2026-01-16', score: 6 },
      { date: '2026-02-06', score: 7.5 },
    ],
  },
  {
    id: 'member-3',
    name: 'Callum',
    squad: 2,
    year: 10,
    isSquadLeader: false,
    marks: [
      { date: '2026-01-09', score: -1 },
      { date: '2026-01-16', score: 8 },
    ],
  },
];

describe('sessionReport', () => {
  it('derives the section date range from all member marks', () => {
    expect(getSectionDateRange(companyBoys)).toEqual({
      startDate: '2026-01-09',
      endDate: '2026-02-06',
    });
  });

  it('returns null when there are no marks to report', () => {
    expect(getSectionDateRange([])).toBeNull();
    expect(
      getSectionDateRange([
        {
          id: 'member-empty',
          name: 'No Marks',
          squad: 1,
          year: 10,
          isSquadLeader: false,
          marks: [],
        },
      ]),
    ).toBeNull();
  });

  it('builds section, squad, meeting, and top-member summaries', () => {
    const report = buildSessionReportData({
      boys: companyBoys,
      section: 'company',
      range: {
        startDate: '2026-01-01',
        endDate: '2026-02-28',
      },
      now: new Date('2026-03-22T10:00:00Z'),
    });

    expect(report.headlineStats).toEqual({
      memberCount: 3,
      meetingCount: 3,
      attendanceCount: 6,
      absenceCount: 2,
      attendanceRate: 75,
      totalMarks: 46,
      averageMarksWhenPresent: 7.67,
    });
    expect(report.topMembers[0]).toMatchObject({
      name: 'Ben',
      totalMarks: 20.5,
    });
    expect(report.squads).toHaveLength(2);
    expect(report.squads[0]).toMatchObject({
      squad: '1',
      memberCount: 2,
      attendanceRate: 83.33,
      totalMarks: 38,
    });
    expect(report.meetings[1]).toEqual({
      date: '2026-01-16',
      attendanceCount: 2,
      absenceCount: 1,
      attendanceRate: 66.67,
      totalMarks: 14,
      averageMarksWhenPresent: 7,
    });
    expect(report.months).toEqual([
      {
        month: '2026-01',
        attendanceCount: 4,
        absenceCount: 2,
        attendanceRate: 66.67,
        totalMarks: 29,
      },
      {
        month: '2026-02',
        attendanceCount: 2,
        absenceCount: 0,
        attendanceRate: 100,
        totalMarks: 17,
      },
    ]);
  });

  it('keeps junior uniform and behaviour totals in member summaries', () => {
    const report = buildSessionReportData({
      boys: [
        {
          id: 'junior-1',
          name: 'Daniel',
          squad: 3,
          year: 'P7',
          isSquadLeader: false,
          marks: [
            { date: '2026-03-01', score: 8, uniformScore: 5, behaviourScore: 3 },
            { date: '2026-03-08', score: 7, uniformScore: 4, behaviourScore: 3 },
          ],
        },
      ],
      section: 'junior',
      range: {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      },
    });

    expect(report.members[0]).toMatchObject({
      totalMarks: 15,
      uniformTotal: 9,
      behaviourTotal: 6,
      attendanceRate: 100,
    });
  });
});
