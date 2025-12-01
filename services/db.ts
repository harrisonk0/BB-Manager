/**
 * @file db.ts
 * @description Central data layer abstracted for Supabase and IndexedDB.
 */

import { supabase } from '@/src/integrations/supabase/client';
import { Boy, AuditLog, Section, UserRole, UserRoleInfo, EncryptedPayload, PendingWrite } from '../types';
import { encryptData, decryptData } from './crypto';
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
    
    // Only include ID if it exists (for updates/reverts of existing logs)
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

    console.log(`Syncing ${pendingWrites.length} offline writes to Supabase...`);

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
                    
                    // ID is now generated client-side, so dbPayload already contains the UUID.
                    const { error } = await supabase
                        .from(table)
                        .insert(dbPayload);
                    
                    if (error) throw error;
                    // No ID swap needed anymore.
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
                    const { error } = await supabase
                        .from(table)
                        .delete()
                        .eq('id', write.payload.id);
                    if (error) throw error;
                    break;
                }
                case 'RECREATE_BOY': {
                    const decryptedBoy = await decryptData(write.payload as EncryptedPayload, key);
                    const { error } = await supabase
                        .from(table)
                        .upsert(mapBoyToDB(decryptedBoy as Boy));
                    if (error) throw error;
                    break;
                }
                case 'CREATE_AUDIT_LOG': {
                    const decryptedLog = await decryptData(write.payload as EncryptedPayload, key);
                    const logForMapping = { ...decryptedLog, id: undefined } as AuditLog; 
                    const dbPayload = mapLogToDB(logForMapping);
                    
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
                    const { error } = await supabase
                        .from(rolesTable)
                        .delete()
                        .eq('id', write.payload.uid);
                    if (error) throw error;
                    break;
                }
            }
        } catch (err: any) {
            // Check for Network Error (Retry) vs Data/Logic Error (Discard)
            // fetch throws TypeError on network failure.
            const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
            
            // Handle Postgres "Unique Violation" (23505) as success (idempotency)
            const isUniqueViolation = err.code === '23505';

            if (isNetworkError) {
                console.error(`Network error syncing ${write.type}. Will retry.`, err);
                hasNetworkError = true;
                // Stop processing subsequent writes to maintain order
                break; 
            } else if (isUniqueViolation) {
                console.warn(`Sync ${write.type}: Unique violation (already synced). Marking as done.`);
                // Allow loop to continue, this write will be cleared.
            } else {
                // Poison Pill: Client error (e.g. 4xx, validation, RLS violation).
                // We cannot fix this by retrying. Log it and discard it.
                console.error(`Fatal error syncing ${write.type}. Discarding write to unblock queue.`, err, write);
                // Allow loop to continue, this write will be cleared.
            }
        }
    }

    // Only clear pending writes if we didn't stop due to a network error.
    // NOTE: This assumes sequential processing. If we broke the loop, we shouldn't clear the queue.
    if (!hasNetworkError) {
        await clearPendingWrites();
        console.log('Sync queue cleared.');
        return true;
    } else {
        console.log('Sync paused due to network error.');
        return false;
    }
};

// --- User Role Functions (Unencrypted) ---

