/**
 * @file db.ts
 * @description Central data layer abstracted for Supabase and IndexedDB.
 */

import { supabase } from '@/src/integrations/supabase/client';
import { Boy, AuditLog, Section, UserRole, UserRoleInfo, EncryptedPayload, PendingWrite } from '../types';
import { encryptData, decryptData } from './crypto';
import { Logger } from './logger';
import { 
    openDB, 
    getBoysFromDB, 
    saveBoysToDB, 
    getBoyFromDB, 
    saveBoyToDB, 
    addPendingWrite, 
    getPendingWrites, 
    clearPendingWrites, 
    addToDLQ,
    getLogsFromDB, 
    saveLogsToDB, 
    deleteBoyFromDB, 
    deleteLogFromDB, 
    saveLogToDB, 
    deleteLogsFromDB, 
    saveUserRoleToDB,
    getUserRoleFromDB,
    deleteUserRoleFromDB,
    clearAllUserRolesFromDB,
    clearStore,
    clearAllLocalDataFromDB,
} from './offlineDb';

// --- Helpers ---

const getTableName = (section: Section | null, resource: 'boys' | 'audit_logs' | 'user_roles') => {
    if (resource === 'user_roles') return 'user_roles';
    if (resource === 'audit_logs' && section === null) return 'audit_logs'; 
    if (!section) return `global_${resource}`;
    return `${section}_${resource}`;
};

const toMillis = (ts: string | number | null | undefined): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    return new Date(ts).getTime();
};

const toISO = (millis: number): string => {
    return new Date(millis).toISOString();
};

