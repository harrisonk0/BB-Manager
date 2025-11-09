// FIX: Changed to named imports for Firebase v9 compatibility.
import {
    collection,
    writeBatch,
    doc,
    serverTimestamp,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    setDoc,
    getDoc,
    query,
    orderBy,
    where,
    Timestamp,
    limit,
} from 'firebase/firestore';
import { Boy, AuditLog, Section, Invite } from '../types';
import { getDb, getAuthInstance } from './firebase';
import { openDB, getBoysFromDB, saveBoysToDB, getBoyFromDB, saveBoyToDB, addPendingWrite, getPendingWrites, clearPendingWrites, getLogsFromDB, saveLogsToDB, deleteBoyFromDB, deleteLogFromDB, saveLogToDB, deleteLogsFromDB } from './offlineDb';

const getCollectionName = (section: Section, resource: 'boys' | 'audit_logs') => `${section}_${resource}`;
const INVITES_COLLECTION = 'invites';

// --- Invite Functions ---
export const inviteOfficer = async (emailToInvite: string, inviterEmail: string): Promise<void> => {
    const db = getDb();
    const inviteRef = doc(db, INVITES_COLLECTION, emailToInvite);
    
    await setDoc(inviteRef, {
        email: emailToInvite,
        invitedBy: inviterEmail,
        invitedAt: serverTimestamp(),
        isUsed: false,
    });
};

export const fetchInvites = async (): Promise<Invite[]> => {
    const db = getDb();
    const q = query(collection(db, INVITES_COLLECTION), where('isUsed', '==', false), orderBy('invitedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
            ...data,
            email: docSnapshot.id,
            invitedAt: data.invitedAt?.toDate()?.getTime() || Date.now(),
        } as Invite
    });
};

export const revokeInvite = async (email: string): Promise<void> => {
    const db = getDb();
    const inviteRef = doc(db, INVITES_COLLECTION, email);
    await deleteDoc(inviteRef);
};


// --- Data Migration ---
export const migrateFirestoreDataIfNeeded = async () => {
    const migrationKey = 'firestore_migration_v2_complete';
    if (localStorage.getItem(migrationKey)) {
        return;
    }
    
    console.log("Checking for Firestore data to migrate...");
    const db = getDb();
    const oldBoysCollection = collection(db, 'boys');
    const oldBoysSnapshot = await getDocs(oldBoysCollection);

    if (oldBoysSnapshot.empty) {
        console.log("No old data found to migrate.");
        localStorage.setItem(migrationKey, 'true');
        return;
    }
    
    console.log(`Found ${oldBoysSnapshot.size} documents to migrate.`);
    const batch = writeBatch(db);

    // Migrate boys
    oldBoysSnapshot.forEach(docSnapshot => {
        const newDocRef = doc(db, getCollectionName('company', 'boys'), docSnapshot.id);
        batch.set(newDocRef, docSnapshot.data());
    });

    // Migrate audit logs
    const oldLogsCollection = collection(db, 'audit_logs');
    const oldLogsSnapshot = await getDocs(oldLogsCollection);
    oldLogsSnapshot.forEach(docSnapshot => {
        const newDocRef = doc(db, getCollectionName('company', 'audit_logs'), docSnapshot.id);
        batch.set(newDocRef, docSnapshot.data());
    });
    
    try {
        await batch.commit();
        console.log("Firestore data migration successful.");
        localStorage.setItem(migrationKey, 'true');
    } catch(error) {
        console.error("Firestore data migration failed:", error);
    }
};

