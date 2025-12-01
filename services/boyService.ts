import { supabase } from '@/src/integrations/supabase/client';
import { Boy, Section } from '../types';
import { encryptData, decryptData } from './crypto';
import { Logger } from './logger';
import { openDB, getBoysFromDB, saveBoysToDB, getBoyFromDB, saveBoyToDB, addPendingWrite, deleteBoyFromDB } from './offlineDb';
import { validateBoyMarks, mapBoyToDB, mapBoyFromDB, getTableName } from './mappers';
import { createAuditLog } from './auditService'; // Circular dep avoided by using separate file

export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section, key: CryptoKey): Promise<Boy> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    validateBoyMarks(boy as Boy, section);

    const newBoy = { ...boy, id: crypto.randomUUID() } as Boy;
    const encryptedBoy = await encryptData(newBoy, key);

    if (navigator.onLine) {
        const { error } = await supabase.from(getTableName(section, 'boys')).insert(mapBoyToDB(newBoy));
        if (error) throw error;
        await saveBoyToDB(newBoy.id!, encryptedBoy, section);
    } else {
        await addPendingWrite({ type: 'CREATE_BOY', payload: encryptedBoy, section });
        await saveBoyToDB(newBoy.id!, encryptedBoy, section);
    }
    return newBoy;
};

export const fetchBoys = async (section: Section, key: CryptoKey): Promise<Boy[]> => {
    await openDB();
    const cachedEncryptedBoys = await getBoysFromDB(section);
    const cachedBoys: Boy[] = [];
    
    for (const { id, encryptedData } of cachedEncryptedBoys) {
        try {
            cachedBoys.push(await decryptData(encryptedData, key) as Boy);
        } catch (e) {
            Logger.error(`Failed to decrypt boy ${id}.`, e);
        }
    }

    if (cachedBoys.length > 0 && navigator.onLine) {
        // Background update
        supabase.from(getTableName(section, 'boys')).select('*').then(async ({ data }) => {
            if (!data) return;
            const freshEncrypted = await Promise.all(data.map(mapBoyFromDB).map(async b => ({
                id: b.id!, encryptedData: await encryptData(b, key)
            })));
            
            // Simple length check for change detection optimization
            if (freshEncrypted.length !== cachedEncryptedBoys.length || JSON.stringify(freshEncrypted) !== JSON.stringify(cachedEncryptedBoys)) {
                await saveBoysToDB(freshEncrypted, section);
                window.dispatchEvent(new CustomEvent('datarefreshed', { detail: { section } }));
            }
        });
        return cachedBoys;
    }

    if (navigator.onLine) {
        const { data, error } = await supabase.from(getTableName(section, 'boys')).select('*');
        if (error) throw error;
        const boys = data.map(mapBoyFromDB);
        const encrypted = await Promise.all(boys.map(async b => ({ id: b.id!, encryptedData: await encryptData(b, key) })));
        await saveBoysToDB(encrypted, section);
        return boys;
    }
    return [];
};

export const updateBoy = async (boy: Boy, section: Section, key: CryptoKey, shouldLog: boolean = true): Promise<Boy> => {
    if (!boy.id) throw new Error("No ID");
    validateBoyMarks(boy, section);
    let oldBoy: Boy | null = null;

    if (navigator.onLine) {
        try {
            const { data } = await supabase.from(getTableName(section, 'boys')).select('*').eq('id', boy.id).single();
            if (data) oldBoy = mapBoyFromDB(data);
        } catch (e) { Logger.warn("Merge check failed", e); }

        const mergedBoy = oldBoy ? { ...boy, marks: [...boy.marks, ...oldBoy.marks.filter(m => !boy.marks.some(lm => lm.date === m.date))].sort((a,b) => b.date.localeCompare(a.date)) } : boy;
        const dbPayload = mapBoyToDB(mergedBoy);
        
        const { error: sErr } = await supabase.from(getTableName(section, 'boys')).update({
            name: dbPayload.name, squad: dbPayload.squad, year: dbPayload.year, is_squad_leader: dbPayload.is_squad_leader
        }).eq('id', boy.id);
        if (sErr) throw sErr;

        const rpcName = section === 'company' ? 'upsert_company_marks' : 'upsert_junior_marks';
        const { error: rpcErr } = await supabase.rpc(rpcName, { p_boy_id: boy.id, p_new_marks: dbPayload.marks });
        if (rpcErr) throw rpcErr;

        await saveBoyToDB(boy.id, await encryptData(mergedBoy, key), section);
    } else {
        await addPendingWrite({ type: 'UPDATE_BOY', payload: await encryptData(boy, key), section });
        await saveBoyToDB(boy.id, await encryptData(boy, key), section);
    }

    if (shouldLog && oldBoy) {
        await createAuditLog({
            actionType: 'UPDATE_BOY',
            description: `Updated ${oldBoy.name}.`,
            revertData: { boyData: oldBoy },
        }, section, key);
    }
    return boy;
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
    if (navigator.onLine) {
        const { error } = await supabase.from(getTableName(section, 'boys')).delete().eq('id', id);
        if (error) throw error;
    } else {
        await addPendingWrite({ type: 'DELETE_BOY', payload: { id }, section });
    }
    await deleteBoyFromDB(id, section);
};

export const recreateBoy = async (boy: Boy, section: Section, key: CryptoKey): Promise<Boy> => {
    const encryptedBoy = await encryptData(boy, key);
    if (navigator.onLine) {
        const { error } = await supabase.from(getTableName(section, 'boys')).upsert(mapBoyToDB(boy));
        if (error) throw error;
    } else {
        await addPendingWrite({ type: 'RECREATE_BOY', payload: encryptedBoy, section });
    }
    await saveBoyToDB(boy.id!, encryptedBoy, section);
    return boy;
};

export const fetchBoyById = async (id: string, section: Section, key: CryptoKey): Promise<Boy | undefined> => {
    const cached = await getBoyFromDB(id, section);
    if (cached) return decryptData(cached.encryptedData, key) as Promise<Boy>;
    
    if (navigator.onLine) {
        const { data } = await supabase.from(getTableName(section, 'boys')).select('*').eq('id', id).single();
        if (data) {
            const boy = mapBoyFromDB(data);
            await saveBoyToDB(boy.id!, await encryptData(boy, key), section);
            return boy;
        }
    }
    return undefined;
};