const validateBoyMarks = (boy: Boy, section: Section) => {
    if (!Array.isArray(boy.marks)) throw new Error("Marks must be an array.");
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

const mapLogToDB = (log: AuditLog) => {
    const payload: any = {
        timestamp: toISO(log.timestamp),
        user_email: log.userEmail,
        action_type: log.actionType,
        description: log.description,
        revert_data: log.revertData,
        reverted_log_id: log.revertedLogId
    };
    
    if (log.id) {
        payload.id = log.id;
    }
    
    return payload;
};

const mapLogFromDB = (data: any): AuditLog => ({
    id: data.id,
    timestamp: toMillis(data.timestamp),
    userEmail: data.user_email,
    actionType: data.action_type,
    description: data.description,
    revertData: data.revert_data,
    revertedLogId: data.reverted_log_id,
    section: null 
});

// --- Sync Function ---

export const syncPendingWrites = async (key: CryptoKey): Promise<boolean> => {
    if (!navigator.onLine) return false;

    const pendingWrites = await getPendingWrites();
    if (pendingWrites.length === 0) return true;

    Logger.info(`Syncing ${pendingWrites.length} offline writes to Supabase...`);

    let hasNetworkError = false;
    const writesToRemove: number[] = [];

    // Helper to process a single write
    const processWrite = async (write: PendingWrite) => {
        const table = write.section ? getTableName(write.section, 'boys') : '';
        const logsTable = getTableName(write.section || null, 'audit_logs');
        const rolesTable = 'user_roles';

        try {
            switch (write.type) {
                case 'CREATE_BOY': {
                    const decryptedBoy = await decryptData(write.payload as EncryptedPayload, key);
                    const dbPayload = mapBoyToDB(decryptedBoy as Boy); 
                    const { error } = await supabase.from(table).insert(dbPayload);
                    if (error) throw error;
                    break;
                }
                case 'UPDATE_BOY': {
                    const decryptedBoy = await decryptData(write.payload as EncryptedPayload, key) as Boy;
                    
                    // Simple merge strategy: if record exists, update it.
                    const { error } = await supabase
                        .from(table)
                        .update(mapBoyToDB(decryptedBoy))
                        .eq('id', decryptedBoy.id);
                    if (error) throw error;
                    break;
                }
                case 'DELETE_BOY': {
                    const { error } = await supabase.from(table).delete().eq('id', write.payload.id);
                    if (error) throw error;
                    break;
                }
                case 'RECREATE_BOY': {
                    const decryptedBoy = await decryptData(write.payload as EncryptedPayload, key);
                    const { error } = await supabase.from(table).upsert(mapBoyToDB(decryptedBoy as Boy));
                    if (error) throw error;
                    break;
                }
                case 'CREATE_AUDIT_LOG': {
                    const decryptedLog = await decryptData(write.payload as EncryptedPayload, key);
                    
                    const encryptedRevertData = await encryptData(decryptedLog.revertData, key);
                    const logForSupabase = { ...decryptedLog, revertData: encryptedRevertData };
                    
                    const dbPayload = mapLogToDB(logForSupabase);
                    if (!logForSupabase.id || String(logForSupabase.id).startsWith('offline_')) {
                        delete dbPayload.id;
                    }

                    const { data, error } = await supabase
                        .from(logsTable)
                        .insert(dbPayload)
                        .select('id')
                        .single();
                    
                    if (error) throw error;

                    if (write.tempId) {
                        const newLog = { ...decryptedLog, id: data.id };
                        const encryptedNewLog = await encryptData(newLog, key);
                        await saveLogToDB(data.id, encryptedNewLog, write.section || null);
                        await deleteLogFromDB(write.tempId, write.section || null);
                    }
                    break;
                }
                case 'UPDATE_USER_ROLE': {
                    const { error } = await supabase
                        .from(rolesTable)
                        .update({ role: write.payload.role, sections: write.payload.sections })
                        .eq('id', write.payload.uid);
                    if (error) throw error;
                    break;
                }
                case 'DELETE_USER_ROLE': {
                    const { error } = await supabase.from(rolesTable).delete().eq('id', write.payload.uid);
                    if (error) throw error;
                    break;
                }
            }
            // If successful, mark for removal
            if (write.id) writesToRemove.push(write.id);

        } catch (err: any) {
            const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
            const isUniqueViolation = err.code === '23505';

            if (isNetworkError) {
                Logger.error(`Network error syncing ${write.type}. Will retry.`, err);
                hasNetworkError = true;
            } else if (isUniqueViolation) {
                Logger.warn(`Sync ${write.type}: Unique violation (already synced). Marking done.`);
                if (write.id) writesToRemove.push(write.id);
            } else {
                Logger.error(`Fatal error syncing ${write.type}. Moving to DLQ.`, err);
                await addToDLQ(write, err.message);
                if (write.id) writesToRemove.push(write.id);
            }
        }
    };

    // Process in batches of 5 to avoid overwhelming the network
    const BATCH_SIZE = 5;
    for (let i = 0; i < pendingWrites.length; i += BATCH_SIZE) {
        const batch = pendingWrites.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(processWrite));
        
        // If we hit a network error in this batch, stop processing future batches
        if (hasNetworkError) break;
    }

    // Clean up processed writes
    // Since IndexedDB doesn't support "delete multiple by key list" easily in basic API,
    // we just clear all and re-add any that failed due to network if we wanted robust partial sync.
    // Simpler strategy: clearPendingWrites() then re-add pending ones? 
    // No, risk of data loss. 
    // Current strategy: If no network error, we assume all valid writes were processed or moved to DLQ.
    
    if (!hasNetworkError) {
        await clearPendingWrites();
        Logger.info('Sync queue cleared.');
        return true;
    } else {
        // If network error, we can't easily remove just the successful ones without a more complex IDB wrapper.
        // We will leave them in the queue. They will be retried (and idempotent operations will just overwrite).
        // CREATE operations might fail uniqueness checks next time, but we handle 23505.
        Logger.info('Sync paused due to network error.');
        return false;
    }
};

// --- User Role Functions (Unencrypted) ---

export const fetchUserRole = async (uid: string): Promise<UserRoleInfo | null> => {
    await openDB();
    const cachedRoleInfo = await getUserRoleFromDB(uid);
    
    if (cachedRoleInfo && navigator.onLine) {
        supabase
            .from('user_roles')
            .select('role, sections')
            .eq('id', uid)
            .single()
            .then(async ({ data }) => {
                if (data) {
                    const freshRoleInfo: UserRoleInfo = { role: data.role, sections: data.sections || [] };
                    if (JSON.stringify(freshRoleInfo) !== JSON.stringify(cachedRoleInfo)) {
                        await saveUserRoleToDB(uid, freshRoleInfo);
                        window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
                    }
                }
            });
        return cachedRoleInfo;
    }

    if (navigator.onLine) {
        const { data } = await supabase.from('user_roles').select('role, sections').eq('id', uid).single();
        if (data) {
            const roleInfo: UserRoleInfo = { role: data.role, sections: data.sections || [] };
            await saveUserRoleToDB(uid, roleInfo);
            return roleInfo;
        }
    }
    
    return cachedRoleInfo || null;
};

