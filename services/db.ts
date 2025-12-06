import { Boy, AuditLog, Section, InviteCode, UserRole } from '../types';
import { supabase } from './supabaseClient';
import * as supabaseAuth from './supabaseAuth';
import {
    openDB,
    getBoysFromDB,
    saveBoysToDB,
    getBoyFromDB,
    saveBoyToDB,
    addPendingWrite,
    getPendingWrites,
    clearPendingWrites,
    getLogsFromDB,
    saveLogsToDB,
    deleteBoyFromDB,
    deleteLogFromDB,
    saveLogToDB,
    deleteLogsFromDB,
    saveInviteCodeToDB,
    getInviteCodeFromDB,
    getAllInviteCodesFromDB,
    deleteInviteCodeFromDB,
    deleteInviteCodesFromDB,
    clearStore,
    clearAllSectionDataFromDB,
    clearUsedRevokedInviteCodesFromDB,
    clearAllInviteCodesFromDB,
    saveUserRoleToDB,
    getUserRoleFromDB,
    deleteUserRoleFromDB,
    clearAllUserRolesFromDB,
} from './offlineDb';

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
        throw new Error("Marks must be an array.");
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

export const syncPendingWrites = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    const pendingWrites = await getPendingWrites();
    if (pendingWrites.length === 0) return true;

    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) return false;

    for (const write of pendingWrites) {
        try {
            switch (write.type) {
                case 'CREATE_BOY': {
                    const { data, error } = await supabase
                        .from('boys')
                        .insert([{ ...write.payload, section: write.section, is_squad_leader: write.payload.isSquadLeader ?? false }])
                        .select()
                        .single();
                    if (error || !data) throw error || new Error('Failed to create boy');
                    const boy: Boy = {
                        id: data.id,
                        name: data.name,
                        squad: data.squad,
                        year: data.year,
                        marks: data.marks || [],
                        isSquadLeader: data.is_squad_leader ?? false,
                    };
                    if (write.tempId) {
                        await deleteBoyFromDB(write.tempId, write.section!);
                    }
                    await saveBoyToDB(boy, write.section!);
                    break;
                }
                case 'UPDATE_BOY': {
                    const { id, ...boyData } = write.payload;
                    const { error } = await supabase
                        .from('boys')
                        .update({
                            ...boyData,
                            section: write.section,
                            is_squad_leader: boyData.isSquadLeader ?? false,
                        })
                        .eq('id', id)
                        .eq('section', write.section!);
                    if (error) throw error;
                    await saveBoyToDB(write.payload, write.section!);
                    break;
                }
                case 'DELETE_BOY': {
                    const { error } = await supabase
                        .from('boys')
                        .delete()
                        .eq('id', write.payload.id)
                        .eq('section', write.section!);
                    if (error) throw error;
                    await deleteBoyFromDB(write.payload.id, write.section!);
                    break;
                }
                case 'RECREATE_BOY': {
                    const { error } = await supabase
                        .from('boys')
                        .upsert({
                            id: write.payload.id,
                            section: write.section,
                            name: write.payload.name,
                            squad: write.payload.squad,
                            year: write.payload.year,
                            marks: write.payload.marks,
                            is_squad_leader: write.payload.isSquadLeader ?? false,
                        });
                    if (error) throw error;
                    await saveBoyToDB(write.payload, write.section!);
                    break;
                }
                case 'CREATE_AUDIT_LOG': {
                    const { data, error } = await supabase
                        .from('audit_logs')
                        .insert([
                            {
                                user_email: write.payload.userEmail,
                                action_type: write.payload.actionType,
                                description: write.payload.description,
                                revert_data: write.payload.revertData,
                                reverted_log_id: write.payload.revertedLogId ?? null,
                                section: write.section ?? null,
                                timestamp: new Date().toISOString(),
                            },
                        ])
                        .select()
                        .single();
                    if (error || !data) throw error || new Error('Failed to create audit log');
                    const newLog: AuditLog = {
                        id: data.id,
                        timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
                        userEmail: data.user_email,
                        actionType: data.action_type,
                        description: data.description,
                        revertData: data.revert_data,
                        revertedLogId: data.reverted_log_id ?? undefined,
                        section: data.section ?? null,
                    };
                    if (write.tempId) {
                        await deleteLogFromDB(write.tempId, write.section || null);
                    }
                    await saveLogToDB(newLog, write.section || null);
                    break;
                }
                case 'CREATE_INVITE_CODE': {
                    const { error } = await supabase
                        .from('invite_codes')
                        .insert({
                            id: write.payload.id,
                            generated_by: write.payload.generatedBy,
                            section: write.payload.section ?? null,
                            is_used: write.payload.isUsed ?? false,
                            used_by: write.payload.usedBy ?? null,
                            used_at: write.payload.usedAt ? new Date(write.payload.usedAt).toISOString() : null,
                            revoked: write.payload.revoked ?? false,
                            default_user_role: write.payload.defaultUserRole,
                            expires_at: new Date(write.payload.expiresAt).toISOString(),
                        });
                    if (error) throw error;
                    await saveInviteCodeToDB({ ...write.payload, generatedAt: write.payload.generatedAt ?? Date.now() });
                    break;
                }
                case 'UPDATE_INVITE_CODE': {
                    const { error } = await supabase
                        .from('invite_codes')
                        .update({
                            is_used: write.payload.isUsed,
                            used_by: write.payload.usedBy ?? null,
                            used_at: write.payload.usedAt ? new Date(write.payload.usedAt).toISOString() : null,
                            revoked: write.payload.revoked,
                            expires_at: write.payload.expiresAt ? new Date(write.payload.expiresAt).toISOString() : undefined,
                        })
                        .eq('id', write.payload.id);
                    if (error) throw error;
                    await saveInviteCodeToDB(write.payload as InviteCode);
                    break;
                }
                case 'UPDATE_USER_ROLE': {
                    const { error } = await supabase
                        .from('user_roles')
                        .update({ role: write.payload.role })
                        .eq('uid', write.payload.uid);
                    if (error) throw error;
                    await saveUserRoleToDB(write.payload.uid, write.payload.role);
                    break;
                }
                case 'DELETE_USER_ROLE': {
                    const { error } = await supabase
                        .from('user_roles')
                        .delete()
                        .eq('uid', write.payload.uid);
                    if (error) throw error;
                    await deleteUserRoleFromDB(write.payload.uid);
                    break;
                }
                default:
                    break;
            }
        } catch (error) {
            console.error('Failed to sync pending write', write, error);
            return false;
        }
    }

    await clearPendingWrites();
    return true;
};

