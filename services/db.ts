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
} from 'firebase/firestore';
import { Boy, AuditLog } from '../types';
import { getDb, getAuthInstance } from './firebase';
import { openDB, getBoysFromDB, saveBoysToDB, getBoyFromDB, saveBoyToDB, addPendingWrite, getPendingWrites, clearPendingWrites, getLogsFromDB, saveLogsToDB, deleteBoyFromDB, deleteLogFromDB, saveLogToDB, deleteLogsFromDB } from './offlineDb';

const BOYS_COLLECTION = 'boys';
const AUDIT_LOGS_COLLECTION = 'audit_logs';

// Initialize offline DB
openDB();

// --- Sync Function ---
export const syncPendingWrites = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    const pendingWrites = await getPendingWrites();
    if (pendingWrites.length === 0) return true;

    console.log(`Syncing ${pendingWrites.length} offline writes...`);
    const db = getDb();
    const batch = writeBatch(db);

    const boysToUpdateInIDB: Boy[] = [];
    const boysToDeleteFromIDB: string[] = [];
    
    for (const write of pendingWrites) {
        switch (write.type) {
            case 'CREATE_BOY': {
                const docRef = doc(collection(db, BOYS_COLLECTION));
                batch.set(docRef, write.payload);
                // We need to update the boy in IDB with the real ID
                const newBoy = { ...write.payload, id: docRef.id };
                boysToUpdateInIDB.push(newBoy);
                if (write.tempId) {
                    boysToDeleteFromIDB.push(write.tempId);
                }
                break;
            }
            case 'UPDATE_BOY': {
                const docRef = doc(db, BOYS_COLLECTION, write.payload.id);
                batch.update(docRef, write.payload);
                break;
            }
            case 'DELETE_BOY': {
                const docRef = doc(db, BOYS_COLLECTION, write.payload.id);
                batch.delete(docRef);
                break;
            }
            case 'RECREATE_BOY': {
                const docRef = doc(db, BOYS_COLLECTION, write.payload.id);
                const { id, ...boyData } = write.payload;
                batch.set(docRef, boyData);
                break;
            }
            case 'CREATE_AUDIT_LOG': {
                const logData = { ...write.payload, timestamp: serverTimestamp() };
                const docRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
                batch.set(docRef, logData);
                break;
            }
            case 'UPDATE_AUDIT_LOG': {
                 const { id, ...logData } = write.payload;
                 const docRef = doc(db, AUDIT_LOGS_COLLECTION, id);
                 batch.update(docRef, logData);
                 break;
            }
        }
    }
    
    try {
        await batch.commit();
        await clearPendingWrites();

        // Post-sync cleanup and updates in IndexedDB
        for(const id of boysToDeleteFromIDB) {
            await deleteBoyFromDB(id);
        }
        await saveBoysToDB(boysToUpdateInIDB);

        console.log('Sync successful.');
        return true;
    } catch (error) {
        console.error("Firebase sync failed:", error);
        return false;
    }
};

// --- Boy Functions ---
export const createBoy = async (boy: Omit<Boy, 'id'>): Promise<Boy> => {
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  if (navigator.onLine) {
    const db = getDb();
    const docRef = await addDoc(collection(db, BOYS_COLLECTION), boy);
    const newBoy = { ...boy, id: docRef.id };
    await saveBoyToDB(newBoy);
    return newBoy;
  } else {
    const tempId = `offline_${crypto.randomUUID()}`;
    const newBoy: Boy = { ...boy, id: tempId };
    await addPendingWrite({ type: 'CREATE_BOY', payload: boy, tempId });
    await saveBoyToDB(newBoy);
    return newBoy;
  }
};

export const fetchBoys = async (): Promise<Boy[]> => {
    const auth = getAuthInstance();
    if (!auth.currentUser) return [];

    const cachedBoys = await getBoysFromDB();
    if (cachedBoys.length > 0) {
        // Return cached data immediately, and fetch fresh data in the background
        if (navigator.onLine) {
            getDocs(collection(getDb(), BOYS_COLLECTION))
                .then(snapshot => {
                    const freshBoys = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Boy));
                    saveBoysToDB(freshBoys); // Update cache
                }).catch(err => console.error("Background fetch failed:", err));
        }
        return cachedBoys;
    }

    // No cache, fetch from network
    if (navigator.onLine) {
        const snapshot = await getDocs(collection(getDb(), BOYS_COLLECTION));
        const boys = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Boy));
        await saveBoysToDB(boys);
        return boys;
    }
    
    return []; // Offline with no cache
};

export const fetchBoyById = async (id: string): Promise<Boy | undefined> => {
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");

    const cachedBoy = await getBoyFromDB(id);
    if (cachedBoy) return cachedBoy;

    if (navigator.onLine) {
        const docRef = doc(getDb(), BOYS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const boy = { ...docSnap.data(), id: docSnap.id } as Boy;
            await saveBoyToDB(boy);
            return boy;
        }
    }
    return undefined;
};

