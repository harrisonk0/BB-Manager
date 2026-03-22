import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => {
  let rpcResponse: { error: { message?: string } | null } = { error: null };
  let insertSingleResponse: { data: unknown; error: { message?: string } | null } = {
    data: null,
    error: null,
  };
  let updateResponse: { error: { message?: string } | null } = { error: null };
  let deleteResponse: { error: { message?: string } | null } = { error: null };
  let memberSelectSingleResponse: { data: unknown; error: { code?: string; message?: string } | null } = {
    data: null,
    error: { code: 'PGRST116', message: 'No rows found' },
  };
  let marksSelectResponse: { data: unknown[]; error: { message?: string } | null } = {
    data: [],
    error: null,
  };

  const rpc = vi.fn(() => Promise.resolve(rpcResponse));

  const memberSelectSingle = vi.fn(() => Promise.resolve(memberSelectSingleResponse));
  const memberSelectEqSection = vi.fn(() => ({ single: memberSelectSingle }));
  const memberSelectEqId = vi.fn(() => ({ eq: memberSelectEqSection }));
  const memberSelect = vi.fn(() => ({ eq: memberSelectEqId }));

  const memberInsertSingle = vi.fn(() => Promise.resolve(insertSingleResponse));
  const memberInsertSelect = vi.fn(() => ({ single: memberInsertSingle }));
  const memberInsert = vi.fn(() => ({ select: memberInsertSelect }));

  const memberUpdateEqSection = vi.fn(() => Promise.resolve(updateResponse));
  const memberUpdateEqId = vi.fn(() => ({ eq: memberUpdateEqSection }));
  const memberUpdate = vi.fn(() => ({ eq: memberUpdateEqId }));

  const memberDeleteEqSection = vi.fn(() => Promise.resolve(deleteResponse));
  const memberDeleteEqId = vi.fn(() => ({ eq: memberDeleteEqSection }));
  const memberDelete = vi.fn(() => ({ eq: memberDeleteEqId }));

  const marksSelectEqSection = vi.fn(() => Promise.resolve(marksSelectResponse));
  const marksSelectEqMember = vi.fn(() => ({ eq: marksSelectEqSection }));
  const marksSelect = vi.fn(() => ({ eq: marksSelectEqMember }));

  const from = vi.fn((table: string) => {
    if (table === 'members') {
      return {
        select: memberSelect,
        insert: memberInsert,
        update: memberUpdate,
        delete: memberDelete,
      };
    }

    if (table === 'marks') {
      return { select: marksSelect };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    rpc,
    get rpcResponse() {
      return rpcResponse;
    },
    set rpcResponse(next) {
      rpcResponse = next;
    },
    get insertSingleResponse() {
      return insertSingleResponse;
    },
    set insertSingleResponse(next) {
      insertSingleResponse = next;
    },
    get updateResponse() {
      return updateResponse;
    },
    set updateResponse(next) {
      updateResponse = next;
    },
    get deleteResponse() {
      return deleteResponse;
    },
    set deleteResponse(next) {
      deleteResponse = next;
    },
    get memberSelectSingleResponse() {
      return memberSelectSingleResponse;
    },
    set memberSelectSingleResponse(next) {
      memberSelectSingleResponse = next;
    },
    get marksSelectResponse() {
      return marksSelectResponse;
    },
    set marksSelectResponse(next) {
      marksSelectResponse = next;
    },
  };
});

vi.mock('./supabaseAuth', () => ({
  getCurrentUser: authMock.getCurrentUser,
}));

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: supabaseMock.from,
    rpc: supabaseMock.rpc,
  },
}));

import {
  deleteBoyById,
  saveBoyMarks,
  saveWeeklyMarksSnapshot,
  updateBoy,
} from './db';

describe('db service write model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getCurrentUser.mockResolvedValue({ id: 'user-1', email: 'captain@example.com' });
    supabaseMock.rpcResponse = { error: null };
    supabaseMock.insertSingleResponse = { data: null, error: null };
    supabaseMock.updateResponse = { error: null };
    supabaseMock.deleteResponse = { error: null };
    supabaseMock.memberSelectSingleResponse = { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
    supabaseMock.marksSelectResponse = { data: [], error: null };
  });

  it('sends a transactional member mark patch to the live patch RPC', async () => {
    await expect(
      saveBoyMarks(
        'member-1',
        'company',
        [
          { date: '2026-03-13', score: 8 },
          { date: '2026-03-20', score: 9 },
        ],
        [{ date: '2026-03-20', score: 7 }],
      ),
    ).resolves.toBeUndefined();

    expect(supabaseMock.rpc).toHaveBeenCalledWith('save_member_marks_patch', {
      p_member_id: 'member-1',
      p_section: 'company',
      p_delete_dates: ['2026-03-13'],
      p_upsert_rows: [
        {
          date: '2026-03-20',
          section: 'company',
          score: 7,
          uniform_score: null,
          behaviour_score: null,
          present: true,
        },
      ],
    });
  });

  it('skips the patch RPC when the member marks do not change', async () => {
    await expect(
      saveBoyMarks(
        'member-1',
        'junior',
        [{ date: '2026-03-20', score: 7.5, uniformScore: 5, behaviourScore: 2.5 }],
        [{ date: '2026-03-20', score: 7.5, uniformScore: 5, behaviourScore: 2.5 }],
      ),
    ).resolves.toBeUndefined();

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('sends the whole selected-date snapshot to the live snapshot RPC', async () => {
    await expect(
      saveWeeklyMarksSnapshot('company', '2026-03-20', [
        { memberId: 'member-1', mark: { date: '2026-03-20', score: 7 } },
        { memberId: 'member-2', mark: null },
      ]),
    ).resolves.toBeUndefined();

    expect(supabaseMock.rpc).toHaveBeenCalledWith('save_weekly_marks_snapshot', {
      p_section: 'company',
      p_meeting_date: '2026-03-20',
      p_snapshot: [
        {
          memberId: 'member-1',
          mark: {
            section: 'company',
            score: 7,
            uniform_score: null,
            behaviour_score: null,
            present: true,
          },
        },
        {
          memberId: 'member-2',
          mark: null,
        },
      ],
    });
  });

  it('updates member fields without touching marks or validating mark payloads', async () => {
    supabaseMock.memberSelectSingleResponse = {
      data: {
        id: 'member-1',
        name: 'Alex',
        squad: 2,
        section: 'company',
        school_year: '10',
        is_squad_leader: false,
      },
      error: null,
    };
    supabaseMock.marksSelectResponse = { data: [], error: null };

    await expect(
      updateBoy(
        {
          id: 'member-1',
          name: 'Alex Updated',
          squad: 3,
          year: 11,
          marks: [{ date: '2026-03-20', score: 8, uniformScore: 4 }],
          isSquadLeader: true,
        },
        'company',
      ),
    ).resolves.toEqual({
      id: 'member-1',
      name: 'Alex',
      squad: 2,
      year: 10,
      marks: [],
      isSquadLeader: false,
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('members');
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(supabaseMock.from.mock.calls.filter(([table]) => table === 'marks')).toHaveLength(1);
  });

  it('deletes only the members row and relies on cascade for marks', async () => {
    await expect(deleteBoyById('member-1', 'junior')).resolves.toBeUndefined();

    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).toHaveBeenCalledWith('members');
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});
