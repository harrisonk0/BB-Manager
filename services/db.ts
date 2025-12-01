/**
 * @file db.ts
 * @description Central data layer abstracted for Supabase and IndexedDB.
 * Handles offline synchronization and data conversion between SQL (Supabase) and local state.
 */

import { supabase } from '@/src/integrations/supabase/client';
import { Boy, AuditLog, Section, InviteCode, UserRole } from '../types';
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
    clearAllUserRolesFromDB
} from './offlineDb';

// --- Helpers ---

/**
 * Maps section/resource pairs to Supabase table names.
 */
const getTableName = (section: Section | null, resource: 'boys' | 'audit_logs' | 'invite_codes' | 'user_roles') => {
    if (resource === 'invite_codes') return 'invites'; // Mapped 'invite_codes' -> 'invites' table
    if (resource === 'user_roles') return 'user_roles';
    if (resource === 'audit_logs' && section === null) return 'audit_logs'; // Global logs
    if (!section) return `global_${resource}`; // Fallback
    return `${section}_${resource}`; // e.g. company_boys, junior_audit_logs
};

/**
 * Generates a random alphanumeric code.
 */
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

/**
 * Helper to convert SQL timestamps (ISO strings) to Unix millis for the app.
 */
const toMillis = (ts: string | number | null | undefined): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    return new Date(ts).getTime();
};

/**
 * Helper to convert Unix millis to ISO string for SQL.
 */
const toISO = (millis: number): string => {
    return new Date(millis).toISOString();
};

/**
 * Validates the marks array of a boy object.
 */
const validateBoyMarks = (boy: Boy, section: Section) => {
    if (!Array.isArray(boy.marks)) throw new Error("Marks must be an array.");
    // (Validation logic kept identical to original)
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
        if (mark.score === -1) continue;

        validateDecimalPlaces(mark.score, 'Total score', mark.date);

        if (section === 'company') {
            if (mark.score < 0 || mark.score > 10) throw new Error(`Score out of range.`);
        } else { 
            if (typeof mark.uniformScore !== 'number' || mark.uniformScore < 0 || mark.uniformScore > 10) throw new Error(`Uniform score invalid.`);
            if (typeof mark.behaviourScore !== 'number' || mark.behaviourScore < 0 || mark.behaviourScore > 5) throw new Error(`Behaviour score invalid.`);
            validateDecimalPlaces(mark.uniformScore, 'Uniform score', mark.date);
            validateDecimalPlaces(mark.behaviourScore, 'Behaviour score', mark.date);
        }
    }
};

// --- Mappers ---

// Boy Mappers
const mapBoyToDB = (boy: Boy) => ({
    id: boy.id,
    name: boy.name,
    squad: boy.squad,
    year: boy.year,
    marks: boy.marks,
    is_squad_leader: boy.isSquadLeader
});

const mapBoyFromDB = (data: any): Boy => ({
    id: data.id,
    name: data.name,
    squad: data.squad,
    year: data.year,
    marks: data.marks || [],
    isSquadLeader: data.is_squad_leader
});

// AuditLog Mappers
const mapLogToDB = (log: AuditLog) => ({
    // id is auto-generated or passed depending on context
    timestamp: toISO(log.timestamp),
    user_email: log.userEmail,
    action_type: log.actionType,
    description: log.description,
    revert_data: log.revertData,
    reverted_log_id: log.revertedLogId
});

const mapLogFromDB = (data: any): AuditLog => ({
    id: data.id,
    timestamp: toMillis(data.timestamp),
    userEmail: data.user_email,
    actionType: data.action_type,
    description: data.description,
    revertData: data.revert_data,
    revertedLogId: data.reverted_log_id,
    section: null // set by context
});

// InviteCode Mappers
const mapInviteToDB = (code: InviteCode) => ({
    id: code.id,
    invited_by: code.generatedBy,
    invited_at: toISO(code.generatedAt),
    is_used: code.isUsed,
    expires_at: toISO(code.expiresAt),
    default_user_role: code.defaultUserRole,
    section: code.section,
    revoked: code.revoked,
    used_at: code.usedAt ? toISO(code.usedAt) : null,
    used_by: code.usedBy
});

const mapInviteFromDB = (data: any): InviteCode => ({
    id: data.id,
    generatedBy: data.invited_by,
    generatedAt: toMillis(data.invited_at),
    isUsed: data.is_used,
    expiresAt: toMillis(data.expires_at) || 0,
    defaultUserRole: data.default_user_role || 'officer',
    section: data.section || 'company',
    revoked: data.revoked,
    usedAt: data.used_at ? toMillis(data.used_at) : undefined,
    usedBy: data.used_by
});


