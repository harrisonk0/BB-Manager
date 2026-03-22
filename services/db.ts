import { Boy, Mark, Section, WeeklyMarksSnapshotEntry } from '../types';
import { supabase } from './supabaseClient';
import * as supabaseAuth from './supabaseAuth';
import {
  mapBoyRow,
  MarkRow,
  MemberRow,
  toStoredMark,
  validateBoyMarks,
  validateMarksForSection,
} from './dbModel';

export type WeeklyMarksSaveEntry = WeeklyMarksSnapshotEntry;

type StoredMarkPatchRow = ReturnType<typeof toStoredMark>;

const storedMarksMatch = (left: StoredMarkPatchRow, right: StoredMarkPatchRow) =>
  left.date === right.date &&
  left.section === right.section &&
  left.score === right.score &&
  left.uniform_score === right.uniform_score &&
  left.behaviour_score === right.behaviour_score &&
  left.present === right.present;

const buildMemberMarksPatch = ({
  originalMarks,
  nextMarks,
  section,
}: {
  originalMarks: Mark[];
  nextMarks: Mark[];
  section: Section;
}) => {
  const nextMarksByDate = new Map(nextMarks.map((mark) => [mark.date, mark]));
  const originalMarksByDate = new Map(originalMarks.map((mark) => [mark.date, mark]));

  const deleteDates = originalMarks
    .filter((mark) => !nextMarksByDate.has(mark.date))
    .map((mark) => mark.date);

  const upsertRows = nextMarks.reduce<StoredMarkPatchRow[]>((rows, mark) => {
    const nextStored = toStoredMark(mark, section);
    const originalMark = originalMarksByDate.get(mark.date);

    if (!originalMark) {
      rows.push(nextStored);
      return rows;
    }

    const originalStored = toStoredMark(originalMark, section);

    if (!storedMarksMatch(originalStored, nextStored)) {
      rows.push(nextStored);
    }

    return rows;
  }, []);

  return { deleteDates, upsertRows };
};

export const saveBoyMarks = async (
  memberId: string,
  section: Section,
  originalMarks: Mark[],
  nextMarks: Mark[],
): Promise<void> => {
  if (!memberId) throw new Error('Member ID is required.');
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  validateMarksForSection(nextMarks, section, 'Member');

  const { deleteDates, upsertRows } = buildMemberMarksPatch({
    originalMarks,
    nextMarks,
    section,
  });

  if (deleteDates.length === 0 && upsertRows.length === 0) {
    return;
  }

  const { error } = await supabase.rpc('save_member_marks_patch', {
    p_member_id: memberId,
    p_section: section,
    p_delete_dates: deleteDates,
    p_upsert_rows: upsertRows,
  });

  if (error) {
    throw new Error(error.message || 'Failed to save member marks.');
  }
};

export const saveWeeklyMarksSnapshot = async (
  section: Section,
  selectedDate: string,
  snapshot: WeeklyMarksSnapshotEntry[],
): Promise<void> => {
  if (snapshot.length === 0) {
    return;
  }
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  validateMarksForSection(
    snapshot.flatMap(({ mark }) => (mark ? [mark] : [])),
    section,
    'Member',
  );

  const { error } = await supabase.rpc('save_weekly_marks_snapshot', {
    p_section: section,
    p_meeting_date: selectedDate,
    p_snapshot: snapshot.map(({ memberId, mark }) => ({
      memberId,
      mark: mark
        ? (() => {
            const { date: _date, ...storedMark } = toStoredMark(mark, section);
            return storedMark;
          })()
        : null,
    })),
  });

  if (error) {
    throw new Error(error.message || 'Failed to save weekly marks.');
  }
};

export const saveWeeklyMarksForSection = saveWeeklyMarksSnapshot;

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

  if (boy.marks.length === 0) {
    return mapBoyRow(data as MemberRow, []);
  }

  await saveBoyMarks(data.id, section, [], boy.marks);

  const savedBoy = await fetchBoyById(data.id, section);
  if (!savedBoy) {
    throw new Error('Failed to reload created boy.');
  }

  return savedBoy;
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
  if (!boy.id) throw new Error('Boy ID is required.');

  const { error } = await supabase
    .from('members')
    .update({
      name: boy.name,
      school_year: String(boy.year),
      section,
      squad: boy.squad,
      is_squad_leader: boy.isSquadLeader ?? false,
    })
    .eq('id', boy.id)
    .eq('section', section);

  if (error) {
    throw new Error(error.message || 'Failed to update boy');
  }

  const updatedBoy = await fetchBoyById(boy.id, section);
  if (!updatedBoy) {
    throw new Error('Failed to reload updated boy.');
  }

  return updatedBoy;
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .eq('section', section);

  if (error) {
    throw new Error(error.message || 'Failed to delete boy');
  }
};