// --- Sync Function ---
export const syncPendingWrites = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    const pendingWrites = await getPendingWrites();
    if (pendingWrites.length === 0) return true;

    console.log(`Syncing ${pendingWrites.length} offline writes...`);
    const db = getDb();
    const batch = writeBatch(db);

    const boysToUpdateInIDB: { boy: Boy, section: Section }[] = [];
    const boysToDeleteFromIDB: { tempId: string, section: Section }[] = [];
    
    for (const write of pendingWrites) {
        const boysCollection = getCollectionName(write.section, 'boys');
        const logsCollection = getCollectionName(write.section, 'audit_logs');

        switch (write.type) {
            case 'CREATE_BOY': {
                const docRef = doc(collection(db, boysCollection));
                batch.set(docRef, write.payload);
                const newBoy = { ...write.payload, id: docRef.id };
                boysToUpdateInIDB.push({boy: newBoy, section: write.section});
                if (write.tempId) {
                    boysToDeleteFromIDB.push({ tempId: write.tempId, section: write.section });
                }
                break;
            }
            case 'UPDATE_BOY': {
                const docRef = doc(db, boysCollection, write.payload.id);
                batch.update(docRef, write.payload);
                break;
            }
            case 'DELETE_BOY': {
                const docRef = doc(db, boysCollection, write.payload.id);
                batch.delete(docRef);
                break;
            }
            case 'RECREATE_BOY': {
                const docRef = doc(db, boysCollection, write.payload.id);
                const { id, ...boyData } = write.payload;
                batch.set(docRef, boyData);
                break;
            }
            case 'CREATE_AUDIT_LOG': {
                const logData = { ...write.payload, timestamp: serverTimestamp() };
                const docRef = doc(collection(db, logsCollection));
                batch.set(docRef, logData);
                break;
            }
            case 'UPDATE_AUDIT_LOG': {
                 const { id, ...logData } = write.payload;
                 const docRef = doc(db, logsCollection, id);
                 batch.update(docRef, logData);
                 break;
            }
        }
    }
    
    try {
        await batch.commit();
        await clearPendingWrites();

        // Post-sync cleanup and updates in IndexedDB
        for(const { tempId, section } of boysToDeleteFromIDB) {
            await deleteBoyFromDB(tempId, section);
        }
        for (const { boy, section } of boysToUpdateInIDB) {
            await saveBoyToDB(boy, section);
        }

        console.log('Sync successful.');
        return true;
    } catch (error) {
        console.error("Firebase sync failed:", error);
        return false;
    }
};

// --- Boy Functions ---
export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section): Promise<Boy> => {
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  if (navigator.onLine) {
    const db = getDb();
    const docRef = await addDoc(collection(db, getCollectionName(section, 'boys')), boy);
    const newBoy = { ...boy, id: docRef.id };
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

export const fetchBoys = async (section: Section): Promise<Boy[]> => {
    await openDB(); // Ensure DB migration has run
    const auth = getAuthInstance();
    if (!auth.currentUser) return [];

    const cachedBoys = await getBoysFromDB(section);
    if (cachedBoys.length > 0) {
        if (navigator.onLine) {
            getDocs(collection(getDb(), getCollectionName(section, 'boys')))
                .then(snapshot => {
                    const freshBoys = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Boy));
                    saveBoysToDB(freshBoys, section);
                }).catch(err => console.error("Background fetch failed:", err));
        }
        return cachedBoys;
    }

    if (navigator.onLine) {
        const snapshot = await getDocs(collection(getDb(), getCollectionName(section, 'boys')));
        const boys = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Boy));
        await saveBoysToDB(boys, section);
        return boys;
    }
    
    return [];
};

export const fetchBoyById = async (id: string, section: Section): Promise<Boy | undefined> => {
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");

    const cachedBoy = await getBoyFromDB(id, section);
    if (cachedBoy) return cachedBoy;

    if (navigator.onLine) {
        const docRef = doc(getDb(), getCollectionName(section, 'boys'), id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const boy = { ...docSnap.data(), id: docSnap.id } as Boy;
            await saveBoyToDB(boy, section);
            return boy;
        }
    }
    return undefined;
};

const performBoyUpdate = async (boy: Boy, section: Section) => {
    if (navigator.onLine) {
        const { id, ...boyData } = boy;
        await updateDoc(doc(getDb(), getCollectionName(section, 'boys'), id!), boyData as any);
        await saveBoyToDB(boy, section);
    } else {
        await addPendingWrite({ type: 'UPDATE_BOY', payload: boy, section });
        await saveBoyToDB(boy, section);
    }
};

export const updateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (!boy.id) throw new Error("Boy must have an ID to be updated");
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");
    await performBoyUpdate(boy, section);
    return boy;
};

export const recreateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (!boy.id) throw new Error("Boy must have an ID to be recreated");
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");

    if (navigator.onLine) {
        const { id, ...boyData } = boy;
        await setDoc(doc(getDb(), getCollectionName(section, 'boys'), boy.id), boyData);
        await saveBoyToDB(boy, section);
    } else {
        await addPendingWrite({ type: 'RECREATE_BOY', payload: boy, section });
        await saveBoyToDB(boy, section);
    }
    return boy;
};