export const fetchAllUserRoles = async (actingUserRole: UserRole | null): Promise<{ uid: string; email: string; role: UserRole; sections: Section[] }[]> => {
    if (!navigator.onLine) return [];

    const { data, error } = await supabase.from('user_roles').select('*');
    if (error) throw error;

    return data.map(row => ({
        uid: row.id,
        email: row.email,
        role: row.role as UserRole,
        sections: row.sections || []
    }));
};

export const setUserRole = async (uid: string, email: string, role: UserRole): Promise<void> => {
    if (!navigator.onLine) throw new Error("Offline");
    const { error } = await supabase.from('user_roles').upsert({ id: uid, email, role });
    if (error) throw error;
    await saveUserRoleToDB(uid, { role, sections: [] });
};

export const updateUserRole = async (uid: string, newRole: UserRole, newSections: Section[], actingUserRole: UserRole | null, key: CryptoKey, shouldLog: boolean = true): Promise<void> => {
    let oldUserData: { role: UserRole, sections: Section[] } | null = null;
    if (shouldLog) {
        const { data: oldBoyData, error: fetchError } = await supabase
            .from('user_roles')
            .select('role, sections')
            .eq('id', uid)
            .single();
        if (fetchError) throw new Error(`Failed to fetch current user role for logging: ${fetchError.message}`);
        oldUserData = { role: oldBoyData.role, sections: oldBoyData.sections || [] };
    }

    const { error } = await supabase.from('user_roles').update({ role: newRole, sections: newSections }).eq('id', uid);
    if (error) throw error;

    await saveUserRoleToDB(uid, { role: newRole, sections: newSections });
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
    
    if (shouldLog && oldUserData) {
        const { data: { user } } = await supabase.auth.getUser();
        const { id, ...logData } = {
            userEmail: user?.email || 'Unknown',
            actionType: 'UPDATE_USER_ROLE',
            description: `Updated user role for UID ${uid} to ${newRole} with sections [${newSections.join(', ')}].`,
            revertData: { uid, oldRole: oldUserData.role, oldSections: oldUserData.sections }
        } as AuditLog;
        await createAuditLog(logData, null, key);
    }
};

export const deleteUserRole = async (uid: string, email: string, actingUserRole: UserRole | null, key: CryptoKey): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-user', {
        body: { uid }
    });

    if (error) {
        Logger.error("Edge function error:", error);
        throw new Error(`Failed to delete user: ${error.message}`);
    }

    await deleteUserRoleFromDB(uid);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));

    const { data: { user } } = await supabase.auth.getUser();
    const { id, ...logData } = {
        userEmail: user?.email || 'Unknown',
        actionType: 'DELETE_USER_ROLE',
        description: `Permanently deleted user ${email} and their account.`,
        revertData: { uid, email } 
    } as AuditLog;
    await createAuditLog(logData, null, key);
};

export const approveUser = async (uid: string, email: string, newRole: UserRole, newSections: Section[], actingUserRole: UserRole | null, key: CryptoKey): Promise<void> => {
    await updateUserRole(uid, newRole, newSections, actingUserRole, key, false);
    const { data: { user } } = await supabase.auth.getUser();
    const { id, ...logData } = {
        userEmail: user?.email || 'Unknown',
        actionType: 'APPROVE_USER',
        description: `Approved user ${email} with role ${newRole} and sections [${newSections.join(', ')}].`,
        revertData: { uid, oldRole: 'pending', oldSections: [] }
    } as AuditLog;
    await createAuditLog(logData, null, key);
};