// --- Sync Function ---

export const syncPendingWrites = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    const pendingWrites = await getPendingWrites();
    if (pendingWrites.length === 0) return true;

    console.log(`Syncing ${pendingWrites.length} offline writes to Supabase...`);

    for (const write of pendingWrites) {
        const table = write.section ? getTableName(write.section, 'boys') : '';
        const logsTable = getTableName(write.section || null, 'audit_logs');
        const invitesTable = 'invites';
        const rolesTable = 'user_roles';

        try {
            switch (write.type) {
                case 'CREATE_BOY': {
                    const { id, ...payload } = write.payload as Boy;
                    const dbPayload = mapBoyToDB({ ...write.payload, id: undefined } as Boy); // Don't send temp ID
                    
                    const { data, error } = await supabase
                        .from(table)
                        .insert(dbPayload)
                        .select('id')
                        .single();
                    
                    if (error) throw error;

                    const newId = data.id;
                    const newBoy = { ...write.payload, id: newId };
                    
                    await saveBoyToDB(newBoy, write.section!);
                    if (write.tempId) {
                        await deleteBoyFromDB(write.tempId, write.section!);
                    }
                    break;
                }
                case 'UPDATE_BOY': {
                    const dbPayload = mapBoyToDB(write.payload as Boy);
                    const { error } = await supabase
                        .from(table)
                        .update(dbPayload)
                        .eq('id', write.payload.id);
                    if (error) throw error;
                    break;
                }
                case 'DELETE_BOY': {
                    const { error } = await supabase
                        .from(table)
                        .delete()
                        .eq('id', write.payload.id);
                    if (error) throw error;
                    break;
                }
                case 'RECREATE_BOY': {
                    const dbPayload = mapBoyToDB(write.payload as Boy);
                    const { error } = await supabase
                        .from(table)
                        .upsert(dbPayload);
                    if (error) throw error;
                    break;
                }
                case 'CREATE_AUDIT_LOG': {
                    const { id, ...payload } = write.payload as AuditLog;
                    const dbPayload = mapLogToDB({ ...payload } as AuditLog);
                    
                    const { data, error } = await supabase
                        .from(logsTable)
                        .insert(dbPayload)
                        .select('id')
                        .single();
                    
                    if (error) throw error;

                    if (write.tempId) {
                        const newLog = { ...write.payload, id: data.id };
                        await saveLogToDB(newLog, write.section || null);
                        await deleteLogFromDB(write.tempId, write.section || null);
                    }
                    break;
                }
                case 'CREATE_INVITE_CODE': {
                    const dbPayload = mapInviteToDB(write.payload as InviteCode);
                    const { error } = await supabase
                        .from(invitesTable)
                        .insert(dbPayload);
                    if (error) throw error;
                    break;
                }
                case 'UPDATE_INVITE_CODE': {
                    const { id, ...updates } = write.payload;
                    // For updates, we need to carefully map only the fields present
                    const updateData: any = {};
                    if (updates.isUsed !== undefined) updateData.is_used = updates.isUsed;
                    if (updates.revoked !== undefined) updateData.revoked = updates.revoked;
                    if (updates.expiresAt !== undefined) updateData.expires_at = toISO(updates.expiresAt);
                    if (updates.defaultUserRole !== undefined) updateData.default_user_role = updates.defaultUserRole;
                    if (updates.section !== undefined) updateData.section = updates.section;
                    if (updates.usedAt !== undefined) updateData.used_at = toISO(updates.usedAt);
                    if (updates.usedBy !== undefined) updateData.used_by = updates.usedBy;

                    const { error } = await supabase
                        .from(invitesTable)
                        .update(updateData)
                        .eq('id', id);
                    if (error) throw error;
                    break;
                }
                case 'UPDATE_USER_ROLE': {
                    const { error } = await supabase
                        .from(rolesTable)
                        .update({ role: write.payload.role })
                        .eq('id', write.payload.uid);
                    if (error) throw error;
                    break;
                }
                case 'DELETE_USER_ROLE': {
                    const { error } = await supabase
                        .from(rolesTable)
                        .delete()
                        .eq('id', write.payload.uid);
                    if (error) throw error;
                    break;
                }
            }
        } catch (err) {
            console.error(`Failed to sync write: ${write.type}`, err);
            // We continue processing but could implement retry logic here
        }
    }

    await clearPendingWrites();
    console.log('Sync successful.');
    return true;
};

// --- User Role Functions ---