export const deleteBoyById = async (id: string, section: Section): Promise<void> => {
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");

    if (navigator.onLine) {
        await deleteDoc(doc(getDb(), getCollectionName(section, 'boys'), id));
        await deleteBoyFromDB(id, section);
    } else {
        await addPendingWrite({ type: 'DELETE_BOY', payload: { id }, section });
        await deleteBoyFromDB(id, section);
    }
};

// --- Audit Log Functions ---
export const createAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>, section: Section): Promise<AuditLog> => {
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated for logging");
  const timestamp = Date.now();
  
  if (navigator.onLine) {
    const logData = { ...log, timestamp: serverTimestamp() };
    const docRef = await addDoc(collection(getDb(), getCollectionName(section, 'audit_logs')), logData);
    const newLog = { ...log, id: docRef.id, timestamp };
    await saveLogToDB(newLog, section);
    return newLog;
  } else {
    const tempId = `offline_${crypto.randomUUID()}`;
    const newLog = { ...log, id: tempId, timestamp };
    await addPendingWrite({ type: 'CREATE_AUDIT_LOG', payload: log, tempId, section });
    await saveLogToDB(newLog, section);
    return newLog;
  }
};

export const fetchAuditLogs = async (section: Section): Promise<AuditLog[]> => {
    const auth = getAuthInstance();
    if (!auth.currentUser) return [];

    const cachedLogs = await getLogsFromDB(section);
    if (cachedLogs.length > 0) {
        if (navigator.onLine) {
            const q = query(collection(getDb(), getCollectionName(section, 'audit_logs')), orderBy('timestamp', 'desc'));
            getDocs(q).then(snapshot => {
                const freshLogs = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const ts = data.timestamp;
                    let timestampInMillis: number;
                    if (ts && typeof ts.toMillis === 'function') {
                        timestampInMillis = ts.toMillis();
                    } else if (typeof ts === 'number') {
                        timestampInMillis = ts;
                    } else {
                        timestampInMillis = Date.now();
                    }
                    return { ...data, id: doc.id, timestamp: timestampInMillis } as AuditLog;
                });
                saveLogsToDB(freshLogs, section);
            });
        }
        return cachedLogs;
    }
    
    if (navigator.onLine) {
        const q = query(collection(getDb(), getCollectionName(section, 'audit_logs')), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const ts = data.timestamp;
            let timestampInMillis: number;
            if (ts && typeof ts.toMillis === 'function') {
                timestampInMillis = ts.toMillis();
            } else if (typeof ts === 'number') {
                timestampInMillis = ts;
            } else {
                timestampInMillis = Date.now();
            }
            return { ...data, id: doc.id, timestamp: timestampInMillis } as AuditLog;
        });
        await saveLogsToDB(logs, section);
        return logs;
    }

    return [];
};


export const updateAuditLog = async (log: AuditLog, section: Section): Promise<AuditLog> => {
  if (!log.id) throw new Error("Log must have an ID to be updated");
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");

  if (navigator.onLine) {
    const { id, ...logData } = log;
    await updateDoc(doc(getDb(), getCollectionName(section, 'audit_logs'), id), logData as any);
    await saveLogToDB(log, section);
  } else {
    await addPendingWrite({ type: 'UPDATE_AUDIT_LOG', payload: log, section });
    await saveLogToDB(log, section);
  }
  return log;
};

export const deleteOldAuditLogs = async (section: Section): Promise<void> => {
    const fourteenDaysInMillis = 14 * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Date.now() - fourteenDaysInMillis;

    try {
        const localLogs = await getLogsFromDB(section);
        const oldLocalLogIds = localLogs
            .filter(log => log.timestamp < cutoffTimestamp)
            .map(log => log.id!);
        
        if (oldLocalLogIds.length > 0) {
            await deleteLogsFromDB(oldLocalLogIds, section);
            console.log(`Deleted ${oldLocalLogIds.length} old logs from IndexedDB for section ${section}.`);
        }
    } catch (error) {
        console.error("Failed to delete old logs from IndexedDB:", error);
    }

    if (navigator.onLine) {
        try {
            const db = getDb();
            const cutoffFirestoreTimestamp = Timestamp.fromMillis(cutoffTimestamp);
            const oldLogsQuery = query(
                collection(db, getCollectionName(section, 'audit_logs')),
                where('timestamp', '<', cutoffFirestoreTimestamp)
            );
            
            const snapshot = await getDocs(oldLogsQuery);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`Deleted ${snapshot.docs.length} old logs from Firestore for section ${section}.`);
            }
        } catch (error) {
            console.error("Failed to delete old logs from Firestore:", error);
        }
    }
};