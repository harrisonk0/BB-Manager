import { Boy, Section, InviteCode, UserRole, Mark } from '../types';
import { supabase } from './supabaseClient';
import * as supabaseAuth from './supabaseAuth';
import { reportError } from './errorMonitoring';

type ProfileRow = {
  id: string;
  email: string | null;
  role: UserRole;
};

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

type InviteCodeRow = {
  id: string;
  code: string;
  role: UserRole;
  created_by: string | null;
  used_at: string | null;
  used_by: string | null;
  revoked_at: string | null;
  created_at: string | null;
  expires_at: string | null;
  section: Section | null;
};

type InviteCodeUpdateOptions = {
  signup?: boolean;
  callerRole?: UserRole | null;
};

const generateRandomCode = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters[randomBytes[i] % characters.length];
  }
  return result;
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

const normalizeInviteCodeOptions = (
  optionsOrRole: InviteCodeUpdateOptions | UserRole | null | undefined,
): InviteCodeUpdateOptions => {
  if (typeof optionsOrRole === 'string') {
    return { callerRole: optionsOrRole };
  }

  if (optionsOrRole === null || optionsOrRole === undefined) {
    return { callerRole: null };
  }

  return optionsOrRole;
};

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

const fetchProfileEmailMap = async (ids: string[]) => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email')
    .in('id', uniqueIds);

  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch profile emails.');
  }

  return new Map<string, string>(
    data
      .filter((row) => row.email)
      .map((row) => [row.id as string, row.email as string]),
  );
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

export const fetchUserRole = async (uid: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Failed to fetch user role:', error);
    return null;
  }

  return data?.role as UserRole;
};

export const fetchAllUserRoles = async (
  actingUserRole: UserRole | null,
): Promise<{ uid: string; email: string; role: UserRole }[]> => {
  if (!actingUserRole || !['admin', 'captain'].includes(actingUserRole)) {
    throw new Error('Permission denied: Only Admins and Captains can view user roles.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role');

  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch user roles.');
  }

  return data.map((row) => ({
    uid: row.id,
    email: row.email || 'N/A',
    role: row.role as UserRole,
  }));
};

export const setUserRole = async (uid: string, email: string, role: UserRole): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: uid, email, role });

  if (error) {
    throw new Error(error.message || 'Failed to set user role.');
  }
};

export const updateUserRole = async (
  uid: string,
  newRole: UserRole,
  actingUserRole: UserRole | null,
): Promise<void> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated.');
  if (!actingUserRole || !['admin', 'captain'].includes(actingUserRole)) {
    throw new Error('Permission denied: Only Admins and Captains can update user roles.');
  }

  const currentUserId = authUser.id;
  const targetUserRole = await fetchUserRole(uid);

  if (actingUserRole === 'admin') {
    if (currentUserId === uid && newRole !== 'admin') {
      throw new Error('Admins cannot demote themselves.');
    }
    if (targetUserRole === 'admin' && newRole !== 'admin') {
      throw new Error('Admins cannot demote other Admins.');
    }
  }

  if (actingUserRole === 'captain') {
    if (targetUserRole === 'admin') {
      throw new Error("Captains cannot change an Admin's role.");
    }
    if (currentUserId === uid && newRole === 'admin') {
      throw new Error('Captains cannot promote themselves to Admin.');
    }
    if (currentUserId === uid && newRole === 'officer') {
      throw new Error('Captains cannot demote themselves to Officer.');
    }
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', uid)
    .maybeSingle();

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: uid,
      email: existingProfile?.email ?? null,
      role: newRole,
    });

  if (error) {
    throw new Error(error.message || 'Failed to update role. Please try again.');
  }
};

export const deleteUserRole = async (uid: string, actingUserRole: UserRole | null): Promise<void> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated.');
  if (!actingUserRole || actingUserRole !== 'admin') {
    throw new Error('Permission denied: Only Admins can delete user roles.');
  }

  const currentUserId = authUser.id;
  if (currentUserId === uid) {
    throw new Error('Admins cannot delete their own user role.');
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', uid);

  if (error) {
    throw new Error(error.message || 'Failed to delete user role. Please try again.');
  }
};

export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section): Promise<Boy> => {
  try {
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
  } catch (error) {
    await reportError('db_createBoy', error as Error, undefined, { section });
    throw error;
  }
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
  try {
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
  } catch (error) {
    await reportError('db_updateBoy', error as Error, undefined, { boyId: boy.id, section });
    throw error;
  }
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
  try {
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
  } catch (error) {
    await reportError('db_deleteBoy', error as Error, undefined, { boyId: id, section });
    throw error;
  }
};