export const fetchUserRole = async (uid: string): Promise<UserRoleInfo | null> => {
    await openDB();
    const cachedRoleInfo = await getUserRoleFromDB(uid);
    
    if (cachedRoleInfo && navigator.onLine) {
        // Background update
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
    // SECURITY: Use Edge Function to delete user from Auth and cleanup user_roles table.
    const { error } = await supabase.functions.invoke('delete-user', {
        body: { uid }
    });

    if (error) {
        console.error("Edge function error:", error);
        throw new Error(`Failed to delete user: ${error.message}`);
    }

    // Cleanup local state
    await deleteUserRoleFromDB(uid);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));

    const { data: { user } } = await supabase.auth.getUser();
    // Ensure no ID is passed to createAuditLog
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
    // SECURITY: We use an Edge Function here because client-side code cannot delete users from Auth.
    const { error } = await supabase.functions.invoke('delete-user', {
        body: { uid }
    });

    if (error) {
        console.error("Edge function error:", error);
        throw new Error(`Failed to delete user: ${error.message}`);
    }

    // Cleanup local state
    await deleteUserRoleFromDB(uid);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));

    const { data: { user } } = await supabase.auth.getUser();
    // Ensure no ID is passed to createAuditLog
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

    // FIXED: Generate UUID client-side to prevent duplicates on partial failures
    const newId = crypto.randomUUID();
    const newBoy = { ...boy, id: newId } as Boy;

    if (navigator.onLine) {
        const dbPayload = mapBoyToDB(newBoy);
        // We supply the ID, so no need to select it back.
        const { error } = await supabase
            .from(getTableName(section, 'boys'))
            .insert(dbPayload);
        
        if (error) throw error;
        
        // Encrypt and save to local DB
        const encryptedBoy = await encryptData(newBoy, key);
        await saveBoyToDB(newBoy.id!, encryptedBoy, section);
        return newBoy;
    } else {
        // Offline: ID is already a valid UUID, so no tempId swap needed later.
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
            console.error(`Failed to decrypt boy data for ID ${id}. Data may be corrupted or key changed.`, e);
            // If decryption fails, skip this record.
        }
    }

    if (cachedBoys.length > 0) {
        if (navigator.onLine) {
            // Background fetch
            supabase.from(getTableName(section, 'boys')).select('*')
                .then(async ({ data }) => {
                    if (data) {
                        const freshBoys = data.map(mapBoyFromDB);
                        
                        // Encrypt fresh data for comparison and storage
                        const freshEncryptedPromises = freshBoys.map(async boy => ({
                            id: boy.id!,
                            encryptedData: await encryptData(boy, key)
                        }));
                        const freshEncrypted = await Promise.all(freshEncryptedPromises);
                        
                        // Simple check: if the number of records or the ID of the first record differs, refresh.
                        if (freshEncrypted.length !== cachedEncryptedBoys.length || freshEncrypted[0]?.id !== cachedEncryptedBoys[0]?.id) {
                            console.log('Background update found for boys.');
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
        
        // Encrypt and save to local DB
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
    if (shouldLog && navigator.onLine) {
        // Fetch old data from Supabase for logging purposes
        try {
            const { data: oldBoyData, error: fetchError } = await supabase
                .from(getTableName(section, 'boys'))
                .select('*')
                .eq('id', boy.id)
                .single();
            
            if (fetchError) {
                console.warn(`Could not fetch old boy data for logging: ${fetchError.message}`);
            } else if (oldBoyData) {
                oldBoy = mapBoyFromDB(oldBoyData);
            }
        } catch (e) {
            console.warn(`Could not fetch old boy data for logging:`, e);
        }
    }

    // Save to Supabase and local DB
    if (navigator.onLine) {
        const dbPayload = mapBoyToDB(boy);
        const { error } = await supabase
            .from(getTableName(section, 'boys'))
            .update(dbPayload)
            .eq('id', boy.id);
        if (error) throw error;
        
        // Encrypt and save to local DB
        const encryptedBoy = await encryptData(boy, key);
        await saveBoyToDB(boy.id, encryptedBoy, section);
    } else {
        // Encrypt payload for pending write and local storage
        const encryptedBoy = await encryptData(boy, key);
        await addPendingWrite({ type: 'UPDATE_BOY', payload: encryptedBoy, section });
        await saveBoyToDB(boy.id, encryptedBoy, section);
    }

    if (oldBoy) {
        const changes: string[] = [];
        if (oldBoy.name !== boy.name) changes.push(`name to "${boy.name}"`);
        if (oldBoy.squad !== boy.squad) changes.push(`squad to ${boy.squad}`);
        if (oldBoy.year !== boy.year) changes.push(`year to ${boy.year}`);
        if (!!oldBoy.isSquadLeader !== !!boy.isSquadLeader) changes.push(`squad leader status to ${boy.isSquadLeader}`);
        if (JSON.stringify(oldBoy.marks) !== JSON.stringify(boy.marks)) {
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

    return boy;
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
    if (navigator.onLine) {
        const { error } = await supabase.from(getTableName(section, 'boys')).delete().eq('id', id);
        if (error) throw error;
        await deleteBoyFromDB(id, section);
    } else {
        // Payload is just { id: string }, no encryption needed for deletion metadata
        await addPendingWrite({ type: 'DELETE_BOY', payload: { id }, section });
        await deleteBoyFromDB(id, section);
    }
};

export const recreateBoy = async (boy: Boy, section: Section, key: CryptoKey): Promise<Boy> => {
    if (navigator.onLine) {
        const dbPayload = mapBoyToDB(boy);
        const { error } = await supabase.from(getTableName(section, 'boys')).upsert(dbPayload);
        if (error) throw error;
        
        // Encrypt and save to local DB
        const encryptedBoy = await encryptData(boy, key);
        await saveBoyToDB(boy.id!, encryptedBoy, section);
    } else {
        // Encrypt payload for pending write and local storage
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
            console.error(`Failed to decrypt boy data for ID ${id}.`, e);
            // Fall through to network fetch if decryption fails
        }
    }

    if (navigator.onLine) {
        const { data } = await supabase.from(getTableName(section, 'boys')).select('*').eq('id', id).single();
        if (data) {
            const boy = mapBoyFromDB(data);
            
            // Encrypt and save to local DB
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
        const dbPayload = mapLogToDB(logData);
        
        const { data, error } = await supabase
            .from(table)
            .insert(dbPayload)
            .select('id')
            .single();
        
        if (error) throw error;
        const newLog = { ...logData, id: data.id };
        
        // Encrypt and save to local DB
        const encryptedLog = await encryptData(newLog, key);
        await saveLogToDB(newLog.id!, encryptedLog, section);
        return newLog;
    } else {
        const tempId = `offline_${crypto.randomUUID()}`;
        const newLog = { ...logData, id: tempId };
        
        // Encrypt payload for pending write and local storage
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
            console.error(`Failed to decrypt log data for ID ${id}.`, e);
        }
    }
    
    // Sort by timestamp after decryption
    allCached.sort((a,b) => b.timestamp - a.timestamp);

    if (allCached.length > 0 && navigator.onLine) {
        // Background refresh
        const fetchTable = async (tbl: string, sec: Section | null) => {
            const { data } = await supabase.from(tbl).select('*').order('timestamp', { ascending: false });
            const logs = (data || []).map(row => mapLogFromDB(row));
            
            // Encrypt fresh logs for storage
            const encryptedLogsPromises = logs.map(async log => ({
                id: log.id!,
                encryptedData: await encryptData(log, key)
            }));
            const encryptedLogs = await Promise.all(encryptedLogsPromises);
            
            await saveLogsToDB(encryptedLogs, sec);
            return logs;
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
            const logs = (data || []).map(row => mapLogFromDB(row));
            
            // Encrypt and save to local DB
            const encryptedLogsPromises = logs.map(async log => ({
                id: log.id!,
                encryptedData: await encryptData(log, key)
            }));
            const encryptedLogs = await Promise.all(encryptedLogsPromises);
            
            await saveLogsToDB(encryptedLogs, sec);
            return logs;
        };
        const [secLogs, globLogs] = await Promise.all([
            section ? fetchTable(getTableName(section, 'audit_logs'), section) : Promise.resolve([]),
            fetchTable('audit_logs', null)
        ]);
        
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
        const { error } = await supabase.from(table).delete().neq('id', '0'); 
        if (error) throw error;
    }
    await clearStore(table);
};

// Export the comprehensive local data clearing function
export const clearAllLocalData = clearAllLocalDataFromDB;