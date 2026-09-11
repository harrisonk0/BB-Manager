import { describe, expect, it } from 'vitest';

import {
  getDefaultClosedSessionLabel,
  mapArchivedBoys,
  NEW_SESSION_CONFIRMATION_PHRASE,
} from './sessionArchiveModel';

describe('sessionArchiveModel', () => {
  it('defaults the closed session label to the BB year ending this calendar year', () => {
    expect(getDefaultClosedSessionLabel(new Date('2026-09-11T12:00:00'))).toBe('2025/26');
    expect(getDefaultClosedSessionLabel(new Date('2027-03-01T12:00:00'))).toBe('2026/27');
  });

  it('requires an explicit confirmation phrase to start a new session', () => {
    expect(NEW_SESSION_CONFIRMATION_PHRASE).toBe('START NEW SESSION');
  });

  it('maps archived member and mark rows onto the live Boy model', () => {
    const boys = mapArchivedBoys(
      [
        {
          id: 'archive-member-1',
          session_id: 'session-1',
          source_member_id: 'live-member-1',
          name: 'Archive Alpha',
          squad: 2,
          section: 'company',
          school_year: '11',
          is_squad_leader: true,
        },
      ],
      [
        {
          id: 'archive-mark-1',
          session_id: 'session-1',
          source_member_id: 'live-member-1',
          section: 'company',
          date: '2026-01-09',
          score: 8,
          uniform_score: null,
          behaviour_score: null,
          present: true,
        },
        {
          id: 'archive-mark-2',
          session_id: 'session-1',
          source_member_id: 'live-member-1',
          section: 'company',
          date: '2026-01-16',
          score: null,
          uniform_score: null,
          behaviour_score: null,
          present: false,
        },
      ],
    );

    expect(boys).toEqual([
      {
        id: 'archive-member-1',
        name: 'Archive Alpha',
        squad: 2,
        year: 11,
        isSquadLeader: true,
        marks: [
          { date: '2026-01-09', score: 8 },
          { date: '2026-01-16', score: -1 },
        ],
      },
    ]);
  });
});
