import { supabase } from '@/integrations/supabase/client';
import { Boy, AuditLog, Section, InviteCode, UserRole } from '../types';
import { 
    openDB, 
    getBoysFromDB, 
    saveBoysToDB, 
    saveBoyToDB, 
    addPendingWrite, 
    getPendingWrites, 
    clearPendingWrites, 
    getLogsFromDB, 
    saveLogsToDB, 
    deleteBoyFromDB, 
    deleteLogFromDB, 
    saveLogToDB, 
    saveInviteCodeToDB, 
    getInviteCodeFromDB, 
    getAllInviteCodesFromDB, 
    saveUserRoleToDB, 
    getUserRoleFromDB, 
    deleteUserRoleFromDB,
    clearStore,
    clearAllInviteCodesFromDB,
    clearAllUserRolesFromDB
} from './offlineDb';

// --- Sync Function ---
export const syncPendingWrites = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    const pendingWrites = await getPendingWrites();
    if (pendingWrites.length === 0) return true;

    console.log(`Syncing ${pendingWrites.length} offline writes to Supabase...`);
    
    // Process writes sequentially for Supabase
    for (const write of pendingWrites) {
        try {
            switch (write.type) {
                case 'CREATE_BOY': {
                    const { data, error } = await supabase
                        .from('boys')
                        .insert([{ ...write.payload, section: write.section }]) // Add section explicitly
                        .select()
                        .single();
                    
                    if (error) throw error;
                    
                    // Update local ID
                    if (write.tempId && data) {
                        await deleteBoyFromDB(write.tempId, write.section!);
                        await saveBoyToDB(mapBoyFromDB(data), write.section!);
                    }
                    break;
                }
                case 'UPDATE_BOY': {
                    const { error } = await supabase
                        .from('boys')
                        .update(write.payload)
                        .eq('id', write.payload.id);
                    if (error) throw error;
                    break;
                }
                case 'DELETE_BOY': {
                    const { error } = await supabase
                        .from('boys')
                        .delete()
                        .eq('id', write.payload.id);
                    if (error) throw error;
                    break;
                }
                case 'RECREATE_BOY': {
                    const { error } = await supabase
                        .from('boys')
                        .insert([{ ...write.payload, section: write.section }]);
                    if (error) throw error;
                    break;
                }
                case 'CREATE_AUDIT_LOG': {
                    const logPayload = {
                        ...write.payload,
                        timestamp: new Date(write.payload.timestamp || Date.now()).getTime(), // Ensure number for local
                        created_at: new Date().toISOString(),
                        section: write.section || null,
                        // Map camelCase to snake_case for DB
                        user_email: write.payload.userEmail,
                        action_type: write.payload.actionType,
                        revert_data: write.payload.revertData,
                        reverted_log_id: write.payload.revertedLogId
                    };
                    
                    // Clean up old keys
                    delete logPayload.userEmail;
                    delete logPayload.actionType;
                    delete logPayload.revertData;
                    delete logPayload.revertedLogId;

                    const { data, error } = await supabase
                        .from('audit_logs')
                        .insert([logPayload])
                        .select()
                        .single();

                    if (error) throw error;

                    if (write.tempId && data) {
                       await deleteLogFromDB(write.tempId, write.section || null);
                       const localLog = mapAuditLogFromDB(data);
                       await saveLogToDB(localLog, write.section || null);
                    }
                    break;
                }
                // Add other cases as needed
            }
        } catch (err) {
            console.error("Error syncing write:", write, err);
        }
    }
    
    await clearPendingWrites();
    console.log('Sync successful.');
    return true;
};

// Helper to map Supabase DB result (snake_case) to App Type (camelCase)
const mapAuditLogFromDB = (data: any): AuditLog => ({
    id: data.id,
    timestamp: data.timestamp, 
    userEmail: data.user_email,
    actionType: data.action_type,
    description: data.description,
    revertData: data.revert_data,
    revertedLogId: data.reverted_log_id,
    section: data.section
});

const mapBoyFromDB = (data: any): Boy => ({
    ...data,
    marks: Array.isArray(data.marks) ? data.marks : []
});

