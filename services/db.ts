/**
 * @file db.ts
 * @description This file is the central data layer for the application.
 * It abstracts all interactions with both Firestore (for online data persistence)
 * and IndexedDB (for offline storage and caching). It handles data migration,
 * synchronization of offline writes, and provides a unified API for CRUD operations.
 */

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
import { Boy, AuditLog, Section, InviteCode } from '../types';
import { getDb, getAuthInstance } from './firebase';
import { openDB, getBoysFromDB, saveBoysToDB, getBoyFromDB, saveBoyToDB, addPendingWrite, getPendingWrites, clearPendingWrites, getLogsFromDB, saveLogsToDB, deleteBoyFromDB, deleteLogFromDB, saveLogToDB, deleteLogsFromDB, saveInviteCodeToDB, getInviteCodeFromDB, getAllInviteCodesFromDB } from './offlineDb';

/**
 * Generates a consistent collection name for Firestore based on the active section and resource type.
 * E.g., ('company', 'boys') => 'company_boys'.
 * @param section The active section ('company' or 'junior').
 * @param resource The type of data ('boys' or 'audit_logs').
 * @returns The formatted collection name string.
 */
const getCollectionName = (section: Section, resource: 'boys' | 'audit_logs' | 'invite_codes') => {
    if (resource === 'invite_codes') {
        return 'invite_codes'; // Invite codes are global, not section-specific
    }
    return `${section}_${resource}`;
};

/**
 * Validates the marks array of a boy object.
 * Throws an error if any mark is invalid.
 * @param boy The boy object to validate.
 * @param section The active section ('company' or 'junior').
 */
const validateBoyMarks = (boy: Boy, section: Section) => {
    if (!Array.isArray(boy.marks)) {
        throw new Error("Marks must be an array.");
    }

    const validateDecimalPlaces = (value: number, fieldName: string, date: string) => {
        // -1 is allowed for absent, other negative values are caught by range checks.
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

        // If score is -1, it means absent, no further score validation is needed for this mark.
        if (mark.score === -1) {
            continue;
        }

        // Validate decimal places for the total score
        validateDecimalPlaces(mark.score, 'Total score', mark.date);

        if (section === 'company') {
            if (mark.score < 0 || mark.score > 10) {
                throw new Error(`Company section score for ${boy.name} on ${mark.date} is out of range (0-10).`);
            }
            // Ensure no junior-specific scores are present for company section
            if (mark.uniformScore !== undefined || mark.behaviourScore !== undefined) {
                throw new Error(`Company section boy ${boy.name} on ${mark.date} has junior-specific scores.`);
            }
        } else { // Junior section
            if (typeof mark.uniformScore !== 'number' || mark.uniformScore < 0 || mark.uniformScore > 10) {
                throw new Error(`Junior section uniform score for ${boy.name} on ${mark.date} is invalid or out of range (0-10).`);
            }
            if (typeof mark.behaviourScore !== 'number' || mark.behaviourScore < 0 || mark.behaviourScore > 5) {
                throw new Error(`Junior section behaviour score for ${boy.name} on ${mark.date} is invalid or out of range (0-5).`);
            }
            // Validate decimal places for uniform and behaviour scores
            validateDecimalPlaces(mark.uniformScore, 'Uniform score', mark.date);
            validateDecimalPlaces(mark.behaviourScore, 'Behaviour score', mark.date);

            // Validate total score matches sum of uniform and behaviour scores
            // Use a small epsilon for floating point comparison
            const calculatedTotal = mark.uniformScore + mark.behaviourScore;
            if (Math.abs(mark.score - calculatedTotal) > 0.001) { // Allow for minor floating point inaccuracies
                throw new Error(`Junior section total score for ${boy.name} on ${mark.date} does not match sum of uniform and behaviour scores.`);
            }
        }
    }
};