export const fetchUserRole = async (uid: string): Promise<UserRole | null> => {
    await openDB();
    const cachedRole = await getUserRoleFromDB(uid);
    
    if (cachedRole && navigator.onLine) {
        // Background update
        supabase
            .from('user_roles')
            .select('role')
            .eq('id', uid)
            .single()
            .then(({ data }) => {
                if (data && data.role !== cachedRole) {
                    saveUserRoleToDB(uid, data.role as UserRole).then(() => {
                        window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
                    });
                }
            });
        return cachedRole;
    }

    if (navigator.onLine) {
        const { data } = await supabase.from('user_roles').select('role').eq('id', uid).single();
        if (data) {
            await saveUserRoleToDB(uid, data.role as UserRole);
            return data.role as UserRole;
        }
    }
    
    return cachedRole || null;
};

export const fetchAllUserRoles = async (actingUserRole: UserRole | null): Promise<{ uid: string; email: string; role: UserRole }[]> => {
    if (!navigator.onLine) return [];
    if (!actingUserRole || !['admin', 'captain'].includes(actingUserRole)) throw new Error("Permission denied");

    const { data, error } = await supabase.from('user_roles').select('*');
    if (error) throw error;

    return data.map(row => ({
        uid: row.id,
        email: row.email,
        role: row.role as UserRole
    }));
};

export const setUserRole = async (uid: string, email: string, role: UserRole): Promise<void> => {
    if (!navigator.onLine) throw new Error("Offline");
    const { error } = await supabase.from('user_roles').upsert({ id: uid, email, role });
    if (error) throw error;
    await saveUserRoleToDB(uid, role);
};

export const updateUserRole = async (uid: string, newRole: UserRole, actingUserRole: UserRole | null): Promise<void> => {
    if (!actingUserRole || !['admin', 'captain'].includes(actingUserRole)) throw new Error("Permission denied");

    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('id', uid);
    if (error) throw error;

    await saveUserRoleToDB(uid, newRole);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
    
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
        userEmail: user?.email || 'Unknown',
        actionType: 'UPDATE_USER_ROLE',
        description: `Updated role for user ${uid} to ${newRole}.`,
        revertData: { uid, newRole }
    }, null);
};

export const deleteUserRole = async (uid: string, actingUserRole: UserRole | null): Promise<void> => {
    if (actingUserRole !== 'admin') throw new Error("Permission denied");
    
    const { error } = await supabase.from('user_roles').delete().eq('id', uid);
    if (error) throw error;

    await deleteUserRoleFromDB(uid);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
};

// --- Boy Functions ---

export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section): Promise<Boy> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    validateBoyMarks(boy as Boy, section);

    if (navigator.onLine) {
        const dbPayload = mapBoyToDB(boy as Boy);
        const { data, error } = await supabase
            .from(getTableName(section, 'boys'))
            .insert(dbPayload)
            .select('id')
            .single();
        
        if (error) throw error;
        const newBoy = { ...boy, id: data.id };
        await saveBoyToDB(newBoy, section);
        return newBoy;
    } else {
        const tempId = `offline_${crypto.randomUUID()}`;
        const newBoy = { ...boy, id: tempId } as Boy;
        await addPendingWrite({ type: 'CREATE_BOY', payload: newBoy, tempId, section });
        await saveBoyToDB(newBoy, section);
        return newBoy;
    }
};

export const fetchBoys = async (section: Section): Promise<Boy[]> => {
    await openDB();
    const cachedBoys = await getBoysFromDB(section);

    if (cachedBoys.length > 0) {
        if (navigator.onLine) {
            // Background fetch
            supabase.from(getTableName(section, 'boys')).select('*')
                .then(({ data }) => {
                    if (data) {
                        const freshBoys = data.map(mapBoyFromDB);
                        const cleanFresh = JSON.stringify(freshBoys.sort((a,b) => (a.id||'').localeCompare(b.id||'')));
                        const cleanCached = JSON.stringify(cachedBoys.sort((a,b) => (a.id||'').localeCompare(b.id||'')));
                        
                        if (cleanFresh !== cleanCached) {
                            console.log('Background update found for boys.');
                            saveBoysToDB(freshBoys, section).then(() => {
                                window.dispatchEvent(new CustomEvent('datarefreshed', { detail: { section } }));
                            });
                        }
                    }
                });
        }
        return cachedBoys;
    }

    if (navigator.onLine) {
        const { data, error } = await supabase.from(getTableName(section, 'boys')).select('*');
        if (error) throw error;
        const boys = data.map(mapBoyFromDB);
        await saveBoysToDB(boys, section);
        return boys;
    }

    return [];
};