export const createInviteCode = async (
  _code: Omit<InviteCode, 'id' | 'generatedAt' | 'defaultUserRole' | 'expiresAt'>,
  section: Section,
  userRole: UserRole | null,
): Promise<InviteCode> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can create invite codes.');
  }

  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const code = generateRandomCode(6);
  const expiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;

  const { error } = await supabase
    .from('invite_codes')
    .insert({
      code,
      created_by: authUser.id,
      role: 'officer',
      section,
      expires_at: new Date(expiresAt).toISOString(),
    });

  if (error) {
    throw new Error(error.message || 'Failed to create invite code.');
  }

  return {
    id: code,
    generatedBy: authUser.email || 'unknown',
    section,
    isUsed: false,
    usedBy: undefined,
    usedAt: undefined,
    revoked: false,
    defaultUserRole: 'officer',
    expiresAt,
    generatedAt: Date.now(),
  };
};

const mapInviteCodeRow = (
  row: InviteCodeRow,
  emailMap: Map<string, string>,
): InviteCode => ({
  id: row.code,
  generatedBy: row.created_by ? (emailMap.get(row.created_by) || row.created_by) : 'Unknown',
  section: row.section ?? undefined,
  isUsed: row.used_at !== null,
  usedBy: row.used_by ? (emailMap.get(row.used_by) || row.used_by) : undefined,
  usedAt: row.used_at ? new Date(row.used_at).getTime() : undefined,
  revoked: row.revoked_at !== null,
  defaultUserRole: row.role,
  expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : 0,
  generatedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
});

export const fetchInviteCode = async (id: string): Promise<InviteCode | undefined> => {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('id,code,role,created_by,used_at,used_by,revoked_at,created_at,expires_at,section')
    .eq('code', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return undefined;
    throw new Error(error.message || 'Failed to fetch invite code');
  }

  const row = data as InviteCodeRow;
  const emailMap = await fetchProfileEmailMap([row.created_by || '', row.used_by || '']);
  return mapInviteCodeRow(row, emailMap);
};

export const claimInviteCode = async (
  code: string,
): Promise<{ defaultRole: UserRole; section: Section | null }> => {
  const { data, error } = await supabase.rpc('claim_invite_code', { p_code: code });

  if (error) {
    throw new Error(error.message || 'Failed to claim invite code.');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.applied_role) {
    throw new Error('Invite code claim did not return a role.');
  }

  return {
    defaultRole: row.applied_role as UserRole,
    section: (row.assigned_section as Section | null) ?? null,
  };
};

export const updateInviteCode = async (
  id: string,
  updates: Partial<InviteCode>,
  optionsOrRole: InviteCodeUpdateOptions | UserRole | null = {},
): Promise<InviteCode> => {
  const { signup = false, callerRole = null } = normalizeInviteCodeOptions(optionsOrRole);

  if (signup) {
    await claimInviteCode(id);
    const claimed = await fetchInviteCode(id);
    if (!claimed) {
      throw new Error('Failed to reload claimed invite code.');
    }
    return claimed;
  }

  if (!callerRole || !['admin', 'captain'].includes(callerRole)) {
    throw new Error('Permission denied: Only Admins and Captains can update invite codes.');
  }

  const updatePayload: Record<string, any> = {};

  if (updates.usedAt !== undefined) {
    updatePayload.used_at = updates.usedAt ? new Date(updates.usedAt).toISOString() : null;
    if (!updates.usedAt) {
      updatePayload.used_by = null;
    }
  }

  if (updates.isUsed === false) {
    updatePayload.used_at = null;
    updatePayload.used_by = null;
  }

  if (updates.revoked !== undefined) {
    updatePayload.revoked_at = updates.revoked ? new Date().toISOString() : null;
  }

  if (updates.expiresAt !== undefined) {
    updatePayload.expires_at = updates.expiresAt ? new Date(updates.expiresAt).toISOString() : null;
  }

  if (updates.defaultUserRole !== undefined) {
    updatePayload.role = updates.defaultUserRole;
  }

  if (updates.section !== undefined) {
    updatePayload.section = updates.section;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new Error('No valid invite code updates provided.');
  }

  const { data, error } = await supabase
    .from('invite_codes')
    .update(updatePayload)
    .eq('code', id)
    .select('id,code,role,created_by,used_at,used_by,revoked_at,created_at,expires_at,section')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update invite code.');
  }

  const row = data as InviteCodeRow;
  const emailMap = await fetchProfileEmailMap([row.created_by || '', row.used_by || '']);
  return mapInviteCodeRow(row, emailMap);
};

export const revokeInviteCode = async (id: string, userRole: UserRole | null): Promise<void> => {
  await updateInviteCode(id, { revoked: true }, { callerRole: userRole });
};

export const fetchAllInviteCodes = async (userRole: UserRole | null): Promise<InviteCode[]> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can view all invite codes.');
  }

  const { data, error } = await supabase
    .from('invite_codes')
    .select('id,code,role,created_by,used_at,used_by,revoked_at,created_at,expires_at,section')
    .order('created_at', { ascending: false });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch invite codes.');
  }

  const rows = data as InviteCodeRow[];
  const emailMap = await fetchProfileEmailMap(
    rows.flatMap((row) => [row.created_by || '', row.used_by || '']),
  );

  return rows.map((row) => mapInviteCodeRow(row, emailMap));
};