// --- Sync Function ---
/**
 * The core of the offline functionality. This function reads all pending writes
 * from IndexedDB, bundles them into a single Firestore batch write, and executes it.
 * If successful, it clears the pending writes queue in IndexedDB.
 * @returns A promise that resolves to true if sync was successful or not needed, and false on failure.
 */
export const syncPendingWrites = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    const pendingWrites = await getPendingWrites();
    if (pendingWrites.length === 0) return true;

    console.log(`Syncing ${pendingWrites.length} offline writes...`);
    const db = getDb();
    const batch = writeBatch(db);

    // Keep track of local IDB changes needed after a successful sync.
    const boysToUpdateInIDB: { boy: Boy, section: Section }[] = [];
    const boysToDeleteFromIDB: { tempId: string, section: Section }[] = [];
    const logsToUpdateInIDB: { log: AuditLog, section: Section }[] = [];
    const logsToDeleteFromIDB: { tempId: string, section: Section }[] = [];
    const inviteCodesToUpdateInIDB: InviteCode[] = [];
    
    for (const write of pendingWrites) {
        const boysCollection = write.section ? getCollectionName(write.section, 'boys') : '';
        const logsCollection = write.section ? getCollectionName(write.section, 'audit_logs') : '';
        const inviteCodesCollection = getCollectionName(null as any, 'invite_codes'); // Invite codes are global

        switch (write.type) {
            case 'CREATE_BOY': {
                // When creating a boy offline, they get a temporary ID.
                // Here, we create a new document in Firestore to get a real ID.
                const docRef = doc(collection(db, boysCollection));
                batch.set(docRef, write.payload);
                const newBoy = { ...write.payload, id: docRef.id };
                // We'll need to update the boy in IndexedDB with the new Firestore ID.
                boysToUpdateInIDB.push({boy: newBoy, section: write.section!});
                if (write.tempId) {
                    // And delete the old temporary record from IndexedDB.
                    boysToDeleteFromIDB.push({ tempId: write.tempId, section: write.section! });
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
                // This is used for reverting a deletion. `set` is used to restore the document with a specific ID.
                const docRef = doc(db, boysCollection, write.payload.id);
                const { id, ...boyData } = write.payload;
                batch.set(docRef, boyData);
                break;
            }
            case 'CREATE_AUDIT_LOG': {
                const logData = { ...write.payload, timestamp: serverTimestamp() };
                const docRef = doc(collection(db, logsCollection));
                batch.set(docRef, logData);
                // If this was an offline creation of an audit log, we need to update its ID in IndexedDB.
                if (write.tempId) {
                    // The timestamp from serverTimestamp() is not immediately available client-side.
                    // For local consistency, we'll use Date.now() for the IDB update.
                    const newLog = { ...write.payload, id: docRef.id, timestamp: Date.now() };
                    logsToUpdateInIDB.push({ log: newLog, section: write.section! });
                    logsToDeleteFromIDB.push({ tempId: write.tempId, section: write.section! });
                }
                break;
            }
            case 'CREATE_INVITE_CODE': {
                const docRef = doc(db, inviteCodesCollection, write.payload.id); // Use ID from payload
                batch.set(docRef, { ...write.payload, generatedAt: serverTimestamp() });
                const newCode = { ...write.payload, generatedAt: Date.now() }; // Use client timestamp for local consistency
                inviteCodesToUpdateInIDB.push(newCode);
                break;
            }
            case 'UPDATE_INVITE_CODE': {
                const docRef = doc(db, inviteCodesCollection, write.payload.id);
                batch.update(docRef, { ...write.payload, usedAt: serverTimestamp() }); // Update usedAt on server
                inviteCodesToUpdateInIDB.push({ ...write.payload, usedAt: Date.now() }); // Update usedAt locally
                break;
            }
            // Removed UPDATE_AUDIT_LOG case as audit logs are now immutable.
        }
    }
    
    try {
        await batch.commit();
        await clearPendingWrites();

        // After a successful Firestore commit, apply the necessary updates to IndexedDB.
        for(const { tempId, section } of boysToDeleteFromIDB) {
            await deleteBoyFromDB(tempId, section);
        }
        for (const { boy, section } of boysToUpdateInIDB) {
            await saveBoyToDB(boy, section);
        }
        // New: Handle audit log ID updates
        for(const { tempId, section } of logsToDeleteFromIDB) {
            await deleteLogFromDB(tempId, section);
        }
        for (const { log, section } of logsToUpdateInIDB) {
            await saveLogToDB(log, section);
        }
        // New: Handle invite code updates
        for (const code of inviteCodesToUpdateInIDB) {
            await saveInviteCodeToDB(code);
        }

        console.log('Sync successful.');
        return true;
    } catch (error) {
        console.error("Firebase sync failed:", error);
        return false;
    }
};