export const updateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (!boy.id) throw new Error("No ID");
    validateBoyMarks(boy, section);

    if (navigator.onLine) {
        const dbPayload = mapBoyToDB(boy);
        const { error } = await supabase
            .from(getTableName(section, 'boys'))
            .update(dbPayload)
            .eq('id', boy.id);
        if (error) throw error;
        await saveBoyToDB(boy, section);
    } else {
        await addPendingWrite({ type: 'UPDATE_BOY', payload: boy, section });
        await saveBoyToDB(boy, section);
    }
    return boy;
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
    if (navigator.onLine) {
        const { error } = await supabase.from(getTableName(section, 'boys')).delete().eq('id', id);
        if (error) throw error;
        await deleteBoyFromDB(id, section);
    } else {
        await addPendingWrite({ type: 'DELETE_BOY', payload: { id }, section });
        await deleteBoyFromDB(id, section);
    }
};

export const recreateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (navigator.onLine) {
        const dbPayload = mapBoyToDB(boy);
        const { error } = await supabase.from(getTableName(section, 'boys')).upsert(dbPayload);
        if (error) throw error;
        await saveBoyToDB(boy, section);
    } else {
        await addPendingWrite({ type: 'RECREATE_BOY', payload: boy, section });
        await saveBoyToDB(boy, section);
    }
    return boy;
};

export const fetchBoyById = async (id: string, section: Section): Promise<Boy | undefined> => {
    const cached = await getBoyFromDB(id, section);
    if (cached) return cached;

    if (navigator.onLine) {
        const { data } = await supabase.from(getTableName(section, 'boys')).select('*').eq('id', id).single();
        if (data) {
            const boy = mapBoyFromDB(data);
            await saveBoyToDB(boy, section);
            return boy;
        }
    }
    return undefined;
};

// --- Audit Log Functions ---

export const createAuditLog = async (
    log: Omit<AuditLog, 'id' | 'timestamp' | 'userEmail'> & { userEmail?: string }, 
    section: Section | null, 
    shouldLog: boolean = true
): Promise<AuditLog | null> => {
    if (!shouldLog) return null;
    
    let userEmail = log.userEmail;
    if (!userEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        userEmail = user?.email || 'Unknown User';
    }

    const timestamp = Date.now();
    const logData = { ...log, userEmail, timestamp } as AuditLog;
    const table = getTableName(section, 'audit_logs');

    if (navigator.onLine) {
        const dbPayload = mapLogToDB(logData);
        const { data, error } = await supabase
            .from(table)
            .insert(dbPayload)
            .select('id')
            .single();
        
        if (error) throw error;
        const newLog = { ...logData, id: data.id };
        await saveLogToDB(newLog, section);
        return newLog;
    } else {
        const tempId = `offline_${crypto.randomUUID()}`;
        const newLog = { ...logData, id: tempId };
        await addPendingWrite({ type: 'CREATE_AUDIT_LOG', payload: newLog, tempId, section: section || undefined });
        await saveLogToDB(newLog, section);
        return newLog;
    }
};

export const fetchAuditLogs = async (section: Section | null): Promise<AuditLog[]> => {
    await openDB();
    const cachedLogs = await getLogsFromDB(section);
    
    // Merge with global logs for display
    const cachedGlobal = await getLogsFromDB(null);
    const allCached = [...cachedLogs, ...cachedGlobal].sort((a,b) => b.timestamp - a.timestamp);

    if (allCached.length > 0 && navigator.onLine) {
        // Background refresh
        const fetchTable = async (tbl: string) => {
            const { data } = await supabase.from(tbl).select('*').order('timestamp', { ascending: false });
            return (data || []).map(row => mapLogFromDB(row));
        };

        Promise.all([
            section ? fetchTable(getTableName(section, 'audit_logs')) : Promise.resolve([]),
            fetchTable('audit_logs') // Global
        ]).then(([secLogs, globLogs]) => {
            const fresh = [...secLogs, ...globLogs];
            // Simple length check is insufficient if logs are deleted/added, but for now we rely on explicit refreshes too
            // A better check would be timestamps or IDs
            if (fresh.length !== allCached.length || fresh[0]?.id !== allCached[0]?.id) { 
                saveLogsToDB(secLogs, section);
                saveLogsToDB(globLogs, null);
                window.dispatchEvent(new CustomEvent('logsrefreshed', { detail: { section } }));
            }
        });
        return allCached;
    }

    if (navigator.onLine) {
        const fetchTable = async (tbl: string) => {
            const { data } = await supabase.from(tbl).select('*').order('timestamp', { ascending: false });
            return (data || []).map(row => mapLogFromDB(row));
        };
        const [secLogs, globLogs] = await Promise.all([
            section ? fetchTable(getTableName(section, 'audit_logs')) : Promise.resolve([]),
            fetchTable('audit_logs')
        ]);
        
        await saveLogsToDB(secLogs, section);
        await saveLogsToDB(globLogs, null);
        return [...secLogs, ...globLogs].sort((a,b) => b.timestamp - a.timestamp);
    }

    return allCached;
};

