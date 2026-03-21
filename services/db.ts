import { Boy, Section, Mark } from '../types';
import { supabase } from './supabaseClient';
import * as supabaseAuth from './supabaseAuth';

type MemberRow = {
  id: string;
  name: string;
  squad: number;
  section: Section;
  school_year: string;
  is_squad_leader: boolean | null;
};

type MarkRow = {
  id: string;
  member_id: string;
  section: Section;
  date: string;
  score: number | null;
  uniform_score: number | null;
  behaviour_score: number | null;
  present: boolean | null;
};

const parseSchoolYear = (section: Section, schoolYear: string): Boy['year'] => {
  if (section === 'company' && /^\d+$/.test(schoolYear)) {
    return Number(schoolYear) as Boy['year'];
  }
  return schoolYear as Boy['year'];
};

const toStoredMark = (mark: Mark, section: Section) => {
  if (mark.score < 0) {
    return {
      date: mark.date,
      section,
      score: null,
      uniform_score: null,
      behaviour_score: null,
      present: false,
    };
  }

  return {
    date: mark.date,
    section,
    score: mark.score,
    uniform_score: section === 'junior' ? (mark.uniformScore ?? null) : null,
    behaviour_score: section === 'junior' ? (mark.behaviourScore ?? null) : null,
    present: true,
  };
};

const mapMarkRow = (row: MarkRow): Mark => {
  if (row.present === false || row.score === null) {
    return { date: row.date, score: -1 };
  }

  const mark: Mark = {
    date: row.date,
    score: Number(row.score),
  };

  if (row.uniform_score !== null) {
    mark.uniformScore = Number(row.uniform_score);
  }

  if (row.behaviour_score !== null) {
    mark.behaviourScore = Number(row.behaviour_score);
  }

  return mark;
};

const mapBoyRow = (member: MemberRow, marks: MarkRow[]): Boy => ({
  id: member.id,
  name: member.name,
  squad: member.squad as Boy['squad'],
  year: parseSchoolYear(member.section, member.school_year),
  marks: [...marks]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(mapMarkRow),
  isSquadLeader: member.is_squad_leader ?? false,
});

const validateBoyMarks = (boy: Boy, section: Section) => {
  if (!Array.isArray(boy.marks)) {
    throw new Error('Marks must be an array.');
  }

  const validateDecimalPlaces = (value: number, fieldName: string, date: string) => {
    if (value < 0) return;
    const valueString = value.toString();
    const decimalPart = valueString.split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      throw new Error(`${fieldName} for ${boy.name} on ${date} has more than 2 decimal places.`);
    }
  };

  for (const mark of boy.marks) {
    if (typeof mark.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(mark.date)) {
      throw new Error(`Invalid date format for mark: ${mark.date}`);
    }

    if (typeof mark.score !== 'number') {
      throw new Error(`Invalid score type for mark on ${mark.date}. Score must be a number.`);
    }

    if (mark.score === -1) {
      continue;
    }

    validateDecimalPlaces(mark.score, 'Total score', mark.date);

    if (section === 'company') {
      if (mark.score < 0 || mark.score > 10) {
        throw new Error(`Company section score for ${boy.name} on ${mark.date} is out of range (0-10).`);
      }
      if (mark.uniformScore !== undefined || mark.behaviourScore !== undefined) {
        throw new Error(`Company section boy ${boy.name} on ${mark.date} has junior-specific scores.`);
      }
    } else {
      if (typeof mark.uniformScore !== 'number' || mark.uniformScore < 0 || mark.uniformScore > 10) {
        throw new Error(`Junior section uniform score for ${boy.name} on ${mark.date} is invalid or out of range (0-10).`);
      }
      if (typeof mark.behaviourScore !== 'number' || mark.behaviourScore < 0 || mark.behaviourScore > 5) {
        throw new Error(`Junior section behaviour score for ${boy.name} on ${mark.date} is invalid or out of range (0-5).`);
      }
      validateDecimalPlaces(mark.uniformScore, 'Uniform score', mark.date);
      validateDecimalPlaces(mark.behaviourScore, 'Behaviour score', mark.date);
      const calculatedTotal = mark.uniformScore + mark.behaviourScore;
      if (Math.abs(mark.score - calculatedTotal) > 0.001) {
        throw new Error(`Junior section total score for ${boy.name} on ${mark.date} does not match sum of uniform and behaviour scores.`);
      }
    }
  }
};

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

  const existingDates = new Set((existingData || []).map((row) => row.date as string));
  const desiredDates = new Set(marks.map((mark) => mark.date));

  const datesToDelete = [...existingDates].filter((date) => !desiredDates.has(date));

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

  const markRows = marks.map((mark) => ({
    member_id: memberId,
    created_by: authUser.id,
    ...toStoredMark(mark, section),
  }));

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