// --- Boy Functions ---
/**
 * Creates a new boy. If online, it adds directly to Firestore and caches in IndexedDB.
 * If offline, it creates a boy with a temporary ID in IndexedDB and queues a 'CREATE_BOY' write.
 * @param boy The boy data to create (without an ID).
 * @param section The section the boy belongs to.
 * @returns The newly created Boy object, possibly with a temporary ID if offline.
 */
export const createBoy = async (boy: Omit<Boy, 'id'>, section: Section): Promise<Boy> => {
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  // Validate marks before proceeding
  validateBoyMarks(boy as Boy, section);

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

/**
 * Fetches all boys for a given section. Implements a "cache-first, then network" strategy.
 * It returns cached data from IndexedDB immediately for a fast UI response, then (if online)
 * fetches the latest data from Firestore in the background to update the cache.
 * @param section The section to fetch boys for.
 * @returns An array of Boy objects.
 */
export const fetchBoys = async (section: Section): Promise<Boy[]> => {
    await openDB(); // Ensure DB is ready
    const auth = getAuthInstance();
    if (!auth.currentUser) return [];

    // Always try to return cached data first for speed.
    const cachedBoys = await getBoysFromDB(section);
    if (cachedBoys.length > 0) {
        // If online, kick off a background fetch to update the cache for next time.
        if (navigator.onLine) {
            getDocs(collection(getDb(), getCollectionName(section, 'boys')))
                .then(snapshot => {
                    const freshBoys = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Boy));
                    
                    // Creates a consistent, comparable object to avoid false positives from minor differences (e.g., undefined vs. false).
                    const comparable = (b: Boy) => ({
                        id: b.id,
                        name: b.name,
                        squad: b.squad,
                        year: b.year,
                        isSquadLeader: !!b.isSquadLeader, // Coerce undefined to false
                        marks: b.marks.map(m => ({
                            date: m.date,
                            score: m.score,
                            // Coerce undefined to null, which is handled consistently by JSON.stringify
                            uniformScore: m.uniformScore ?? null, 
                            behaviourScore: m.behaviourScore ?? null,
                        })).sort((a, b) => a.date.localeCompare(b.date)), // Sort marks for consistency
                    });

                    // Sort both arrays by ID to ensure consistent order for comparison.
                    const sortedFresh = [...freshBoys].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
                    const sortedCached = [...cachedBoys].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));

                    if (JSON.stringify(sortedFresh.map(comparable)) !== JSON.stringify(sortedCached.map(comparable))) {
                        console.log(`Background fetch for ${section} boys found updates. Refreshing cache.`);
                        saveBoysToDB(freshBoys, section).then(() => {
                            // Notify the app that data has been updated in the background
                            window.dispatchEvent(new CustomEvent('datarefreshed', { detail: { section } }));
                        });
                    }
                }).catch(err => console.error("Background fetch failed:", err));
        }
        return cachedBoys;
    }

    // If no cached data, fetch from network if online.
    if (navigator.onLine) {
        const snapshot = await getDocs(collection(getDb(), getCollectionName(section, 'boys')));
        const boys = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Boy));
        await saveBoysToDB(boys, section);
        return boys;
    }
    
    // If offline and no cache, return empty.
    return [];
};

