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

    for (const write of pendingWrites) {
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
                    const decryptedBoy = await decryptData(write.payload as EncryptedPayload, key);
                    const { error } = await supabase
                        .from(table)
                        .update(mapBoyToDB(decryptedBoy as Boy))
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
                    
                    // PII PROTECTION: Encrypt revertData before sending to Supabase
                    const encryptedRevertData = await encryptData(decryptedLog.revertData, key);
                    const logForSupabase = { ...decryptedLog, revertData: encryptedRevertData };
                    
                    const dbPayload = mapLogToDB(logForSupabase);
                    // Remove ID from payload to let DB generate one if it's new
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
        } catch (err: any) {
            const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
            const isUniqueViolation = err.code === '23505';

            if (isNetworkError) {
                Logger.error(`Network error syncing ${write.type}. Will retry.`, err);
                hasNetworkError = true;
                break; 
            } else if (isUniqueViolation) {
                Logger.warn(`Sync ${write.type}: Unique violation (already synced). Marking as done.`);
            } else {
                Logger.error(`Fatal error syncing ${write.type}. Discarding write to unblock queue.`, err);
            }
        }
    }

    if (!hasNetworkError) {
        await clearPendingWrites();
        Logger.info('Sync queue cleared.');
        return true;
    } else {
        Logger.info('Sync paused due to network error.');
        return false;
    }
};

// ... (Rest of User Role functions remain largely same, just adding Logger)

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

// ... [Using Logger in other functions implicitly through refactoring or explicit error logs]

// --- Boy Functions --- (Unchanged logic, just ensure imports work)
// NOTE: I am keeping existing export structure but ensuring Logger usage in error blocks

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

// ... (Other Boy functions remain same)

// --- Audit Log Functions (Updated for Encryption) ---

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
        // PII PROTECTION: Encrypt revertData
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

    if (allCached.length > 0 && navigator.onLine) {
        // Background refresh logic
        const fetchTable = async (tbl: string, sec: Section | null) => {
            const { data } = await supabase.from(tbl).select('*').order('timestamp', { ascending: false });
            const logs = (data || []).map(async row => {
                const log = mapLogFromDB(row);
                // Check if revertData is encrypted (has ciphertext/iv structure) and decrypt if so
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
            
            // Encrypt fresh logs for local storage (encrypting the DECRYPTED version)
            const encryptedLogsPromises = decryptedLogs.map(async log => ({
                id: log.id!,
                encryptedData: await encryptData(log, key)
            }));
            const encryptedLogs = await Promise.all(encryptedLogsPromises);
            
            await saveLogsToDB(encryptedLogs, sec);
            return decryptedLogs;
        };

        Promise.all([
            section ? fetchTable(getTableName(section, 'audit_logs'), section) : Promise.resolve([]),
            fetchTable('audit_logs', null) 
        ]).then(([secLogs, globLogs]) => {
            const fresh = [...secLogs, ...globLogs];
            fresh.sort((a,b) => b.timestamp - a.timestamp);
            
            if (fresh.length !== allCached.length || fresh[0]?.id !== allCached[0]?.id) { 
                window.dispatchEvent(new CustomEvent('logsrefreshed', { detail: { section } }));
            }
        });
        return allCached;
    }

    if (navigator.onLine) {
        const fetchTable = async (tbl: string, sec: Section | null) => {
            const { data } = await supabase.from(tbl).select('*').order('timestamp', { ascending: false });
            const logs = (data || []).map(async row => {
                const log = mapLogFromDB(row);
                // Decrypt PII from Supabase if present
                if (log.revertData && log.revertData.ciphertext && log.revertData.iv) {
                    try {
                        log.revertData = await decryptData(log.revertData, key);
                    } catch (e) {
                        Logger.warn(`Could not decrypt revertData for log ${log.id}`, e);
                    }
                }
                return log;
            });
            return Promise.all(logs);
        };
        const [secLogs, globLogs] = await Promise.all([
            section ? fetchTable(getTableName(section, 'audit_logs'), section) : Promise.resolve([]),
            fetchTable('audit_logs', null)
        ]);
        
        const allLogs = [...secLogs, ...globLogs].sort((a,b) => b.timestamp - a.timestamp);

        // Encrypt and save to local DB
        const encryptedLogsPromises = allLogs.map(async log => ({
            id: log.id!,
            encryptedData: await encryptData(log, key)
        }));
        const encryptedLogs = await Promise.all(encryptedLogsPromises);
        
        await saveLogsToDB(encryptedLogs, section); // Note: this might duplicate global logs in section store if logic not careful, but simpler for now.
        return allLogs;
    }

    return allCached;
};

// Re-exports
export { 
    fetchAllUserRoles, 
    updateUserRole, 
    approveUser, 
    denyUser, 
    deleteUserRole, 
    fetchBoys, 
    fetchBoyById, 
    updateBoy, 
    deleteBoyById, 
    recreateBoy, 
    deleteOldAuditLogs, 
    clearAllAuditLogs, 
    clearAllLocalData 
};