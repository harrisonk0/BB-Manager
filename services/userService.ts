import { supabase } from '@/src/integrations/supabase/client';
import { UserRole, UserRoleInfo, Section } from '../types';
import { openDB, saveUserRoleToDB, getUserRoleFromDB, deleteUserRoleFromDB } from './offlineDb';
import { createAuditLog } from './auditService';
import { Logger } from './logger';

export const fetchUserRole = async (uid: string): Promise<UserRoleInfo | null> => {
    await openDB();
    const cached = await getUserRoleFromDB(uid);
    
    if (navigator.onLine) {
        const { data } = await supabase.from('user_roles').select('role, sections').eq('id', uid).single();
        if (data) {
            const fresh = { role: data.role, sections: data.sections || [] };
            if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
                await saveUserRoleToDB(uid, fresh);
                window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
            }
            return fresh;
        }
    }
    return cached || null;
};

export const fetchAllUserRoles = async (actingUserRole: UserRole | null): Promise<{ uid: string; email: string; role: UserRole; sections: Section[] }[]> => {
    if (!navigator.onLine) return [];
    const { data, error } = await supabase.from('user_roles').select('*');
    if (error) throw error;
    return data.map(row => ({ uid: row.id, email: row.email, role: row.role as UserRole, sections: row.sections || [] }));
};

export const updateUserRole = async (uid: string, newRole: UserRole, newSections: Section[], actingUserRole: UserRole | null, key: CryptoKey): Promise<void> => {
    const { error } = await supabase.from('user_roles').update({ role: newRole, sections: newSections }).eq('id', uid);
    if (error) throw error;
    await saveUserRoleToDB(uid, { role: newRole, sections: newSections });
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
    
    await createAuditLog({
        actionType: 'UPDATE_USER_ROLE',
        description: `Updated user role for UID ${uid} to ${newRole}.`,
        revertData: { uid }
    }, null, key);
};

export const deleteUserRole = async (uid: string, email: string, actingUserRole: UserRole | null, key: CryptoKey): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-user', { body: { uid } });
    if (error) throw new Error(error.message);
    await deleteUserRoleFromDB(uid);
    window.dispatchEvent(new CustomEvent('userrolerefresh', { detail: { uid } }));
    await createAuditLog({ actionType: 'DELETE_USER_ROLE', description: `Deleted user ${email}.`, revertData: { uid, email } }, null, key);
};

export const approveUser = async (uid: string, email: string, newRole: UserRole, newSections: Section[], actingUserRole: UserRole | null, key: CryptoKey): Promise<void> => {
    await updateUserRole(uid, newRole, newSections, actingUserRole, key);
    await createAuditLog({ actionType: 'APPROVE_USER', description: `Approved user ${email}.`, revertData: { uid } }, null, key);
};

export const denyUser = async (uid: string, email: string, actingUserRole: UserRole | null, key: CryptoKey): Promise<void> => {
    await deleteUserRole(uid, email, actingUserRole, key);
    await createAuditLog({ actionType: 'DENY_USER', description: `Denied user ${email}.`, revertData: { uid } }, null, key);
};