export const fetchUserRole = async (uid: string): Promise<UserRole | null> => {
    await openDB();
    const cachedRole = await getUserRoleFromDB(uid);
    if (cachedRole) {
        if (navigator.onLine) {
            supabase
                .from('user_roles')
                .select('role')
                .eq('uid', uid)
                .single()
                .then(({ data, error }) => {
                    if (!error && data && data.role !== cachedRole) {
                        saveUserRoleToDB(uid, data.role as UserRole).then(() => {
                            window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
                        });
                    }
                    if (error && error.code === 'PGRST116') {
                        deleteUserRoleFromDB(uid).then(() => {
                            window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
                        });
                    }
                })
                .catch(err => console.error('Background fetch for user role failed:', err));
        }
        return cachedRole;
    }

    if (navigator.onLine) {
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
        if (data?.role) {
            await saveUserRoleToDB(uid, data.role as UserRole);
            return data.role as UserRole;
        }
    }
    return null;
};

export const fetchAllUserRoles = async (actingUserRole: UserRole | null): Promise<{ uid: string; email: string; role: UserRole }[]> => {
    if (!navigator.onLine) return [];
    if (!actingUserRole || !['admin', 'captain'].includes(actingUserRole)) {
        throw new Error("Permission denied: Only Admins and Captains can view user roles.");
    }

    const { data, error } = await supabase
        .from('user_roles')
        .select('uid,email,role');
    if (error || !data) {
        throw new Error(error?.message || 'Failed to fetch user roles.');
    }
    return data.map(row => ({ uid: row.uid, email: row.email || 'N/A', role: row.role as UserRole }));
};

