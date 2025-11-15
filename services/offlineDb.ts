/**
 * @file offlineDb.ts
 * @description This file provides a Promise-based wrapper around the IndexedDB API.
 * It manages the local database for offline storage of boys, audit logs, and pending
 * writes that need to be synced to Firestore. It also handles database schema creation
 * and version migrations.
 */

import { Boy, AuditLog, Section, InviteCode } from '../types';

/**
 * Defines the structure of an object in the 'pending_writes' store.
 * Each object represents a database operation that occurred while offline.
 */
export type PendingWrite = {
  id?: number;
  section?: Section; // Section is optional for invite codes
  type: 'CREATE_BOY' | 'UPDATE_BOY' | 'DELETE_BOY' | 'RECREATE_BOY' | 'CREATE_AUDIT_LOG' | 'CREATE_INVITE_CODE' | 'UPDATE_INVITE_CODE';
  payload: any; // This payload will now contain the full AuditLog data (without ID/timestamp)
  tempId?: string; // Used to track temporarily created boys before they get a real Firestore ID.
};

const DB_NAME = 'BBManagerDB';
const DB_VERSION = 3; // Incrementing the database version to trigger onupgradeneeded
const PENDING_WRITES_STORE = 'pending_writes'; // Define the constant here
const INVITE_CODES_STORE = 'invite_codes'; // New constant for invite codes store

/**
 * Generates a consistent object store name based on the section and resource type.
 * @param section The section ('company' or 'junior').
 * @param resource The resource type ('boys' or 'audit_logs').
 * @returns The name of the IndexedDB object store.
 */
const getStoreName = (section: Section, resource: 'boys' | 'audit_logs') => `${section}_${resource}`;

// A singleton instance of the database connection.
let db: IDBDatabase;

/**
 * Opens and initializes the IndexedDB database. This is the entry point for all DB operations.
 * It handles the creation and migration of the database schema.
 * @returns A promise that resolves with the database instance.
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // If the connection is already open, resolve immediately.
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    /**
     * This event is only triggered when the DB_VERSION is higher than the existing
     * database version on the client, or if the database doesn't exist.
     * It's the only place where you can alter the database schema.
     */
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      // Migration from v2 to v3: Add invite_codes store
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(INVITE_CODES_STORE)) {
          db.createObjectStore(INVITE_CODES_STORE, { keyPath: 'id' });
        }
      }

      // Create new stores for both sections if they don't exist.
      // This ensures they are present for new installations or if a previous migration failed partially.
      if (!db.objectStoreNames.contains(getStoreName('company', 'boys'))) {
          db.createObjectStore(getStoreName('company', 'boys'), { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(getStoreName('company', 'audit_logs'))) {
          db.createObjectStore(getStoreName('company', 'audit_logs'), { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(getStoreName('junior', 'boys'))) {
          db.createObjectStore(getStoreName('junior', 'boys'), { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(getStoreName('junior', 'audit_logs'))) {
          db.createObjectStore(getStoreName('junior', 'audit_logs'), { keyPath: 'id' });
      }
      
      // Create the pending_writes store if it doesn't exist.
      if (!db.objectStoreNames.contains(PENDING_WRITES_STORE)) {
          db.createObjectStore(PENDING_WRITES_STORE, { autoIncrement: true, keyPath: 'id' });
      }
    };
  });
};

/**
 * A helper function to get an object store from the database within a new transaction.
 * @param storeName The name of the store to access.
 * @param mode The transaction mode ('readonly' or 'readwrite').
 * @returns The IDBObjectStore instance.
 */
const getStore = (storeName: string, mode: IDBTransactionMode): IDBObjectStore => {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
};

/**
 * Clears all data from a specific IndexedDB object store.
 * @param storeName The name of the store to clear.
 */
export const clearStore = async (storeName: string): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Boy Functions ---
/** Saves a single boy to the appropriate IndexedDB store. 'put' is used for both create and update. */
export const saveBoyToDB = async (boy: Boy, section: Section): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'boys'), 'readwrite');
    const request = store.put(boy);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/** Saves an array of boys in a single transaction for efficiency. */
export const saveBoysToDB = async (boys: Boy[], section: Section): Promise<void> => {
    await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(getStoreName(section, 'boys'), 'readwrite');
      const store = tx.objectStore(getStoreName(section, 'boys'));
      boys.forEach(boy => store.put(boy));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
};

