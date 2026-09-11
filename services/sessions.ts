import { Boy, Section } from '../types';
import { supabase } from './supabaseClient';
import * as supabaseAuth from './supabaseAuth';
import { parseSchoolYear } from './dbModel';
import {
  ArchivedMarkRow,
  ArchivedMemberRow,
  mapArchivedBoys,
} from './sessionArchiveModel';
import type { ArchivedMemberSnapshot } from './importFromSession';

export type BbSession = {
  id: string;
  label: string;
  closedAt: string;
  closedByEmail: string | null;
  memberCount: number;
  markCount: number;
};

export type StartNewBbSessionResult = {
  id: string;
  label: string;
  memberCount: number;
  markCount: number;
  closedAt: string;
};

type BbSessionRow = {
  id: string;
  label: string;
  closed_at: string;
  closed_by_email: string | null;
  member_count: number;
  mark_count: number;
};

type StartNewBbSessionRpcRow = {
  id: string;
  label: string;
  member_count: number;
  mark_count: number;
  closed_at: string;
};

const mapSessionRow = (row: BbSessionRow): BbSession => ({
  id: row.id,
  label: row.label,
  closedAt: row.closed_at,
  closedByEmail: row.closed_by_email,
  memberCount: row.member_count,
  markCount: row.mark_count,
});

const parseStartResult = (data: unknown): StartNewBbSessionResult => {
  const row = (Array.isArray(data) ? data[0] : data) as StartNewBbSessionRpcRow | null;
  if (!row?.id) {
    throw new Error('Failed to start a new BB session.');
  }

  return {
    id: row.id,
    label: row.label,
    memberCount: row.member_count,
    markCount: row.mark_count,
    closedAt: row.closed_at,
  };
};

export const listBbSessions = async (): Promise<BbSession[]> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) return [];

  const { data, error } = await supabase
    .from('bb_sessions')
    .select('id,label,closed_at,closed_by_email,member_count,mark_count')
    .order('closed_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to load past sessions.');
  }

  return ((data || []) as BbSessionRow[]).map(mapSessionRow);
};

export const fetchArchivedBoys = async (sessionId: string, section: Section): Promise<Boy[]> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const [{ data: members, error: membersError }, { data: marks, error: marksError }] = await Promise.all([
    supabase
      .from('archived_members')
      .select('id,session_id,source_member_id,name,squad,section,school_year,is_squad_leader')
      .eq('session_id', sessionId)
      .eq('section', section)
      .order('name'),
    supabase
      .from('archived_marks')
      .select('id,session_id,source_member_id,section,date,score,uniform_score,behaviour_score,present')
      .eq('session_id', sessionId)
      .eq('section', section),
  ]);

  if (membersError || !members) {
    throw new Error(membersError?.message || 'Failed to load archived members.');
  }

  if (marksError) {
    throw new Error(marksError.message || 'Failed to load archived marks.');
  }

  return mapArchivedBoys(members as ArchivedMemberRow[], (marks || []) as ArchivedMarkRow[]);
};

export const fetchArchivedMemberSnapshots = async (sessionId: string): Promise<ArchivedMemberSnapshot[]> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('archived_members')
    .select('id,name,squad,section,school_year,is_squad_leader')
    .eq('session_id', sessionId)
    .order('name');

  if (error || !data) {
    throw new Error(error?.message || 'Failed to load archived members.');
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    squad: row.squad,
    section: row.section as Section,
    year: parseSchoolYear(row.section as Section, row.school_year),
    isSquadLeader: row.is_squad_leader ?? false,
  }));
};

export const startNewBbSession = async (label: string): Promise<StartNewBbSessionResult> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Session label is required.');
  }

  const { data, error } = await supabase.rpc('start_new_bb_session', { p_label: trimmed });

  if (error) {
    throw new Error(error.message || 'Failed to start a new BB session.');
  }

  return parseStartResult(data);
};
