import { supabase } from '@/src/integrations/supabase/client';
import { Section, UserRole } from '../types';
import { clearStore, clearAllLocalDataFromDB } from './offlineDb';
import { getTableName } from './mappers';

// Re-exports
export { createBoy, fetchBoys, updateBoy, deleteBoyById, recreateBoy, fetchBoyById } from './boyService';
export { createAuditLog, fetchAuditLogs } from './auditService';
export { fetchUserRole, fetchAllUserRoles, updateUserRole, deleteUserRole, approveUser, denyUser } from './userService';
export { syncPendingWrites } from './syncService';

// Misc functions that fit nowhere else yet or are simple enough to stay here for now to avoid creating 10 files
export const deleteOldAuditLogs = async (section: Section): Promise<void> => {
    if (navigator.onLine) {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        await supabase.from(getTableName(section, 'audit_logs')).delete().lt('timestamp', twoWeeksAgo.toISOString());
    }
};

export const clearAllAuditLogs = async (section: Section | null, email: string, role: UserRole | null): Promise<void> => {
    if (role !== 'admin') throw new Error("Permission denied");
    const table = getTableName(section, 'audit_logs');
    if (navigator.onLine) await supabase.from(table).delete().neq('id', '0'); 
    await clearStore(table);
};

export const exportDatabaseJSON = async (): Promise<string> => {
    const tables = ['company_boys', 'junior_boys', 'company_audit_logs', 'junior_audit_logs', 'global_audit_logs'];
    const backup: any = {};
    if (!navigator.onLine) throw new Error("Must be online to perform backup");
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw new Error(`Backup failed: ${error.message}`);
        backup[table] = data;
    }
    return JSON.stringify(backup, null, 2);
};

export const clearAllLocalData = clearAllLocalDataFromDB;