export const denyUser = async (uid: string, email: string, actingUserRole: UserRole | null, key: CryptoKey): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-user', {
        body: { uid }
    });

    if (error) {
        Logger.error("Edge function error:", error);
        throw new Error(`Failed to delete user: ${error.message}`);
    }

    await deleteUserRoleFromDB(uid);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));

    const { data: { user } } = await supabase.auth.getUser();
    const { id, ...logData } = {
        userEmail: user?.email || 'Unknown',
        actionType: 'DENY_USER',
        description: `Denied access for user ${email}.`,
        revertData: { uid, email, role: 'pending' } 
    } as AuditLog;
    await createAuditLog(logData, null, key);
};

// --- Boy Functions (Encrypted) ---

export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section, key: CryptoKey): Promise<Boy> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    validateBoyMarks(boy as Boy, section);

    const newId = crypto.randomUUID();
    const newBoy = { ...boy, id: newId } as Boy;

    if (navigator.onLine) {
        const dbPayload = mapBoyToDB(newBoy);
        const { error } = await supabase.from(getTableName(section, 'boys')).insert(dbPayload);
        
        if (error) throw error;
        
        const encryptedBoy = await encryptData(newBoy, key);
        await saveBoyToDB(newBoy.id!, encryptedBoy, section);
        return newBoy;
    } else {
        const encryptedBoy = await encryptData(newBoy, key);
        await addPendingWrite({ type: 'CREATE_BOY', payload: encryptedBoy, section });
        await saveBoyToDB(newBoy.id!, encryptedBoy, section);
        return newBoy;
    }
};