export const setUserRole = async (uid: string, email: string, role: UserRole): Promise<void> => {
    if (!navigator.onLine) throw new Error("Role assignment is only available online.");
    const { error } = await supabase
        .from('user_roles')
        .upsert({ uid, email, role });
    if (error) {
        throw new Error(error.message || 'Failed to set user role.');
    }
    await saveUserRoleToDB(uid, role);
};

export const updateUserRole = async (uid: string, newRole: UserRole, actingUserRole: UserRole | null): Promise<void> => {
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error("User not authenticated.");
    if (!navigator.onLine) throw new Error("Role management is only available online.");
    if (!actingUserRole || !['admin', 'captain'].includes(actingUserRole)) {
        throw new Error("Permission denied: Only Admins and Captains can update user roles.");
    }

    const currentUserId = authUser.id;
    const targetUserRole = await fetchUserRole(uid);

    if (actingUserRole === 'admin') {
        if (currentUserId === uid && newRole !== 'admin') {
            throw new Error("Admins cannot demote themselves.");
        }
        if (targetUserRole === 'admin' && newRole !== 'admin') {
            throw new Error("Admins cannot demote other Admins.");
        }
    }

    if (actingUserRole === 'captain') {
        if (targetUserRole === 'admin') {
            throw new Error("Captains cannot change an Admin's role.");
        }
        if (currentUserId === uid && newRole === 'admin') {
            throw new Error("Captains cannot promote themselves to Admin.");
        }
        if (currentUserId === uid && newRole === 'officer') {
            throw new Error("Captains cannot demote themselves to Officer.");
        }
    }

    const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('uid', uid);
    if (error) {
        throw new Error(error.message || 'Failed to update role. Please try again.');
    }

    await saveUserRoleToDB(uid, newRole);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));

    await createAuditLog({
        userEmail: authUser.email || 'Unknown User',
        actionType: 'UPDATE_USER_ROLE',
        description: `Updated role for user ${uid} from ${targetUserRole} to ${newRole}.`,
        revertData: { uid, oldRole: targetUserRole, newRole },
    }, null);
};

export const deleteUserRole = async (uid: string, actingUserRole: UserRole | null): Promise<void> => {
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error("User not authenticated.");
    if (!navigator.onLine) throw new Error("User role deletion is only available online.");
    if (!actingUserRole || actingUserRole !== 'admin') {
        throw new Error("Permission denied: Only Admins can delete user roles.");
    }

    const currentUserId = authUser.id;
    if (currentUserId === uid) {
        throw new Error("Admins cannot delete their own user role.");
    }

    const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('uid', uid);
    if (error) {
        throw new Error(error.message || 'Failed to delete user role. Please try again.');
    }

    await deleteUserRoleFromDB(uid);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));

    await createAuditLog({
        userEmail: authUser.email || 'Unknown User',
        actionType: 'DELETE_USER_ROLE',
        description: `Deleted role for user ${uid}.`,
        revertData: { uid },
    }, null);
};

export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section): Promise<Boy> => {
    validateBoyMarks(boy as Boy, section);
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error("User not authenticated");

    if (navigator.onLine) {
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

        const newBoy: Boy = {
            id: data.id,
            name: data.name,
            squad: data.squad,
            year: data.year,
            marks: data.marks || [],
            isSquadLeader: data.is_squad_leader ?? false,
        };
        await saveBoyToDB(newBoy, section);
        return newBoy;
    } else {
        const tempId = `temp_${crypto.randomUUID()}`;
        const newBoy = { ...boy, id: tempId } as Boy;
        await addPendingWrite({ type: 'CREATE_BOY', payload: newBoy, tempId, section });
        await saveBoyToDB(newBoy, section);
        return newBoy;
    }
};

export const fetchBoys = async (section: Section): Promise<Boy[]> => {
    await openDB();
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) return [];

    const cachedBoys = await getBoysFromDB(section);
    if (cachedBoys.length > 0) {
        if (navigator.onLine) {
            fetchBoysFromNetwork(section).catch(err => console.error('Background fetch for boys failed:', err));
        }
        return cachedBoys;
    }

    if (navigator.onLine) {
        return fetchBoysFromNetwork(section);
    }

    return [];
};