const mapInviteCodeFromDB = (data: any): InviteCode => ({
    id: data.id,
    generatedBy: data.generated_by,
    generatedAt: data.generated_at,
    section: data.section,
    isUsed: data.is_used,
    usedBy: data.used_by,
    usedAt: data.used_at,
    revoked: data.revoked,
    defaultUserRole: data.default_user_role,
    expiresAt: data.expires_at
});

// --- Boy Functions ---
export const fetchBoys = async (section: Section): Promise<Boy[]> => {
    await openDB();
    
    const cachedBoys = await getBoysFromDB(section);
    
    if (navigator.onLine) {
        supabase
            .from('boys')
            .select('*')
            .eq('section', section)
            .then(({ data, error }) => {
                if (!error && data) {
                    const freshBoys = data.map(mapBoyFromDB);
                    if (JSON.stringify(freshBoys) !== JSON.stringify(cachedBoys)) {
                        saveBoysToDB(freshBoys, section).then(() => {
                            window.dispatchEvent(new CustomEvent('datarefreshed', { detail: { section } }));
                        });
                    }
                }
            });
        
        if (cachedBoys.length === 0) {
             const { data, error } = await supabase.from('boys').select('*').eq('section', section);
             if (error) throw error;
             const boys = data.map(mapBoyFromDB);
             await saveBoysToDB(boys, section);
             return boys;
        }
    }
    return cachedBoys;
};

export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section): Promise<Boy> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    if (navigator.onLine) {
        const { data, error } = await supabase
            .from('boys')
            .insert([{ ...boy, section }])
            .select()
            .single();
        
        if (error) throw error;
        const newBoy = mapBoyFromDB(data);
        await saveBoyToDB(newBoy, section);
        return newBoy;
    } else {
        const tempId = `offline_${crypto.randomUUID()}`;
        const newBoy: Boy = { ...boy, id: tempId };
        await addPendingWrite({ type: 'CREATE_BOY', payload: boy, tempId, section });
        await saveBoyToDB(newBoy, section);
        return newBoy;
    }
};

export const updateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (navigator.onLine) {
        const { error } = await supabase
            .from('boys')
            .update({ 
                name: boy.name, 
                squad: boy.squad, 
                year: boy.year, 
                is_squad_leader: boy.isSquadLeader,
                marks: boy.marks 
            })
            .eq('id', boy.id);
        if (error) throw error;
    } else {
        await addPendingWrite({ type: 'UPDATE_BOY', payload: boy, section });
    }
    await saveBoyToDB(boy, section);
    return boy;
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
    if (navigator.onLine) {
        const { error } = await supabase.from('boys').delete().eq('id', id);
        if (error) throw error;
    } else {
        await addPendingWrite({ type: 'DELETE_BOY', payload: { id }, section });
    }
    await deleteBoyFromDB(id, section);
};

export const fetchBoyById = async (id: string, section: Section): Promise<Boy | undefined> => {
    const cached = await getBoysFromDB(section);
    return cached.find(b => b.id === id);
};

export const recreateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    return createBoy(boy, section);
};

// --- Audit Logs ---
export const createAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>, section: Section | null, shouldLog: boolean = true): Promise<AuditLog | null> => {
    if (!shouldLog) return null;
    
    const timestamp = Date.now();
    const logPayload = { ...log, timestamp };

    if (navigator.onLine) {
        const dbPayload = {
            section: section,
            timestamp: timestamp,
            user_email: log.userEmail,
            action_type: log.actionType,
            description: log.description,
            revert_data: log.revertData,
            reverted_log_id: log.revertedLogId
        };

        const { data, error } = await supabase
            .from('audit_logs')
            .insert([dbPayload])
            .select()
            .single();
            
        if (error) console.error("Log error", error);
        
        if (data) {
            const newLog = mapAuditLogFromDB(data);
            await saveLogToDB(newLog, section);
            return newLog;
        }
    } else {
        const tempId = `offline_${crypto.randomUUID()}`;
        const newLog = { ...logPayload, id: tempId };
        await addPendingWrite({ type: 'CREATE_AUDIT_LOG', payload: logPayload, tempId, section: section || undefined });
        await saveLogToDB(newLog, section);
        return newLog;
    }
    return null;
};