/**
 * Fetches a single boy by their ID. Prioritizes cache.
 * @param id The ID of the boy to fetch.
 * @param section The section the boy belongs to.
 * @returns The Boy object, or undefined if not found.
 */
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

/**
 * Private helper to handle the logic for updating a boy, reused by updateBoy and recreateBoy.
 */
const performBoyUpdate = async (boy: Boy, section: Section) => {
    // Validate marks before proceeding
    validateBoyMarks(boy, section);

    if (navigator.onLine) {
        const { id, ...boyData } = boy;
        await updateDoc(doc(getDb(), getCollectionName(section, 'boys'), id!), boyData as any);
        await saveBoyToDB(boy, section);
    } else {
        await addPendingWrite({ type: 'UPDATE_BOY', payload: boy, section });
        await saveBoyToDB(boy, section);
    }
};

/**
 * Updates an existing boy's data. Handles online/offline logic.
 * @param boy The complete Boy object with updated data.
 * @param section The section the boy belongs to.
 * @returns The updated Boy object.
 */
export const updateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (!boy.id) throw new Error("Boy must have an ID to be updated");
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");
    await performBoyUpdate(boy, section);
    return boy;
};

/**
 * Recreates a boy document in Firestore. This is used specifically for reverting a deletion.
 * It uses `setDoc` instead of `updateDoc` to create the document if it doesn't exist.
 * @param boy The complete Boy object to restore.
 * @param section The section the boy belongs to.
 * @returns The recreated Boy object.
 */
export const recreateBoy = async (boy: Boy, section: Section): Promise<Boy> => {
    if (!boy.id) throw new Error("Boy must have an ID to be recreated");
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated");

    // Validate marks before proceeding
    validateBoyMarks(boy, section);

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

/**
 * Deletes a boy by their ID. Handles online/offline logic.
 * @param id The ID of the boy to delete.
 * @param section The section the boy belongs to.
 */
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
/**
 * Creates a new audit log entry. Handles online/offline logic.
 * @param log The log data to create.
 * @param section The section the log pertains to.
 * @returns The new AuditLog object.
 */
export const createAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>, section: Section | null): Promise<AuditLog> => {
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated for logging");
  const timestamp = Date.now();
  
  // Construct the log payload, including revertedLogId if present.
  const logPayload = {
      userEmail: log.userEmail,
      actionType: log.actionType,
      description: log.description,
      revertData: log.revertData,
      ...(log.revertedLogId && { revertedLogId: log.revertedLogId }) // Conditionally add revertedLogId
  };

  const logsCollectionName = section ? getCollectionName(section, 'audit_logs') : 'global_audit_logs'; // Use a global collection for non-section specific logs

  if (navigator.onLine) {
    const logData = { ...logPayload, timestamp: serverTimestamp() };
    const docRef = await addDoc(collection(getDb(), logsCollectionName), logData);
    const newLog = { ...logPayload, id: docRef.id, timestamp };
    if (section) {
        await saveLogToDB(newLog, section);
    }
    return newLog;
  } else {
    const tempId = `offline_${crypto.randomUUID()}`;
    const newLog = { ...logPayload, id: tempId, timestamp };
    await addPendingWrite({ type: 'CREATE_AUDIT_LOG', payload: logPayload, tempId, section: section || undefined });
    if (section) {
        await saveLogToDB(newLog, section);
    }
    return newLog;
  }
};

/**
 * Fetches all audit logs for a section using the same cache-first strategy as fetchBoys.
 * @param section The section to fetch logs for.
 * @returns An array of AuditLog objects, sorted descending by timestamp.
 */