export const fetchBoys = async (section: Section, key: CryptoKey): Promise<Boy[]> => {
    await openDB();
    const cachedEncryptedBoys = await getBoysFromDB(section);
    
    const cachedBoys: Boy[] = [];
    for (const { id, encryptedData } of cachedEncryptedBoys) {
        try {
            const decryptedBoy = await decryptData(encryptedData, key);
            cachedBoys.push(decryptedBoy as Boy);
        } catch (e) {
            Logger.error(`Failed to decrypt boy data for ID ${id}. Data may be corrupted or key changed.`, e);
        }
    }

    if (cachedBoys.length > 0) {
        if (navigator.onLine) {
            supabase.from(getTableName(section, 'boys')).select('*')
                .then(async ({ data }) => {
                    if (data) {
                        const freshBoys = data.map(mapBoyFromDB);
                        
                        const freshEncryptedPromises = freshBoys.map(async boy => ({
                            id: boy.id!,
                            encryptedData: await encryptData(boy, key)
                        }));
                        const freshEncrypted = await Promise.all(freshEncryptedPromises);
                        
                        if (freshEncrypted.length !== cachedEncryptedBoys.length || freshEncrypted[0]?.id !== cachedEncryptedBoys[0]?.id) {
                            Logger.info('Background update found for boys.');
                            await saveBoysToDB(freshEncrypted, section);
                            window.dispatchEvent(new CustomEvent('datarefreshed', { detail: { section } }));
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
        
        const encryptedBoysPromises = boys.map(async boy => ({
            id: boy.id!,
            encryptedData: await encryptData(boy, key)
        }));
        const encryptedBoys = await Promise.all(encryptedBoysPromises);
        
        await saveBoysToDB(encryptedBoys, section);
        return boys;
    }

    return [];
};

export const updateBoy = async (boy: Boy, section: Section, key: CryptoKey, shouldLog: boolean = true): Promise<Boy> => {
    if (!boy.id) throw new Error("No ID");
    validateBoyMarks(boy, section);

    let oldBoy: Boy | null = null;
    let boyToSave = boy;

    if (navigator.onLine) {
        // Optimistic Locking / Merge Strategy:
        // 1. Fetch remote version
        try {
            const { data: remoteData, error: fetchError } = await supabase
                .from(getTableName(section, 'boys'))
                .select('*')
                .eq('id', boy.id)
                .single();
            
            if (remoteData) {
                const remoteBoy = mapBoyFromDB(remoteData);
                oldBoy = remoteBoy;

                // Merge Marks:
                // We want to keep marks from 'boy' (local changes) but preserve marks from 'remoteBoy' that we didn't touch.
                // This naive merge prioritizes the local state for any conflicting dates,
                // but crucially, it keeps dates that exist in remote but NOT in local.
                const localDates = new Set(boy.marks.map(m => m.date));
                const remoteMarksToKeep = remoteBoy.marks.filter(m => !localDates.has(m.date));
                
                // New marks list = (Local Marks) + (Remote Marks that weren't in local)
                boyToSave = {
                    ...boy,
                    marks: [...boy.marks, ...remoteMarksToKeep].sort((a,b) => b.date.localeCompare(a.date))
                };
            }
        } catch (e) {
            Logger.warn("Failed to fetch remote boy for merging, proceeding with local overwrite.", e);
        }

        const dbPayload = mapBoyToDB(boyToSave);
        const { error } = await supabase
            .from(getTableName(section, 'boys'))
            .update(dbPayload)
            .eq('id', boy.id);
        if (error) throw error;
        
        const encryptedBoy = await encryptData(boyToSave, key);
        await saveBoyToDB(boy.id, encryptedBoy, section);
    } else {
        const encryptedBoy = await encryptData(boy, key);
        await addPendingWrite({ type: 'UPDATE_BOY', payload: encryptedBoy, section });
        await saveBoyToDB(boy.id, encryptedBoy, section);
    }

    if (shouldLog && oldBoy) {
        const changes: string[] = [];
        if (oldBoy.name !== boyToSave.name) changes.push(`name to "${boyToSave.name}"`);
        if (oldBoy.squad !== boyToSave.squad) changes.push(`squad to ${boyToSave.squad}`);
        if (oldBoy.year !== boyToSave.year) changes.push(`year to ${boyToSave.year}`);
        
        // Marks logging is simplified for brevity
        if (JSON.stringify(oldBoy.marks) !== JSON.stringify(boyToSave.marks)) {
            changes.push('marks');
        }

        if (changes.length > 0) {
            await createAuditLog({
                actionType: 'UPDATE_BOY',
                description: `Updated ${oldBoy.name}: changed ${changes.join(', ')}.`,
                revertData: { boyData: oldBoy },
            }, section, key);
        }
    }

    return boyToSave;
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

export const recreateBoy = async (boy: Boy, section: Section, key: CryptoKey): Promise<Boy> => {
    if (navigator.onLine) {
        const dbPayload = mapBoyToDB(boy);
        const { error } = await supabase.from(getTableName(section, 'boys')).upsert(dbPayload);
        if (error) throw error;
        
        const encryptedBoy = await encryptData(boy, key);
        await saveBoyToDB(boy.id!, encryptedBoy, section);
    } else {
        const encryptedBoy = await encryptData(boy, key);
        await addPendingWrite({ type: 'RECREATE_BOY', payload: encryptedBoy, section });
        await saveBoyToDB(boy.id!, encryptedBoy, section);
    }
    return boy;
};

export const fetchBoyById = async (id: string, section: Section, key: CryptoKey): Promise<Boy | undefined> => {
    const cachedEncrypted = await getBoyFromDB(id, section);
    
    if (cachedEncrypted) {
        try {
            const decryptedBoy = await decryptData(cachedEncrypted.encryptedData, key);
            return decryptedBoy as Boy;
        } catch (e) {
            Logger.error(`Failed to decrypt boy data for ID ${id}.`, e);
        }
    }

    if (navigator.onLine) {
        const { data } = await supabase.from(getTableName(section, 'boys')).select('*').eq('id', id).single();
        if (data) {
            const boy = mapBoyFromDB(data);
            const encryptedBoy = await encryptData(boy, key);
            await saveBoyToDB(boy.id!, encryptedBoy, section);
            return boy;
        }
    }
    return undefined;
};

// --- Audit Log Functions (Encrypted) ---

export const createAuditLog = async (
    log: Omit<AuditLog, 'id' | 'timestamp' | 'userEmail'> & { userEmail?: string }, 
    section: Section | null, 
    key: CryptoKey,
    shouldLog: boolean = true
): Promise<AuditLog | null> => {
    if (!shouldLog) return null;
    
    let userEmail = log.userEmail;
    if (!userEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        userEmail = user?.email || 'Unknown User';
    }

    const timestamp = Date.now();
    const logData = { ...log, userEmail, timestamp, id: undefined } as AuditLog; 
    const table = getTableName(section, 'audit_logs');

    if (navigator.onLine) {
        const encryptedRevertData = await encryptData(logData.revertData, key);
        const logForSupabase = { ...logData, revertData: encryptedRevertData };
        
        const dbPayload = mapLogToDB(logForSupabase);
        
        const { data, error } = await supabase
            .from(table)
            .insert(dbPayload)
            .select('id')
            .single();
        
        if (error) throw error;
        const newLog = { ...logData, id: data.id };
        
        const encryptedLog = await encryptData(newLog, key);
        await saveLogToDB(newLog.id!, encryptedLog, section);
        return newLog;
    } else {
        const tempId = `offline_${crypto.randomUUID()}`;
        const newLog = { ...logData, id: tempId };
        
        const encryptedLog = await encryptData(newLog, key);
        
        await addPendingWrite({ type: 'CREATE_AUDIT_LOG', payload: encryptedLog, tempId, section: section || undefined });
        await saveLogToDB(newLog.id!, encryptedLog, section);
        return newLog;
    }
};

export const fetchAuditLogs = async (section: Section | null, key: CryptoKey): Promise<AuditLog[]> => {
    await openDB();
    const cachedEncryptedLogs = await getLogsFromDB(section);
    const cachedEncryptedGlobal = await getLogsFromDB(null);
    const allEncryptedCached = [...cachedEncryptedLogs, ...cachedEncryptedGlobal];
    
    const allCached: AuditLog[] = [];
    for (const { id, encryptedData } of allEncryptedCached) {
        try {
            const decryptedLog = await decryptData(encryptedData, key);
            allCached.push(decryptedLog as AuditLog);
        } catch (e) {
            Logger.error(`Failed to decrypt log data for ID ${id}.`, e);
        }
    }
    
    allCached.sort((a,b) => b.timestamp - a.timestamp);

    // PERFORMANCE FIX: Pagination. Only fetch last 50 logs when online.
    if (navigator.onLine) {
        const fetchTable = async (tbl: string, sec: Section | null) => {
            const { data } = await supabase
                .from(tbl)
                .select('*')
                .order('timestamp', { ascending: false })
                .range(0, 49); // Limit to 50

            const logs = (data || []).map(async row => {
                const log = mapLogFromDB(row);
                if (log.revertData && log.revertData.ciphertext && log.revertData.iv) {
                    try {
                        log.revertData = await decryptData(log.revertData, key);
                    } catch (e) {
                        Logger.warn(`Could not decrypt revertData for log ${log.id}`, e);
                    }
                }
                return log;
            });
            const decryptedLogs = await Promise.all(logs);
            
            const encryptedLogsPromises = decryptedLogs.map(async log => ({
                id: log.id!,
                encryptedData: await encryptData(log, key)
            }));
            const encryptedLogs = await Promise.all(encryptedLogsPromises);
            
            await saveLogsToDB(encryptedLogs, sec);
            return decryptedLogs;
        };

        const [secLogs, globLogs] = await Promise.all([
            section ? fetchTable(getTableName(section, 'audit_logs'), section) : Promise.resolve([]),
            fetchTable('audit_logs', null) 
        ]);
        
        const fresh = [...secLogs, ...globLogs].sort((a,b) => b.timestamp - a.timestamp);
        return fresh; // Return mostly the fresh data, cached data might be stale or too large
    }

    return allCached;
};

export const deleteOldAuditLogs = async (section: Section): Promise<void> => {
    // COMPLIANCE FIX: Actual deletion logic
    if (navigator.onLine) {
        // Deletes logs older than 14 days
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        const table = getTableName(section, 'audit_logs');
        await supabase
            .from(table)
            .delete()
            .lt('timestamp', twoWeeksAgo.toISOString());
    }
};

export const clearAllAuditLogs = async (section: Section | null, email: string, role: UserRole | null): Promise<void> => {
    if (role !== 'admin') throw new Error("Permission denied");
    const table = getTableName(section, 'audit_logs');
    
    if (navigator.onLine) {
        const { error } = await supabase.from(table).delete().neq('id', '0'); 
        if (error) throw error;
    }
    await clearStore(table);
};

export const clearAllLocalData = clearAllLocalDataFromDB;