const fetchBoysFromNetwork = async (section: Section): Promise<Boy[]> => {
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

    const boys: Boy[] = data.map(row => ({
        id: row.id,
        name: row.name,
        squad: row.squad,
        year: row.year,
        marks: row.marks || [],
        isSquadLeader: row.is_squad_leader ?? false,
    }));

    await saveBoysToDB(boys, section);
    return boys;
};

export const fetchBoyById = async (id: string, section: Section): Promise<Boy | undefined> => {
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error("User not authenticated");

    const cachedBoy = await getBoyFromDB(id, section);
    if (cachedBoy) return cachedBoy;

    if (navigator.onLine) {
        const { data, error } = await supabase
            .from('boys')
            .select('*')
            .eq('id', id)
            .eq('section', section)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return undefined;
            }
            throw new Error(error.message || 'Failed to fetch boy');
        }

        if (data) {
            const boy = {
                id: data.id,
                name: data.name,
                squad: data.squad,
                year: data.year,
                marks: data.marks || [],
                isSquadLeader: data.is_squad_leader ?? false,
            } as Boy;
            await saveBoyToDB(boy, section);
            return boy;
        }
    }
    return undefined;
};

const performBoyUpdate = async (boy: Boy, section: Section) => {
    validateBoyMarks(boy, section);

    if (navigator.onLine) {
        const { id, ...boyData } = boy;
        const { error } = await supabase
            .from('boys')
            .update({
                name: boyData.name,
                squad: boyData.squad,
                year: boyData.year,
                marks: boyData.marks,
                is_squad_leader: boyData.isSquadLeader ?? false,
                section,
            })
            .eq('id', id!)
            .eq('section', section);

        if (error) {
            throw new Error(error.message || 'Failed to update boy');
        }

        await saveBoyToDB(boy, section);
    } else {
        await addPendingWrite({ type: 'UPDATE_BOY', payload: boy, section });
        await saveBoyToDB(boy, section);
    }
};

export const updateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (!boy.id) throw new Error("Boy must have an ID to be updated");
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error("User not authenticated");
    await performBoyUpdate(boy, section);
    return boy;
};

export const recreateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (!boy.id) throw new Error("Boy must have an ID to be recreated");
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error("User not authenticated");

    validateBoyMarks(boy, section);

    if (navigator.onLine) {
        const { error } = await supabase
            .from('boys')
            .upsert({
                id: boy.id,
                section,
                name: boy.name,
                squad: boy.squad,
                year: boy.year,
                marks: boy.marks,
                is_squad_leader: boy.isSquadLeader ?? false,
            });

        if (error) {
            throw new Error(error.message || 'Failed to recreate boy');
        }

        await saveBoyToDB(boy, section);
    } else {
        await addPendingWrite({ type: 'RECREATE_BOY', payload: boy, section });
        await saveBoyToDB(boy, section);
    }
    return boy;
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error("User not authenticated");

    if (navigator.onLine) {
        const { error } = await supabase
            .from('boys')
            .delete()
            .eq('id', id)
            .eq('section', section);

        if (error) {
            throw new Error(error.message || 'Failed to delete boy');
        }

        await deleteBoyFromDB(id, section);
    } else {
        await addPendingWrite({ type: 'DELETE_BOY', payload: { id }, section });
        await deleteBoyFromDB(id, section);
    }
};

