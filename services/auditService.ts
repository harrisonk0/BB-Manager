import { supabase } from '@/src/integrations/supabase/client';
import { AuditLog, Section } from '../types';
import { encryptData, decryptData } from './crypto';
import { Logger } from './logger';
import { openDB, getLogsFromDB, saveLogsToDB, saveLogToDB, deleteLogFromDB, addPendingWrite } from './offlineDb';
import { mapLogToDB, mapLogFromDB, getTableName, deepEqual } from './mappers';

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

    const newLog = { ...log, userEmail, timestamp: Date.now(), id: undefined, section } as AuditLog;
    const table = getTableName(section, 'audit_logs');

    if (navigator.onLine) {
        const encryptedRevertData = await encryptData(newLog.revertData, key);
        const { data, error } = await supabase.from(table).insert(mapLogToDB({ ...newLog, revertData: encryptedRevertData })).select('id').single();
        if (error) throw error;
        
        const finalLog = { ...newLog, id: data.id };
        await saveLogToDB(finalLog.id!, await encryptData(finalLog, key), section);
        return finalLog;
    } else {
        const tempId = `offline_${crypto.randomUUID()}`;
        const finalLog = { ...newLog, id: tempId };
        const encrypted = await encryptData(finalLog, key);
        await addPendingWrite({ type: 'CREATE_AUDIT_LOG', payload: encrypted, tempId, section: section || undefined });
        await saveLogToDB(tempId, encrypted, section);
        return finalLog;
    }
};

export const fetchAuditLogs = async (section: Section | null, key: CryptoKey): Promise<AuditLog[]> => {
    await openDB();
    // Fetch all cached logs (both section-specific and global)
    const cached = [...await getLogsFromDB(section), ...await getLogsFromDB(null)];
    const decryptedLogs: AuditLog[] = [];
    
    for (const { id, encryptedData } of cached) {
        try { decryptedLogs.push(await decryptData(encryptedData, key) as AuditLog); } 
        catch (e) { Logger.error(`Failed to decrypt log ${id}.`, e); }
    }
    decryptedLogs.sort((a,b) => b.timestamp - a.timestamp);

    if (navigator.onLine) {
        const fetchTable = async (tbl: string, sec: Section | null) => {
            const { data } = await supabase.from(tbl).select('*').order('timestamp', { ascending: false }).range(0, 49);
            const freshLogs = await Promise.all((data || []).map(async row => {
                const log = mapLogFromDB(row, sec);
                // Decrypt revertData if present
                if (log.revertData?.ciphertext) log.revertData = await decryptData(log.revertData, key);
                return log;
            }));
            
            // Compare fresh logs against cached logs for this section/global
            const cachedForSection = decryptedLogs.filter(log => log.section === sec);
            
            const isDataDifferent = freshLogs.length !== cachedForSection.length || 
                                    !freshLogs.every(freshLog => 
                                        cachedForSection.some(cachedLog => 
                                            cachedLog.id === freshLog.id && deepEqual(cachedLog, freshLog)
                                        )
                                    );

            if (isDataDifferent) {
                Logger.info(`Audit log data change detected in ${sec || 'global'}. Updating cache.`);
                const encrypted = await Promise.all(freshLogs.map(async log => ({ id: log.id!, encryptedData: await encryptData(log, key) })));
                await saveLogsToDB(encrypted, sec);
                window.dispatchEvent(new CustomEvent('logsrefreshed', { detail: { section: sec } }));
            }
            
            return freshLogs;
        };

        const [secLogs, globLogs] = await Promise.all([
            section ? fetchTable(getTableName(section, 'audit_logs'), section) : Promise.resolve([]),
            fetchTable('audit_logs', null)
        ]);
        return [...secLogs, ...globLogs].sort((a,b) => b.timestamp - a.timestamp);
    }
    return decryptedLogs;
};