export const fetchAuditLogs = async (section: Section): Promise<AuditLog[]> => {
    await openDB(); // Ensure DB is ready
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
                    // Timestamps from Firestore are objects, but from IndexedDB might be numbers. This handles both.
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

                // More robust deep comparison logic
                const comparableLog = (log: AuditLog) => ({
                    id: log.id,
                    timestamp: log.timestamp,
                    userEmail: log.userEmail,
                    actionType: log.actionType,
                    description: log.description,
                    // revertData is dynamic, so we stringify it for comparison
                    revertData: JSON.stringify(log.revertData),
                    revertedLogId: log.revertedLogId ?? null, // Coerce undefined to null
                });

                // Both fresh and cached logs are already sorted by timestamp.
                if (JSON.stringify(freshLogs.map(comparableLog)) !== JSON.stringify(cachedLogs.map(comparableLog))) {
                    console.log(`Background fetch for ${section} logs found updates. Refreshing cache.`);
                    saveLogsToDB(freshLogs, section).then(() => {
                        // Notify the app that logs have been updated in the background
                        window.dispatchEvent(new CustomEvent('logsrefreshed', { detail: { section } }));
                    });
                }
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

// Removed updateAuditLog as audit logs are now immutable.

/**
 * Deletes audit logs older than 14 days from both IndexedDB and Firestore to manage storage.
 * This is typically run on app startup.
 * @param section The section to clean up logs for.
 */
export const deleteOldAuditLogs = async (section: Section): Promise<void> => {
    const fourteenDaysInMillis = 14 * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Date.now() - fourteenDaysInMillis;

    // Clean up local IndexedDB logs first.
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

    // If online, clean up Firestore logs.
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

// --- Invite Code Functions ---

/**
 * Creates a new invite code.
 * @param code The invite code data to create.
 * @returns The newly created InviteCode object.
 */
export const createInviteCode = async (code: Omit<InviteCode, 'generatedAt'>, section: Section): Promise<InviteCode> => {
    const auth = getAuthInstance();
    if (!auth.currentUser) throw new Error("User not authenticated to create invite code");

    const newCode: InviteCode = { ...code, generatedAt: Date.now() };
    const inviteCodesCollection = getCollectionName(null as any, 'invite_codes');

    if (navigator.onLine) {
        const docRef = doc(getDb(), inviteCodesCollection, newCode.id);
        await setDoc(docRef, { ...newCode, generatedAt: serverTimestamp() });
        await saveInviteCodeToDB(newCode);
        return newCode;
    } else {
        await addPendingWrite({ type: 'CREATE_INVITE_CODE', payload: newCode, section });
        await saveInviteCodeToDB(newCode);
        return newCode;
    }
};

/**
 * Fetches an invite code by its ID.
 * @param id The ID of the invite code to fetch.
 * @returns The InviteCode object, or undefined if not found.
 */
export const fetchInviteCode = async (id: string): Promise<InviteCode | undefined> => {
    await openDB(); // Ensure DB is ready

    const cachedCode = await getInviteCodeFromDB(id);
    if (cachedCode) return cachedCode;

    if (navigator.onLine) {
        const docRef = doc(getDb(), getCollectionName(null as any, 'invite_codes'), id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const ts = data.generatedAt;
            let generatedAtInMillis: number;
            if (ts && typeof ts.toMillis === 'function') {
                generatedAtInMillis = ts.toMillis();
            } else if (typeof ts === 'number') {
                generatedAtInMillis = ts;
            } else {
                generatedAtInMillis = Date.now();
            }
            const code = { ...data, id: docSnap.id, generatedAt: generatedAtInMillis } as InviteCode;
            await saveInviteCodeToDB(code);
            return code;
        }
    }
    return undefined;
};

/**
 * Updates an existing invite code.
 * @param code The InviteCode object with updated data.
 * @returns The updated InviteCode object.
 */
export const updateInviteCode = async (code: InviteCode): Promise<InviteCode> => {
    const inviteCodesCollection = getCollectionName(null as any, 'invite_codes');

    if (navigator.onLine) {
        const docRef = doc(getDb(), inviteCodesCollection, code.id);
        await updateDoc(docRef, { ...code, usedAt: serverTimestamp() }); // Update usedAt on server
        await saveInviteCodeToDB({ ...code, usedAt: Date.now() }); // Update usedAt locally
        return { ...code, usedAt: Date.now() };
    } else {
        await addPendingWrite({ type: 'UPDATE_INVITE_CODE', payload: code });
        await saveInviteCodeToDB(code);
        return code;
    }
};

/**
 * Fetches all invite codes.
 * @returns An array of InviteCode objects.
 */
export const fetchAllInviteCodes = async (): Promise<InviteCode[]> => {
    await openDB(); // Ensure DB is ready
    const auth = getAuthInstance();
    if (!auth.currentUser) return []; // Only authenticated users can view all codes

    const cachedCodes = await getAllInviteCodesFromDB();
    if (cachedCodes.length > 0) {
        if (navigator.onLine) {
            const q = query(collection(getDb(), getCollectionName(null as any, 'invite_codes')), orderBy('generatedAt', 'desc'));
            getDocs(q).then(snapshot => {
                const freshCodes = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const ts = data.generatedAt;
                    let generatedAtInMillis: number;
                    if (ts && typeof ts.toMillis === 'function') {
                        generatedAtInMillis = ts.toMillis();
                    } else if (typeof ts === 'number') {
                        generatedAtInMillis = ts;
                    } else {
                        generatedAtInMillis = Date.now();
                    }
                    return { ...data, id: doc.id, generatedAt: generatedAtInMillis } as InviteCode;
                });

                // Simple stringify comparison for now, can be made more robust if needed
                if (JSON.stringify(freshCodes) !== JSON.stringify(cachedCodes)) {
                    console.log(`Background fetch for invite codes found updates. Refreshing cache.`);
                    Promise.all(freshCodes.map(code => saveInviteCodeToDB(code))).then(() => {
                        window.dispatchEvent(new CustomEvent('inviteCodesRefreshed'));
                    });
                }
            }).catch(err => console.error("Background fetch for invite codes failed:", err));
        }
        return cachedCodes;
    }

    if (navigator.onLine) {
        const q = query(collection(getDb(), getCollectionName(null as any, 'invite_codes')), orderBy('generatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const codes = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const ts = data.generatedAt;
            let generatedAtInMillis: number;
            if (ts && typeof ts.toMillis === 'function') {
                generatedAtInMillis = ts.toMillis();
            } else if (typeof ts === 'number') {
                generatedAtInMillis = ts;
            } else {
                generatedAtInMillis = Date.now();
            }
            return { ...data, id: doc.id, generatedAt: generatedAtInMillis } as InviteCode;
        });
        Promise.all(codes.map(code => saveInviteCodeToDB(code)));
        return codes;
    }

    return [];
};


