import { Boy, AuditLog, Section, InviteCode, UserRole } from '../types';
import { supabase } from './supabaseClient';
import * as supabaseAuth from './supabaseAuth';

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

export const fetchUserRole = async (uid: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('uid', uid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Failed to fetch user role:', error);
    return null;
  }

  return data?.role as UserRole;
};

export const fetchAllUserRoles = async (actingUserRole: UserRole | null): Promise<{ uid: string; email: string; role: UserRole }[]> => {
  if (!actingUserRole || !['admin', 'captain'].includes(actingUserRole)) {
    throw new Error('Permission denied: Only Admins and Captains can view user roles.');
  }

  const { data, error } = await supabase.from('user_roles').select('uid,email,role');
  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch user roles.');
  }
  return data.map(row => ({ uid: row.uid, email: row.email || 'N/A', role: row.role as UserRole }));
};

export const setUserRole = async (uid: string, email: string, role: UserRole): Promise<void> => {
  const { error } = await supabase.from('user_roles').upsert({ uid, email, role });
  if (error) {
    throw new Error(error.message || 'Failed to set user role.');
  }
};

export const updateUserRole = async (uid: string, newRole: UserRole, actingUserRole: UserRole | null): Promise<void> => {
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

  const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('uid', uid);
  if (error) {
    throw new Error(error.message || 'Failed to update role. Please try again.');
  }

  await createAuditLog(
    {
      userEmail: authUser.email || 'Unknown User',
      actionType: 'UPDATE_USER_ROLE',
      description: `Updated role for user ${uid} from ${targetUserRole} to ${newRole}.`,
      revertData: { uid, oldRole: targetUserRole, newRole },
    },
    null
  );
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

  const { error } = await supabase.from('user_roles').delete().eq('uid', uid);
  if (error) {
    throw new Error(error.message || 'Failed to delete user role. Please try again.');
  }

  await createAuditLog(
    {
      userEmail: authUser.email || 'Unknown User',
      actionType: 'DELETE_USER_ROLE',
      description: `Deleted role for user ${uid}.`,
      revertData: { uid },
    },
    null
  );
};

export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section): Promise<Boy> => {
  validateBoyMarks(boy as Boy, section);
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('boys')
    .insert([
      {
        name: boy.name,
        squad: boy.squad,
        year: boy.year,
        marks: boy.marks,
        is_squad_leader: boy.isSquadLeader ?? false,
        section,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create boy');
  }

  return {
    id: data.id,
    name: data.name,
    squad: data.squad,
    year: data.year,
    marks: data.marks || [],
    isSquadLeader: data.is_squad_leader ?? false,
  };
};

export const fetchBoys = async (section: Section): Promise<Boy[]> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) return [];

  const { data, error } = await supabase
    .from('boys')
    .select('*')
    .eq('section', section)
    .order('name');

  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch boys');
  }

  return data.map(row => ({
    id: row.id,
    name: row.name,
    squad: row.squad,
    year: row.year,
    marks: row.marks || [],
    isSquadLeader: row.is_squad_leader ?? false,
  }));
};

export const fetchBoyById = async (id: string, section: Section): Promise<Boy | undefined> => {
  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('boys')
    .select('*')
    .eq('id', id)
    .eq('section', section)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return undefined;
    throw new Error(error?.message || 'Failed to fetch boy');
  }

  if (!data) return undefined;

  return {
    id: data.id,
    name: data.name,
    squad: data.squad,
    year: data.year,
    marks: data.marks || [],
    isSquadLeader: data.is_squad_leader ?? false,
  };
};

export const updateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
  validateBoyMarks(boy, section);
  const { id, ...boyData } = boy;
  const { data, error } = await supabase
    .from('boys')
    .update({
      ...boyData,
      section,
      is_squad_leader: boyData.isSquadLeader ?? false,
    })
    .eq('id', id)
    .eq('section', section)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update boy');
  }

  return {
    id: data.id,
    name: data.name,
    squad: data.squad,
    year: data.year,
    marks: data.marks || [],
    isSquadLeader: data.is_squad_leader ?? false,
  };
};

