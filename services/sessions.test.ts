import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => {
  let rpcResponse: { data: unknown; error: { message?: string } | null } = { data: null, error: null };
  let sessionsSelectResponse: { data: unknown[]; error: { message?: string } | null } = { data: [], error: null };
  let archivedMembersResponse: { data: unknown[]; error: { message?: string } | null } = { data: [], error: null };
  let archivedMarksResponse: { data: unknown[]; error: { message?: string } | null } = { data: [], error: null };

  const rpc = vi.fn(() => Promise.resolve(rpcResponse));

  const sessionOrder = vi.fn(() => Promise.resolve(sessionsSelectResponse));
  const sessionSelect = vi.fn(() => ({ order: sessionOrder }));

  const archivedMemberOrder = vi.fn(() => Promise.resolve(archivedMembersResponse));
  const archivedMemberEqSection = vi.fn(() => ({ order: archivedMemberOrder }));
  const archivedMemberEqSession = vi.fn(() => ({
    eq: archivedMemberEqSection,
    order: archivedMemberOrder,
  }));
  const archivedMemberSelect = vi.fn(() => ({ eq: archivedMemberEqSession }));

  const archivedMarkEqSection = vi.fn(() => Promise.resolve(archivedMarksResponse));
  const archivedMarkEqSession = vi.fn(() => ({ eq: archivedMarkEqSection }));
  const archivedMarkSelect = vi.fn(() => ({ eq: archivedMarkEqSession }));

  const from = vi.fn((table: string) => {
    if (table === 'bb_sessions') {
      return { select: sessionSelect };
    }
    if (table === 'archived_members') {
      return { select: archivedMemberSelect };
    }
    if (table === 'archived_marks') {
      return { select: archivedMarkSelect };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    rpc,
    get rpcResponse() {
      return rpcResponse;
    },
    set rpcResponse(next: typeof rpcResponse) {
      rpcResponse = next;
    },
    get sessionsSelectResponse() {
      return sessionsSelectResponse;
    },
    set sessionsSelectResponse(next: typeof sessionsSelectResponse) {
      sessionsSelectResponse = next;
    },
    get archivedMembersResponse() {
      return archivedMembersResponse;
    },
    set archivedMembersResponse(next: typeof archivedMembersResponse) {
      archivedMembersResponse = next;
    },
    get archivedMarksResponse() {
      return archivedMarksResponse;
    },
    set archivedMarksResponse(next: typeof archivedMarksResponse) {
      archivedMarksResponse = next;
    },
  };
});

vi.mock('./supabaseAuth', () => authMock);
vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchArchivedBoys, fetchArchivedMemberSnapshots, listBbSessions, startNewBbSession } from './sessions';

describe('sessions service', () => {
  beforeEach(() => {
    authMock.getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'captain@example.com' });
    supabaseMock.rpcResponse = { data: null, error: null };
    supabaseMock.sessionsSelectResponse = { data: [], error: null };
    supabaseMock.archivedMembersResponse = { data: [], error: null };
    supabaseMock.archivedMarksResponse = { data: [], error: null };
    vi.clearAllMocks();
    authMock.getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'captain@example.com' });
  });

  it('maps listed bb_sessions rows into UI session records', async () => {
    supabaseMock.sessionsSelectResponse = {
      data: [
        {
          id: 'session-1',
          label: '2025/26',
          closed_at: '2026-09-11T12:00:00.000Z',
          closed_by_email: 'captain@example.com',
          member_count: 14,
          mark_count: 80,
        },
      ],
      error: null,
    };

    await expect(listBbSessions()).resolves.toEqual([
      {
        id: 'session-1',
        label: '2025/26',
        closedAt: '2026-09-11T12:00:00.000Z',
        closedByEmail: 'captain@example.com',
        memberCount: 14,
        markCount: 80,
      },
    ]);
  });

  it('starts a new session through the RPC and returns counts', async () => {
    supabaseMock.rpcResponse = {
      data: {
        id: 'session-2',
        label: '2025/26',
        member_count: 12,
        mark_count: 40,
        closed_at: '2026-09-11T12:00:00.000Z',
      },
      error: null,
    };

    await expect(startNewBbSession(' 2025/26 ')).resolves.toEqual({
      id: 'session-2',
      label: '2025/26',
      memberCount: 12,
      markCount: 40,
      closedAt: '2026-09-11T12:00:00.000Z',
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith('start_new_bb_session', { p_label: '2025/26' });
  });

  it('rejects a blank session label before calling the RPC', async () => {
    await expect(startNewBbSession('   ')).rejects.toThrow('Session label is required.');
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('loads archived boys for one session and section', async () => {
    supabaseMock.archivedMembersResponse = {
      data: [
        {
          id: 'archive-member-1',
          session_id: 'session-1',
          source_member_id: 'live-member-1',
          name: 'Archive Alpha',
          squad: 1,
          section: 'company',
          school_year: '10',
          is_squad_leader: false,
        },
      ],
      error: null,
    };
    supabaseMock.archivedMarksResponse = { data: [], error: null };

    await expect(fetchArchivedBoys('session-1', 'company')).resolves.toEqual([
      {
        id: 'archive-member-1',
        name: 'Archive Alpha',
        squad: 1,
        year: 10,
        isSquadLeader: false,
        marks: [],
        importedFromArchivedMemberId: null,
      },
    ]);
  });

  it('loads archived member snapshots for import without marks', async () => {
    supabaseMock.archivedMembersResponse = {
      data: [
        {
          id: 'archive-member-1',
          name: 'Archive Alpha',
          squad: 1,
          section: 'company',
          school_year: '10',
          is_squad_leader: false,
        },
      ],
      error: null,
    };

    await expect(fetchArchivedMemberSnapshots('session-1')).resolves.toEqual([
      {
        id: 'archive-member-1',
        name: 'Archive Alpha',
        squad: 1,
        section: 'company',
        year: 10,
        isSquadLeader: false,
      },
    ]);
  });
});