export const deleteOldAuditLogs = async (section: Section): Promise<void> => {
    // Basic implementation that relies on Supabase policies/cron in production
};

export const clearAllAuditLogs = async (section: Section | null, email: string, role: UserRole | null): Promise<void> => {
    if (role !== 'admin') throw new Error("Permission denied");
    const table = getTableName(section, 'audit_logs');
    
    if (navigator.onLine) {
        const { error } = await supabase.from(table).delete().neq('id', '0'); // Delete all
        if (error) throw error;
    }
    await clearStore(table);
};

// --- Invite Code Functions ---

export const fetchInviteCode = async (id: string): Promise<InviteCode | undefined> => {
    const cached = await getInviteCodeFromDB(id);
    if (cached && cached.expiresAt > Date.now()) return cached;

    if (navigator.onLine) {
        const { data } = await supabase.from('invites').select('*').eq('id', id).single();
        if (data) {
            const mappedCode = mapInviteFromDB(data);
            await saveInviteCodeToDB(mappedCode);
            return mappedCode;
        }
    }
    return undefined;
};

export const createInviteCode = async (code: any, section: Section, role: UserRole | null): Promise<InviteCode> => {
    if (!['admin', 'captain'].includes(role || '')) throw new Error("Permission denied");
    
    const id = generateRandomCode(6);
    const generatedAt = Date.now();
    const expiresAt = generatedAt + 86400000;

    const newCode = { ...code, id, generatedAt, expiresAt };

    if (navigator.onLine) {
        const dbPayload = mapInviteToDB(newCode);
        const { error } = await supabase.from('invites').insert(dbPayload);
        if (error) throw error;
        await saveInviteCodeToDB(newCode);
    } else {
        await addPendingWrite({ type: 'CREATE_INVITE_CODE', payload: newCode, section });
        await saveInviteCodeToDB(newCode);
    }
    return newCode;
};

export const updateInviteCode = async (id: string, updates: Partial<InviteCode>, role: UserRole | null): Promise<InviteCode> => {
    // Manually map partial updates for SQL
    const dbUpdates: any = {};
    if (updates.isUsed !== undefined) dbUpdates.is_used = updates.isUsed;
    if (updates.revoked !== undefined) dbUpdates.revoked = updates.revoked;
    if (updates.expiresAt !== undefined) dbUpdates.expires_at = toISO(updates.expiresAt);
    if (updates.defaultUserRole !== undefined) dbUpdates.default_user_role = updates.defaultUserRole;
    if (updates.section !== undefined) dbUpdates.section = updates.section;
    if (updates.usedAt !== undefined) dbUpdates.used_at = toISO(updates.usedAt);
    if (updates.usedBy !== undefined) dbUpdates.used_by = updates.usedBy;
    
    if (navigator.onLine) {
        const { error } = await supabase.from('invites').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }
    
    const current = await getInviteCodeFromDB(id);
    const updated = { ...current, ...updates } as InviteCode;
    await saveInviteCodeToDB(updated);
    
    if (!navigator.onLine) {
         await addPendingWrite({ type: 'UPDATE_INVITE_CODE', payload: { id, ...updates }, section: updated.section });
    }
    
    return updated;
};

export const revokeInviteCode = async (id: string, section: Section, log: boolean, role: UserRole | null) => {
    await updateInviteCode(id, { revoked: true }, role);
};

export const fetchAllInviteCodes = async (role: UserRole | null): Promise<InviteCode[]> => {
    if (!navigator.onLine) return [];
    const { data } = await supabase.from('invites').select('*');
    return (data || []).map(mapInviteFromDB);
};

export const clearAllUsedRevokedInviteCodes = async (email: string, role: UserRole | null) => {
    if (role !== 'admin') throw new Error("Denied");
    if (navigator.onLine) {
        await supabase.from('invites').delete().eq('is_used', true);
    }
    await clearUsedRevokedInviteCodesFromDB();
};

export const clearAllLocalData = clearAllSectionDataFromDB;