// --- User Activity Functions ---

/**
 * Updates the last active timestamp for a given user.
 * This is a fire-and-forget operation that runs in the background on login.
 * @param email The email of the user to update.
 */
export const updateUserActivity = async (email: string): Promise<void> => {
    if (!navigator.onLine) return;
    try {
        const db = getDb();
        await setDoc(doc(db, 'user_activity', email), { lastActive: serverTimestamp() });
    } catch (error) {
        console.error("Failed to update user activity:", error);
    }
};

/**
 * Fetches a list of the most recently active users.
 * @param currentUserEmail The email of the current user, to exclude them from the list.
 * @returns A promise that resolves to an array of user emails.
 */
export const fetchRecentActivity = async (currentUserEmail: string): Promise<string[]> => {
    if (!navigator.onLine) return [];
    try {
        const db = getDb();
        const collectionRef = collection(db, 'user_activity');
        // Fetch the 4 most recently active users to show up to 3 others.
        const q = query(collectionRef, orderBy('lastActive', 'desc'), limit(4));
        const snapshot = await getDocs(q);
        
        const activeUsers = snapshot.docs
            .map(doc => doc.id) // doc.id is the email
            .filter(email => email !== currentUserEmail);
            
        return activeUsers;
    } catch (error) {
        console.error("Failed to fetch recent activity:", error);
        return [];
    }
};