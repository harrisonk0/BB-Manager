// Used ONLY by the dedicated audit Vite config. Never imported by the app entry.
import { boys, events, summary } from './fixtures';

const params = new URLSearchParams(location.search);
const empty = params.get('state') === 'empty';
const error = params.get('state') === 'error';
const loading = params.get('state') === 'loading';
const user = { id: 'fixture-user', email: 'staff@example.invalid' };
const blocked = async () => ({ data: null, error: new Error('Audit fixture: mutations and authentication are disabled.') });
const members = boys.map(boy => ({
  id: boy.id, name: boy.name, squad: boy.squad,
  section: params.get('section') || 'company',
  school_year: params.get('section') === 'junior' ? 'P5' : String(boy.year),
  is_squad_leader: boy.isSquadLeader, source_member_id: boy.id,
}));
const marks = boys.flatMap(boy => boy.marks.map((mark, i) => ({
  id: `${boy.id}-${i}`, member_id: boy.id, source_member_id: boy.id,
  date: mark.date, score: mark.score, uniform_score: mark.uniformScore,
  behaviour_score: mark.behaviourScore, present: mark.score >= 0,
  section: params.get('section') || 'company',
})));

type Row = Record<string, unknown>;
const rows: Record<string, Row[]> = {
  members, marks, archived_members: members, archived_marks: marks,
  bb_sessions: [{
    id: 'fixture-session', label: '2025/26', closed_at: '2026-08-01T12:00:00Z',
    closed_by_email: 'staff@example.invalid', member_count: 6, mark_count: 18,
  }],
  settings: [{ section: 'company', meeting_day: 5, squads: [1, 2, 3].map(number => ({ number, label: null })) }],
  company_events: events,
  company_calendar_settings: [],
  portal_accounts: [{
    member_id: boys[0].id, user_id: user.id, username: 'alex.example',
    activated_at: '2026-10-01T12:00:00Z', created_at: '2026-10-01T12:00:00Z',
  }],
};

// Minimal thenable query surface for the existing read services, not a Supabase emulator.
function table(name: string) {
  let single = false;
  const filters: [string, unknown][] = [];
  const query = {
    select: () => query,
    order: () => query,
    gt: () => query,
    limit: () => query,
    eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
    in: () => query,
    single: () => { single = true; return query; },
    maybeSingle: () => { single = true; return query; },
    insert: blocked, update: blocked, upsert: blocked, delete: blocked,
    then: (resolve: (result: unknown) => void) => {
      if (loading) return new Promise(() => {});
      const data = (empty ? [] : rows[name] || []).filter(row =>
        filters.every(([key, value]) => row[key] === undefined || row[key] === value)
      );
      return Promise.resolve({
        data: single ? data[0] ?? null : data,
        error: error ? { message: 'Synthetic connection error. Try again.' } : null,
      }).then(resolve);
    },
  };
  return query;
}

export const supabase = {
  from: table,
  rpc: async (name: string) => name === 'company_portal_summary' ? {
    data: { ...summary, ...(empty ? { marks: [], teammates: [], squadMembers: [], total: 0, attended: 0, recorded: 0 } : {}) },
    error: error ? { message: 'Synthetic connection error.' } : null,
  } : blocked(),
  functions: { invoke: blocked },
  auth: {
    getUser: async () => ({ data: { user }, error: null }),
    getSession: async () => ({ data: { session: { user } }, error: null }),
    passkey: { list: async () => ({ data: [], error: null }), update: blocked, delete: blocked },
    signInWithPassword: blocked, signInWithPasskey: blocked, registerPasskey: blocked,
    signOut: blocked, resetPasswordForEmail: blocked, updateUser: blocked,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
};