export const fetchAuditLogs = async (section: Section | null): Promise<AuditLog[]> => {
    await openDB();
    const cachedLogs = await getLogsFromDB(section);
    const globalLogs = section ? await getLogsFromDB(null) : [];
    const allCached = [...cachedLogs, ...globalLogs].sort((a,b) => b.timestamp - a.timestamp);

    if (navigator.onLine) {
        let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
        if (section) {
            query = query.or(`section.eq.${section},section.is.null`);
        } else {
            query = query.is('section', null);
        }

        query.then(({ data }) => {
            if (data) {
                const freshLogs = data.map(mapAuditLogFromDB);
                freshLogs.forEach(l => saveLogToDB(l, l.section || null));
                window.dispatchEvent(new CustomEvent('logsrefreshed', { detail: { section } }));
            }
        });
    }
    return allCached;
};

export const deleteOldAuditLogs = async (section: Section): Promise<void> => {
    // Only run cleanup if online to keep things simple for now
    if (navigator.onLine) {
        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        
        // Cleanup logs
        await supabase.from('audit_logs').delete().lt('timestamp', fourteenDaysAgo);
        
        // Cleanup invites
        await supabase.from('invite_codes').delete().or(`is_used.eq.true,revoked.eq.true`).lt('generated_at', fourteenDaysAgo);
    }
};

export const clearAllAuditLogs = async (section: Section | null, email: string, role: UserRole | null): Promise<void> => {
    if(role !== 'admin') return;
    
    if (navigator.onLine) {
        let query = supabase.from('audit_logs').delete();
        if (section) query = query.eq('section', section);
        else query = query.is('section', null);
        await query;
    }
    
    await clearStore(section ? `${section}_audit_logs` : 'global_audit_logs');
};

// --- Invite Codes ---
export const fetchAllInviteCodes = async (role: UserRole | null): Promise<InviteCode[]> => {
    if(role !== 'admin' && role !== 'captain') return [];
    
    if(navigator.onLine) {
        const { data } = await supabase.from('invite_codes').select('*');
        if(data) {
            const mapped = data.map(mapInviteCodeFromDB);
            // Update cache
            for (const code of mapped) {
                await saveInviteCodeToDB(code);
            }
            return mapped;
        }
    }
    return getAllInviteCodesFromDB();
};

export const createInviteCode = async (code: any, section: Section, role: UserRole | null): Promise<InviteCode> => {
    if (!role || !['admin', 'captain'].includes(role)) throw new Error("Permission denied");

    const finalCode = {
        ...code,
        defaultUserRole: code.defaultUserRole || 'officer',
        expiresAt: code.expiresAt || (Date.now() + 24 * 60 * 60 * 1000),
        generatedAt: Date.now(),
        id: crypto.randomUUID(), // Generate ID for URL friendly code
        revoked: false
    };

    if (navigator.onLine) {
        const dbPayload = {
            id: finalCode.id,
            generated_by: finalCode.generatedBy,
            generated_at: finalCode.generatedAt,
            section: finalCode.section,
            is_used: finalCode.isUsed,
            revoked: false,
            default_user_role: finalCode.defaultUserRole,
            expires_at: finalCode.expiresAt
        };
        
        const { error } = await supabase.from('invite_codes').insert([dbPayload]);
        if (error) throw error;
    }
    
    await saveInviteCodeToDB(finalCode as InviteCode);
    return finalCode as InviteCode;
};

export const fetchInviteCode = async (id: string): Promise<InviteCode | undefined> => {
    if (navigator.onLine) {
        // Try RPC first to bypass strict RLS for anon users/signups
        const { data, error } = await supabase.rpc('validate_invite_code', { code_id: id });
        if (!error && data && data.length > 0) {
            return mapInviteCodeFromDB(data[0]);
        }
        // Fallback to direct select if RPC fails or returns nothing (though direct select will likely fail for anon)
        if (!data) {
             const { data: directData } = await supabase.from('invite_codes').select('*').eq('id', id).maybeSingle();
             if (directData) return mapInviteCodeFromDB(directData);
        }
    }
    return getInviteCodeFromDB(id);
};

