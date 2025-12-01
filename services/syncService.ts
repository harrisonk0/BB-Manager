import { supabase } from '@/src/integrations/supabase/client';
import { EncryptedPayload, PendingWrite } from '../types';
import { decryptData, encryptData } from './crypto';
import { Logger } from './logger';
import { getPendingWrites, clearPendingWrites, addToDLQ, saveLogToDB, deleteLogFromDB } from './offlineDb';
import { mapBoyToDB, mapLogToDB, getTableName } from './mappers';

export const syncPendingWrites = async (key: CryptoKey): Promise<boolean> => {
    if (!navigator.onLine) return false;
    const pendingWrites = await getPendingWrites();
    if (pendingWrites.length === 0) return true;

    Logger.info(`Syncing ${pendingWrites.length} offline writes...`);
    let hasNetworkError = false;

    const processWrite = async (write: PendingWrite) => {
        const table = write.section ? getTableName(write.section, 'boys') : '';
        const logsTable = getTableName(write.section || null, 'audit_logs');

        try {
            switch (write.type) {
                case 'CREATE_BOY': {
                    const decrypted = await decryptData(write.payload as EncryptedPayload, key);
                    const { error } = await supabase.from(table).insert(mapBoyToDB(decrypted));
                    if (error) throw error;
                    break;
                }
                case 'UPDATE_BOY': {
                    const decrypted = await decryptData(write.payload as EncryptedPayload, key);
                    const rpcName = write.section === 'company' ? 'upsert_company_marks' : 'upsert_junior_marks';
                    const payload = mapBoyToDB(decrypted);
                    await supabase.from(table).update({ name: payload.name, squad: payload.squad, year: payload.year, is_squad_leader: payload.is_squad_leader }).eq('id', decrypted.id);
                    const { error } = await supabase.rpc(rpcName, { p_boy_id: decrypted.id, p_new_marks: payload.marks });
                    if (error) throw error;
                    break;
                }
                case 'DELETE_BOY': {
                    const { error } = await supabase.from(table).delete().eq('id', write.payload.id);
                    if (error) throw error;
                    break;
                }
                case 'RECREATE_BOY': {
                    const decrypted = await decryptData(write.payload as EncryptedPayload, key);
                    const { error } = await supabase.from(table).upsert(mapBoyToDB(decrypted));
                    if (error) throw error;
                    break;
                }
                case 'CREATE_AUDIT_LOG': {
                    const decrypted = await decryptData(write.payload as EncryptedPayload, key);
                    const encryptedRevert = await encryptData(decrypted.revertData, key);
                    const payload = mapLogToDB({ ...decrypted, revertData: encryptedRevert });
                    delete payload.id; // Let DB generate ID
                    const { data, error } = await supabase.from(logsTable).insert(payload).select('id').single();
                    if (error) throw error;
                    if (write.tempId) {
                        const newLog = { ...decrypted, id: data.id };
                        const encLog = await encryptData(newLog, key);
                        await saveLogToDB(data.id, encLog, write.section || null);
                        await deleteLogFromDB(write.tempId, write.section || null);
                    }
                    break;
                }
            }
        } catch (err: any) {
            const isNetwork = err.message === 'Failed to fetch' || err.name === 'TypeError';
            if (isNetwork) {
                hasNetworkError = true;
                Logger.error(`Network error syncing ${write.type}.`, err);
            } else if (err.code !== '23505') { // Ignore unique violations
                Logger.error(`Fatal error syncing ${write.type}.`, err);
                await addToDLQ(write, err.message);
            }
        }
    };

    const BATCH_SIZE = 5;
    for (let i = 0; i < pendingWrites.length; i += BATCH_SIZE) {
        if (hasNetworkError) break;
        await Promise.all(pendingWrites.slice(i, i + BATCH_SIZE).map(processWrite));
    }

    if (!hasNetworkError) {
        await clearPendingWrites();
        return true;
    }
    return false;
};