/** Retrieves all boys from the appropriate IndexedDB store. */
export const getBoysFromDB = async (section: Section): Promise<Boy[]> => {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(getStoreName(section, 'boys'), 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/** Retrieves a single boy by their ID. */
export const getBoyFromDB = async (id: string, section: Section): Promise<Boy | undefined> => {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(getStoreName(section, 'boys'), 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/** Deletes a boy by their ID. */
export const deleteBoyFromDB = async (id: string, section: Section): Promise<void> => {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(getStoreName(section, 'boys'), 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- Audit Log Functions ---
/** Saves a single audit log entry to the appropriate store. */
export const saveLogToDB = async (log: AuditLog, section: Section): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'audit_logs'), 'readwrite');
    const request = store.put(log);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/** Saves an array of logs in a single transaction. */
export const saveLogsToDB = async (logs: AuditLog[], section: Section): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(getStoreName(section, 'audit_logs'), 'readwrite');
    const store = tx.objectStore(getStoreName(section, 'audit_logs'));
    logs.forEach(log => store.put(log));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/** Retrieves all logs from the appropriate store, sorting them by timestamp descending. */
export const getLogsFromDB = async (section: Section): Promise<AuditLog[]> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'audit_logs'), 'readonly');
    const request = store.getAll();
    request.onsuccess = () => {
        const sortedLogs = request.result.sort((a,b) => b.timestamp - a.timestamp);
        resolve(sortedLogs);
    }
    request.onerror = () => reject(request.error);
  });
};

/** Deletes a single log by its ID. */
export const deleteLogFromDB = async (id: string, section: Section): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'audit_logs'), 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/** Deletes an array of logs by their IDs in a single transaction. */
export const deleteLogsFromDB = async (logIds: string[], section: Section): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(getStoreName(section, 'audit_logs'), 'readwrite');
    const store = tx.objectStore(getStoreName(section, 'audit_logs'));
    logIds.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// --- Invite Code Functions ---
/** Saves a single invite code to the IndexedDB store. 'put' is used for both create and update. */
export const saveInviteCodeToDB = async (code: InviteCode): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(INVITE_CODES_STORE, 'readwrite');
    const request = store.put(code);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/** Retrieves a single invite code by its ID. */
export const getInviteCodeFromDB = async (id: string): Promise<InviteCode | undefined> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(INVITE_CODES_STORE, 'readonly');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/** Retrieves all invite codes from the IndexedDB store. */
export const getAllInviteCodesFromDB = async (): Promise<InviteCode[]> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(INVITE_CODES_STORE, 'readonly');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/** Deletes a single invite code by its ID. */
export const deleteInviteCodeFromDB = async (id: string): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(INVITE_CODES_STORE, 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/** Deletes an array of invite codes by their IDs in a single transaction. */
export const deleteInviteCodesFromDB = async (codeIds: string[]): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVITE_CODES_STORE, 'readwrite');
    const store = tx.objectStore(INVITE_CODES_STORE);
    codeIds.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Deletes only used or revoked invite codes from the IndexedDB store.
 */
export const clearUsedRevokedInviteCodesFromDB = async (): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVITE_CODES_STORE, 'readwrite');
    const store = tx.objectStore(INVITE_CODES_STORE);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const code = cursor.value as InviteCode;
        if (code.isUsed || code.revoked) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Deletes all invite codes from the IndexedDB store.
 */
export const clearAllInviteCodesFromDB = async (): Promise<void> => {
  return clearStore(INVITE_CODES_STORE);
};

// --- Pending Writes Functions ---
/** Adds a new offline operation to the pending writes queue. */
export const addPendingWrite = async (write: Omit<PendingWrite, 'id'>): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(PENDING_WRITES_STORE, 'readwrite');
    const request = store.add(write);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/** Retrieves all operations from the pending writes queue. */
export const getPendingWrites = async (): Promise<PendingWrite[]> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(PENDING_WRITES_STORE, 'readonly');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/** Clears the entire pending writes queue, typically after a successful sync to Firestore. */
export const clearPendingWrites = async (): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(PENDING_WRITES_STORE, 'readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Clears all local data (boys, audit logs) for a given section and all invite codes.
 * This is a destructive operation intended for development/reset purposes.
 * @param section The section whose data to clear.
 */
export const clearAllSectionDataFromDB = async (section: Section): Promise<void> => {
  await openDB();
  await Promise.all([
    clearStore(getStoreName(section, 'boys')),
    clearStore(getStoreName(section, 'audit_logs')),
    clearStore(PENDING_WRITES_STORE), // Clear pending writes as well
    clearAllInviteCodesFromDB(), // Clear all invite codes locally
  ]);
};