export const createAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>, section: Section | null, shouldLogAudit: boolean = true): Promise<AuditLog | null> => {
    if (!shouldLogAudit) {
        return null;
    }

    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error("User not authenticated for logging");
    const timestamp = Date.now();

    const logPayload = {
        userEmail: log.userEmail,
        actionType: log.actionType,
        description: log.description,
        revertData: log.revertData,
        section: section ?? null,
        ...(log.revertedLogId && { revertedLogId: log.revertedLogId })
    };

    if (navigator.onLine) {
        const { data, error } = await supabase
            .from('audit_logs')
            .insert([
                {
                    user_email: logPayload.userEmail,
                    action_type: logPayload.actionType,
                    description: logPayload.description,
                    revert_data: logPayload.revertData,
                    reverted_log_id: logPayload.revertedLogId ?? null,
                    section: logPayload.section,
                    timestamp: new Date(timestamp).toISOString(),
                },
            ])
            .select()
            .single();

        if (error || !data) {
            throw new Error(error?.message || 'Failed to create audit log');
        }

        const newLog: AuditLog = {
            id: data.id,
            timestamp: data.timestamp ? new Date(data.timestamp).getTime() : timestamp,
            userEmail: data.user_email,
            actionType: data.action_type,
            description: data.description,
            revertData: data.revert_data,
            revertedLogId: data.reverted_log_id ?? undefined,
            section: data.section ?? null,
        };

        await saveLogToDB(newLog, section);
        return newLog;
    } else {
        const tempId = `offline_${crypto.randomUUID()}`;
        const newLog = { ...logPayload, id: tempId, timestamp } as AuditLog;
        await addPendingWrite({ type: 'CREATE_AUDIT_LOG', payload: logPayload, tempId, section: section || undefined });
        await saveLogToDB(newLog, section);
        return newLog;
    }
};

export const fetchAuditLogs = async (section: Section | null): Promise<AuditLog[]> => {
    await openDB();
    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) return [];

    let cachedLogs: AuditLog[] = [];
    let freshLogs: AuditLog[] = [];

    try {
        cachedLogs = await getLogsFromDB(section);
        if (section !== null) {
            const globalLogs = await getLogsFromDB(null);
            cachedLogs = [...cachedLogs, ...globalLogs];
        }
    } catch (err) {
        console.error('Failed to read audit logs from IndexedDB:', err);
    }

    if (navigator.onLine) {
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
        } else if (data) {
            freshLogs = data.map(log => ({
                id: log.id,
                timestamp: log.timestamp ? new Date(log.timestamp).getTime() : Date.now(),
                userEmail: log.user_email,
                actionType: log.action_type,
                description: log.description,
                revertData: log.revert_data,
                revertedLogId: log.reverted_log_id ?? undefined,
                section: log.section ?? null,
            }));

            await saveLogsToDB(freshLogs, section);
        }
    }

    const combined = freshLogs.length > 0 ? freshLogs : cachedLogs;
    return combined.sort((a, b) => b.timestamp - a.timestamp);
};

export const clearAllAuditLogs = async (section: Section | null, userEmail: string, userRole: UserRole | null): Promise<void> => {
    if (!navigator.onLine) throw new Error('Clearing audit logs requires an online connection.');
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

    await createAuditLog({
        userEmail,
        actionType: 'CLEAR_AUDIT_LOGS',
        description: logDescription,
        revertData: {},
    }, section);

    if (section !== null) {
        await deleteLogsFromDB([], section);
    }
    if (section === null || section === undefined) {
        await deleteLogsFromDB([], null);
    }
};

export const deleteOldAuditLogs = async (section: Section): Promise<void> => {
    const fourteenDaysInMillis = 14 * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Date.now() - fourteenDaysInMillis;

    try {
        const localLogs = await getLogsFromDB(section);
        const oldLocalLogIds = localLogs.filter(log => log.timestamp < cutoffTimestamp).map(log => log.id!);
        if (oldLocalLogIds.length > 0) {
            await deleteLogsFromDB(oldLocalLogIds, section);
        }
    } catch (error) {
        console.error('Failed to delete old logs from IndexedDB:', error);
    }

    if (navigator.onLine) {
        await supabase
            .from('audit_logs')
            .delete()
            .lt('timestamp', new Date(cutoffTimestamp).toISOString())
            .eq('section', section);
    }
};

export const clearAllUsedRevokedInviteCodes = async (userEmail: string, userRole: UserRole | null): Promise<void> => {
    if (!navigator.onLine) throw new Error('Clearing invite codes requires an online connection.');
    if (!userRole || !['admin', 'captain'].includes(userRole)) {
        throw new Error('Permission denied: Only Admins and Captains can clear invite codes.');
    }

    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('invite_codes')
        .delete()
        .or('is_used.eq.true,revoked.eq.true');

    if (error) {
        throw new Error(error.message || 'Failed to clear invite codes.');
    }

    await clearUsedRevokedInviteCodesFromDB();

    await createAuditLog({
        userEmail,
        actionType: 'CLEAR_INVITE_CODES',
        description: 'Cleared used and revoked invite codes.',
        revertData: { deletedCodes: data },
    }, null);
};