export const recreateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
  validateBoyMarks(boy, section);
  const { data, error } = await supabase
    .from('boys')
    .upsert({
      id: boy.id,
      section,
      name: boy.name,
      squad: boy.squad,
      year: boy.year,
      marks: boy.marks,
      is_squad_leader: boy.isSquadLeader ?? false,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to recreate boy');
  }

  return {
    id: data.id,
    name: data.name,
    squad: data.squad,
    year: data.year,
    marks: data.marks || [],
    isSquadLeader: data.is_squad_leader ?? false,
  };
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
  const { error } = await supabase
    .from('boys')
    .delete()
    .eq('id', id)
    .eq('section', section);

  if (error) {
    throw new Error(error.message || 'Failed to delete boy');
  }
};

export const createAuditLog = async (
  log: Omit<AuditLog, 'id' | 'timestamp'>,
  section: Section | null,
  shouldLogAudit: boolean = true
): Promise<AuditLog | null> => {
  if (!shouldLogAudit) return null;

  const timestamp = Date.now();
  const { data, error } = await supabase
    .from('audit_logs')
    .insert([
      {
        user_email: log.userEmail,
        action_type: log.actionType,
        description: log.description,
        revert_data: log.revertData,
        reverted_log_id: log.revertedLogId ?? null,
        section: section ?? null,
        timestamp: new Date(timestamp).toISOString(),
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create audit log');
  }

  return {
    id: data.id,
    timestamp: data.timestamp ? new Date(data.timestamp).getTime() : timestamp,
    userEmail: data.user_email,
    actionType: data.action_type,
    description: data.description,
    revertData: data.revert_data,
    revertedLogId: data.reverted_log_id ?? undefined,
    section: data.section ?? null,
  };
};

export const fetchAuditLogs = async (section: Section | null): Promise<AuditLog[]> => {
  const filters = section ? [{ column: 'section', value: section }] : [{ column: 'section', value: null }];
  const query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
  let { data, error } = await query.eq('section', filters[0].value as any);

  if (section !== null) {
    const globalResult = await supabase.from('audit_logs').select('*').eq('section', null).order('timestamp', { ascending: false });
    if (!globalResult.error && globalResult.data) {
      data = [...(data || []), ...globalResult.data];
    } else if (globalResult.error) {
      error = error || globalResult.error;
    }
  }

  if (error) {
    console.error('Failed to fetch audit logs from Supabase:', error);
    return [];
  }

  const freshLogs = (data || []).map(log => ({
    id: log.id,
    timestamp: log.timestamp ? new Date(log.timestamp).getTime() : Date.now(),
    userEmail: log.user_email,
    actionType: log.action_type,
    description: log.description,
    revertData: log.revert_data,
    revertedLogId: log.reverted_log_id ?? undefined,
    section: log.section ?? null,
  }));

  return freshLogs.sort((a, b) => b.timestamp - a.timestamp);
};

export const clearAllAuditLogs = async (section: Section | null, userEmail: string, userRole: UserRole | null): Promise<void> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can clear audit logs.');
  }

  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('audit_logs')
    .delete()
    .match({ section: section ?? null });

  if (error) {
    throw new Error(error.message || 'Failed to clear audit logs.');
  }

  const logDescription = section ? `Cleared audit logs for ${section} section.` : 'Cleared global audit logs.';

  await createAuditLog(
    {
      userEmail,
      actionType: 'CLEAR_AUDIT_LOGS',
      description: logDescription,
      revertData: {},
    },
    section
  );
};

export const clearAllUsedRevokedInviteCodes = async (userEmail: string, userRole: UserRole | null): Promise<void> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can clear invite codes.');
  }

  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const { data, error } = await supabase.from('invite_codes').delete().or('is_used.eq.true,revoked.eq.true');

  if (error) {
    throw new Error(error.message || 'Failed to clear invite codes.');
  }

  await createAuditLog(
    {
      userEmail,
      actionType: 'CLEAR_USED_REVOKED_INVITE_CODES',
      description: 'Cleared used and revoked invite codes.',
      revertData: { deletedCodes: data },
    },
    null
  );
};