export const updateInviteCode = async (id: string, updates: any, role: any): Promise<void> => {
    if (navigator.onLine) {
        // Map updates to snake_case
        const dbUpdates: any = {};
        if (updates.isUsed !== undefined) dbUpdates.is_used = updates.isUsed;
        if (updates.usedBy !== undefined) dbUpdates.used_by = updates.usedBy;
        if (updates.usedAt !== undefined) dbUpdates.used_at = updates.usedAt;
        if (updates.defaultUserRole !== undefined) dbUpdates.default_user_role = updates.defaultUserRole;
        if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;
        if (updates.revoked !== undefined) dbUpdates.revoked = updates.revoked;

        const { error } = await supabase.from('invite_codes').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }
    // We also need to update local cache if we can
    const current = await getInviteCodeFromDB(id);
    if (current) {
        await saveInviteCodeToDB({ ...current, ...updates });
    }
};

// New function to safely mark invite code as used via RPC
export const markInviteCodeAsUsed = async (id: string, usedByEmail: string): Promise<void> => {
    if (navigator.onLine) {
        const { error } = await supabase.rpc('consume_invite_code', { 
            code_id: id, 
            user_email: usedByEmail 
        });
        if (error) throw error;
        
        // Update local cache
        const current = await getInviteCodeFromDB(id);
        if (current) {
            await saveInviteCodeToDB({ 
                ...current, 
                isUsed: true, 
                usedBy: usedByEmail, 
                usedAt: Date.now() 
            });
        }
    }
};

export const revokeInviteCode = async (id: string, section: Section, log: boolean, role: any): Promise<void> => {
    await updateInviteCode(id, { revoked: true }, role);
    if (log) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            await createAuditLog({
                userEmail: user.email,
                actionType: 'REVOKE_INVITE_CODE',
                description: `Revoked invite code: ${id}`,
                revertData: { inviteCodeId: id }
            }, section);
        }
    }
};

export const clearAllUsedRevokedInviteCodes = async (email: string, role: any): Promise<void> => {
    if(role !== 'admin') return;
    
    if (navigator.onLine) {
        await supabase.from('invite_codes').delete().or('is_used.eq.true,revoked.eq.true');
    }
    // Local cleanup not implemented in detail for this function in previous iterations, 
    // but we can rely on online sync or add a specific offlineDb function.
    // For now, just clearing from UI perspective is handled by re-fetch.
};

// --- User Roles ---
export const fetchUserRole = async (uid: string): Promise<UserRole | null> => {
    const cached = await getUserRoleFromDB(uid);
    if (cached) return cached;

    if (navigator.onLine) {
        const { data, error } = await supabase.from('user_roles').select('role').eq('uid', uid).maybeSingle();
        
        if (data) {
            await saveUserRoleToDB(uid, data.role as UserRole);
            return data.role as UserRole;
        }

        // LAZY MIGRATION FALLBACK
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            const { data: oldRoleData } = await supabase
                .from('user_roles')
                .select('role, uid')
                .eq('email', user.email)
                .maybeSingle();

            if (oldRoleData && oldRoleData.uid !== uid) {
                console.log("Found unlinked role data. Linking now...");
                await supabase
                    .from('user_roles')
                    .update({ uid: uid })
                    .eq('email', user.email);
                
                await saveUserRoleToDB(uid, oldRoleData.role as UserRole);
                return oldRoleData.role as UserRole;
            }
        }
    }
    return null;
};

export const fetchAllUserRoles = async (role: UserRole | null) => {
    if(role !== 'admin' && role !== 'captain') return [];
    const { data } = await supabase.from('user_roles').select('*');
    return data ? data.map(d => ({ uid: d.uid, email: d.email, role: d.role as UserRole })) : [];
};

export const setUserRole = async (uid: string, email: string, role: UserRole) => {
    await supabase.from('user_roles').upsert({ uid, email, role });
};

export const updateUserRole = async (uid: string, newRole: UserRole, actingRole: UserRole | null) => {
    await supabase.from('user_roles').update({ role: newRole }).eq('uid', uid);
};

export const deleteUserRole = async (uid: string, actingRole: UserRole | null) => {
    await supabase.from('user_roles').delete().eq('uid', uid);
};

export const clearAllLocalData = async (section: Section) => {
    await clearAllSectionDataFromDB(section);
};