const performBoyUpdate = async (boy: Boy) => {
    if (navigator.onLine) {
        const { id, ...boyData } = boy;
        await updateDoc(doc(getDb(), BOYS_COLLECTION, id!), boyData as any);
        await saveBoyToDB(boy);
    } else {
        await addPendingWrite({ type: 'UPDATE_BOY', payload: boy });
        await saveBoyToDB(boy);
    }
};

export const updateBoy = async (boy: Boy): Promise<Boy> => {
    if (!boy.id) throw new Error("Boy must have an ID to be updated");
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");
    await performBoyUpdate(boy);
    return boy;
};

export const recreateBoy = async (boy: Boy): Promise<Boy> => {
    if (!boy.id) throw new Error("Boy must have an ID to be recreated");
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");

    if (navigator.onLine) {
        const { id, ...boyData } = boy;
        await setDoc(doc(getDb(), BOYS_COLLECTION, boy.id), boyData);
        await saveBoyToDB(boy);
    } else {
        await addPendingWrite({ type: 'RECREATE_BOY', payload: boy });
        await saveBoyToDB(boy);
    }
    return boy;
};

export const deleteBoyById = async (id: string): Promise<void> => {
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");

    if (navigator.onLine) {
        await deleteDoc(doc(getDb(), BOYS_COLLECTION, id));
        await deleteBoyFromDB(id);
    } else {
        await addPendingWrite({ type: 'DELETE_BOY', payload: { id } });
        await deleteBoyFromDB(id);
    }
};

// --- Audit Log Functions ---
export const createAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated for logging");
  const timestamp = Date.now();
  
  if (navigator.onLine) {
    const logData = { ...log, timestamp: serverTimestamp() };
    const docRef = await addDoc(collection(getDb(), AUDIT_LOGS_COLLECTION), logData);
    const newLog = { ...log, id: docRef.id, timestamp };
    await saveLogToDB(newLog);
    return newLog;
  } else {
    const tempId = `offline_${crypto.randomUUID()}`;
    const newLog = { ...log, id: tempId, timestamp };
    await addPendingWrite({ type: 'CREATE_AUDIT_LOG', payload: log, tempId });
    await saveLogToDB(newLog);
    return newLog;
  }
};

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    const auth = getAuthInstance();
    if (!auth.currentUser) return [];

    const cachedLogs = await getLogsFromDB();
    if (cachedLogs.length > 0) {
        // Return cached data immediately and fetch fresh in background
        if (navigator.onLine) {
            const q = query(collection(getDb(), AUDIT_LOGS_COLLECTION), orderBy('timestamp', 'desc'));
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
                saveLogsToDB(freshLogs); // Update cache
            });
        }
        return cachedLogs;
    }
    
    if (navigator.onLine) {
        const q = query(collection(getDb(), AUDIT_LOGS_COLLECTION), orderBy('timestamp', 'desc'));
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
        await saveLogsToDB(logs);
        return logs;
    }

    return [];
};


export const updateAuditLog = async (log: AuditLog): Promise<AuditLog> => {
  if (!log.id) throw new Error("Log must have an ID to be updated");
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");

  if (navigator.onLine) {
    const { id, ...logData } = log;
    await updateDoc(doc(getDb(), AUDIT_LOGS_COLLECTION, id), logData as any);
    await saveLogToDB(log);
  } else {
    await addPendingWrite({ type: 'UPDATE_AUDIT_LOG', payload: log });
    await saveLogToDB(log);
  }
  return log;
};

export const deleteOldAuditLogs = async (): Promise<void> => {
    const fourteenDaysInMillis = 14 * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Date.now() - fourteenDaysInMillis;

    // 1. Clean up IndexedDB
    try {
        const localLogs = await getLogsFromDB();
        const oldLocalLogIds = localLogs
            .filter(log => log.timestamp < cutoffTimestamp)
            .map(log => log.id!);
        
        if (oldLocalLogIds.length > 0) {
            await deleteLogsFromDB(oldLocalLogIds);
            console.log(`Deleted ${oldLocalLogIds.length} old logs from IndexedDB.`);
        }
    } catch (error) {
        console.error("Failed to delete old logs from IndexedDB:", error);
    }

    // 2. Clean up Firestore (if online)
    if (navigator.onLine) {
        try {
            const db = getDb();
            const cutoffFirestoreTimestamp = Timestamp.fromMillis(cutoffTimestamp);
            const oldLogsQuery = query(
                collection(db, AUDIT_LOGS_COLLECTION),
                where('timestamp', '<', cutoffFirestoreTimestamp)
            );
            
            const snapshot = await getDocs(oldLogsQuery);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`Deleted ${snapshot.docs.length} old logs from Firestore.`);
            }
        } catch (error) {
            console.error("Failed to delete old logs from Firestore:", error);
        }
    }
};