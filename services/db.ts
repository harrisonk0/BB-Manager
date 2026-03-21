import { Boy, Section, Mark } from '../types';
import { supabase } from './supabaseClient';
import * as supabaseAuth from './supabaseAuth';
import {
  mapBoyRow,
  MarkRow,
  MemberRow,
  toStoredMark,
  validateBoyMarks,
} from './dbModel';
import { buildMemberMarkSyncPlan } from './dbSyncPlan';

const syncMemberMarks = async (memberId: string, section: Section, marks: Mark[]) => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const { data: existingData, error: existingError } = await supabase
    .from('marks')
    .select('date')
    .eq('member_id', memberId);

  if (existingError) {
    throw new Error(existingError.message || 'Failed to fetch existing marks.');
  }

  const { datesToDelete, markRows } = buildMemberMarkSyncPlan({
    existingDates: (existingData || []).map((row) => row.date as string),
    marks,
    memberId,
    createdBy: authUser.id,
    section,
  });

  if (datesToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('marks')
      .delete()
      .eq('member_id', memberId)
      .in('date', datesToDelete);

    if (deleteError) {
      throw new Error(deleteError.message || 'Failed to remove deleted marks.');
    }
  }

  if (marks.length === 0) {
    return;
  }

  const { error: upsertError } = await supabase
    .from('marks')
    .upsert(markRows, { onConflict: 'member_id,date' });

  if (upsertError) {
    throw new Error(upsertError.message || 'Failed to save marks.');
  }
};

export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section): Promise<Boy> => {
  validateBoyMarks(boy as Boy, section);
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('members')
    .insert([
      {
        name: boy.name,
        squad: boy.squad,
        school_year: String(boy.year),
        is_squad_leader: boy.isSquadLeader ?? false,
        section,
      },
    ])
    .select('id,name,squad,section,school_year,is_squad_leader')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create boy');
  }

  if (boy.marks.length > 0) {
    await syncMemberMarks(data.id, section, boy.marks);
  }

  return mapBoyRow(data as MemberRow, boy.marks.map((mark, index) => ({
    id: `${index}`,
    member_id: data.id,
    ...toStoredMark(mark, section),
  })) as MarkRow[]);
};

export const fetchBoys = async (section: Section): Promise<Boy[]> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) return [];

  const [{ data: members, error: membersError }, { data: marks, error: marksError }] = await Promise.all([
    supabase
      .from('members')
      .select('id,name,squad,section,school_year,is_squad_leader')
      .eq('section', section)
      .order('name'),
    supabase
      .from('marks')
      .select('id,member_id,section,date,score,uniform_score,behaviour_score,present')
      .eq('section', section),
  ]);

  if (membersError || !members) {
    throw new Error(membersError?.message || 'Failed to fetch boys');
  }

  if (marksError) {
    throw new Error(marksError.message || 'Failed to fetch marks');
  }

  const marksByMember = new Map<string, MarkRow[]>();
  for (const row of (marks || []) as MarkRow[]) {
    const existing = marksByMember.get(row.member_id) || [];
    existing.push(row);
    marksByMember.set(row.member_id, existing);
  }

  return (members as MemberRow[]).map((member) =>
    mapBoyRow(member, marksByMember.get(member.id) || []),
  );
};

export const fetchBoyById = async (id: string, section: Section): Promise<Boy | undefined> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const [{ data: member, error: memberError }, { data: marks, error: marksError }] = await Promise.all([
    supabase
      .from('members')
      .select('id,name,squad,section,school_year,is_squad_leader')
      .eq('id', id)
      .eq('section', section)
      .single(),
    supabase
      .from('marks')
      .select('id,member_id,section,date,score,uniform_score,behaviour_score,present')
      .eq('member_id', id)
      .eq('section', section),
  ]);

  if (memberError) {
    if (memberError.code === 'PGRST116') return undefined;
    throw new Error(memberError.message || 'Failed to fetch boy');
  }

  if (marksError) {
    throw new Error(marksError.message || 'Failed to fetch boy marks');
  }

  if (!member) return undefined;

  return mapBoyRow(member as MemberRow, (marks || []) as MarkRow[]);
};

export const updateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
  validateBoyMarks(boy, section);
  const { id, ...boyData } = boy;
  if (!id) throw new Error('Boy ID is required.');

  const { error } = await supabase
    .from('members')
    .update({
      name: boyData.name,
      school_year: String(boyData.year),
      section,
      squad: boyData.squad,
      is_squad_leader: boyData.isSquadLeader ?? false,
    })
    .eq('id', id)
    .eq('section', section);

  if (error) {
    throw new Error(error.message || 'Failed to update boy');
  }

  await syncMemberMarks(id, section, boyData.marks);

  const updatedBoy = await fetchBoyById(id, section);
  if (!updatedBoy) {
    throw new Error('Failed to reload updated boy.');
  }

  return updatedBoy;
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
  const { error: marksError } = await supabase
    .from('marks')
    .delete()
    .eq('member_id', id)
    .eq('section', section);

  if (marksError) {
    throw new Error(marksError.message || 'Failed to delete member marks');
  }

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .eq('section', section);

  if (error) {
    throw new Error(error.message || 'Failed to delete boy');
  }
};