export const createInviteCode = async (
  code: Omit<InviteCode, 'id' | 'generatedAt' | 'defaultUserRole' | 'expiresAt'>,
  section: Section,
  userRole: UserRole | null
): Promise<InviteCode> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can create invite codes.');
  }

  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const newCode: InviteCode = {
    id: generateRandomCode(6),
    generatedBy: authUser.email || 'unknown',
    section,
    isUsed: false,
    usedBy: null,
    usedAt: null,
    revoked: false,
    defaultUserRole: 'officer',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    generatedAt: Date.now(),
  };

  const { error } = await supabase
    .from('invite_codes')
    .insert({
      id: newCode.id,
      generated_by: newCode.generatedBy,
      section: newCode.section,
      is_used: newCode.isUsed,
      used_by: newCode.usedBy,
      used_at: null,
      revoked: newCode.revoked,
      default_user_role: newCode.defaultUserRole,
      expires_at: new Date(newCode.expiresAt).toISOString(),
    });

  if (error) {
    throw new Error(error.message || 'Failed to create invite code.');
  }

  await createAuditLog(
    {
      userEmail: authUser.email || 'Unknown User',
      actionType: 'CREATE_INVITE_CODE',
      description: `Created invite code ${newCode.id} for section ${section}.`,
      revertData: { inviteCode: newCode },
    },
    null
  );

  return newCode;
};

export const fetchInviteCode = async (id: string): Promise<InviteCode | undefined> => {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return undefined;
    throw new Error(error.message || 'Failed to fetch invite code');
  }

  return {
    id: data.id,
    generatedBy: data.generated_by,
    section: data.section,
    isUsed: data.is_used,
    usedBy: data.used_by,
    usedAt: data.used_at ? new Date(data.used_at).getTime() : null,
    revoked: data.revoked,
    defaultUserRole: data.default_user_role,
    expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : 0,
    generatedAt: data.generated_at ? new Date(data.generated_at).getTime() : Date.now(),
  };
};

export const updateInviteCode = async (id: string, updates: Partial<InviteCode>, userRole: UserRole | null): Promise<InviteCode> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can update invite codes.');
  }

  const authUser = await supabaseAuth.getCurrentUser();
  if (!authUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('invite_codes')
    .update({
      is_used: updates.isUsed,
      used_by: updates.usedBy,
      used_at: updates.usedAt ? new Date(updates.usedAt).toISOString() : null,
      revoked: updates.revoked,
      expires_at: updates.expiresAt ? new Date(updates.expiresAt).toISOString() : undefined,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update invite code.');
  }

  const updated: InviteCode = {
    id: data.id,
    generatedBy: data.generated_by,
    section: data.section,
    isUsed: data.is_used,
    usedBy: data.used_by,
    usedAt: data.used_at ? new Date(data.used_at).getTime() : null,
    revoked: data.revoked,
    defaultUserRole: data.default_user_role,
    expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : 0,
    generatedAt: data.generated_at ? new Date(data.generated_at).getTime() : Date.now(),
  };

  await createAuditLog(
    {
      userEmail: authUser.email || 'Unknown User',
      actionType: 'UPDATE_INVITE_CODE',
      description: `Updated invite code ${id}.`,
      revertData: { inviteCode: updated },
    },
    null
  );

  return updated;
};

export const revokeInviteCode = async (
  id: string,
  section: Section,
  createLogEntry: boolean = true,
  userRole: UserRole | null
): Promise<void> => {
  await updateInviteCode(id, { revoked: true }, userRole);

  if (createLogEntry) {
    const authUser = await supabaseAuth.getCurrentUser();
    if (authUser) {
      await createAuditLog(
        {
          userEmail: authUser.email || 'Unknown User',
          actionType: 'REVOKE_INVITE_CODE',
          description: `Revoked invite code ${id} for section ${section}.`,
          revertData: { inviteCodeId: id },
        },
        null
      );
    }
  }
};

export const fetchAllInviteCodes = async (userRole: UserRole | null): Promise<InviteCode[]> => {
  if (!userRole || !['admin', 'captain'].includes(userRole)) {
    throw new Error('Permission denied: Only Admins and Captains can view all invite codes.');
  }

  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .order('generated_at', { ascending: false });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch invite codes.');
  }

  return data.map(code => ({
    id: code.id,
    generatedBy: code.generated_by,
    section: code.section,
    isUsed: code.is_used,
    usedBy: code.used_by,
    usedAt: code.used_at ? new Date(code.used_at).getTime() : null,
    revoked: code.revoked,
    defaultUserRole: code.default_user_role,
    expiresAt: code.expires_at ? new Date(code.expires_at).getTime() : 0,
    generatedAt: code.generated_at ? new Date(code.generated_at).getTime() : Date.now(),
  }));
};