export const clearAllLocalData = async (section: Section, userEmail: string, userRole: UserRole | null): Promise<void> => {
    if (!navigator.onLine) throw new Error('Clearing data requires an online connection.');
    if (!userRole || userRole !== 'admin') {
        throw new Error('Permission denied: Only Admins can clear data.');
    }

    const authUser = await supabaseAuth.getCurrentUser();
    if (!authUser) throw new Error('User not authenticated');

    await clearStore(section);
    await clearAllSectionDataFromDB(section);

    await createAuditLog({
        userEmail,
        actionType: 'CLEAR_LOCAL_DATA',
        description: `Cleared all local data for ${section}.`,
        revertData: {},
    }, section);
};

export const createInviteCode = async (code: Omit<InviteCode, 'id' | 'generatedAt' | 'defaultUserRole' | 'expiresAt'>, section: Section, userRole: UserRole | null): Promise<InviteCode> => {
    if (!navigator.onLine) throw new Error('Invite code creation requires an online connection.');
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

    await saveInviteCodeToDB(newCode);

    await createAuditLog({
        userEmail: authUser.email || 'Unknown User',
        actionType: 'CREATE_INVITE_CODE',
        description: `Created invite code ${newCode.id} for section ${section}.`,
        revertData: { inviteCode: newCode },
    }, null);

    return newCode;
};

export const fetchInviteCode = async (id: string): Promise<InviteCode | undefined> => {
    await openDB();
    const cached = await getInviteCodeFromDB(id);
    if (cached) return cached;

    if (navigator.onLine) {
        const { data, error } = await supabase
            .from('invite_codes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return undefined;
            throw new Error(error.message || 'Failed to fetch invite code');
        }

        const invite: InviteCode = {
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
        await saveInviteCodeToDB(invite);
        return invite;
    }

    return undefined;
};

export const updateInviteCode = async (id: string, updates: Partial<InviteCode>, userRole: UserRole | null): Promise<InviteCode> => {
    if (!navigator.onLine) throw new Error('Invite code updates require an online connection.');
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

    await saveInviteCodeToDB(updated);

    await createAuditLog({
        userEmail: authUser.email || 'Unknown User',
        actionType: 'UPDATE_INVITE_CODE',
        description: `Updated invite code ${id}.`,
        revertData: { inviteCode: updated },
    }, null);

    return updated;
};

export const revokeInviteCode = async (id: string, section: Section, createLogEntry: boolean = true, userRole: UserRole | null): Promise<void> => {
    await updateInviteCode(id, { revoked: true }, userRole);

    if (createLogEntry) {
        const authUser = await supabaseAuth.getCurrentUser();
        if (authUser) {
            await createAuditLog({
                userEmail: authUser.email || 'Unknown User',
                actionType: 'REVOKE_INVITE_CODE',
                description: `Revoked invite code ${id} for section ${section}.`,
                revertData: { inviteCodeId: id },
            }, null);
        }
    }

    await deleteInviteCodeFromDB(id);
};

export const fetchAllInviteCodes = async (userRole: UserRole | null): Promise<InviteCode[]> => {
    await openDB();
    if (!userRole || !['admin', 'captain'].includes(userRole)) {
        throw new Error('Permission denied: Only Admins and Captains can view all invite codes.');
    }

    const cachedCodes = await getAllInviteCodesFromDB();
    if (cachedCodes.length > 0 && !navigator.onLine) {
        return cachedCodes;
    }

    if (!navigator.onLine) return [];

    const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('generated_at', { ascending: false });

    if (error || !data) {
        throw new Error(error?.message || 'Failed to fetch invite codes.');
    }

    const invites: InviteCode[] = data.map(code => ({
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

    await saveInviteCodeToDB(invites);
    return invites;
};

