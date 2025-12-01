/**
 * @file offlineDb.ts
 * @description This file provides a Promise-based wrapper around the IndexedDB API.
 * It manages the local database for offline storage of boys, audit logs, and pending
 * writes that need to be synced to Firestore. It also handles database schema creation
 * and version migrations.
 */

import { Boy, AuditLog, Section, UserRole } from '../types';

/**
 * Defines the structure of an object in the 'pending_writes' store.
 * Each object represents a database operation that occurred while offline.
 */
export type PendingWrite = {
  id?: number;
  section?: Section; // Section is optional for global audit logs
  type: 'CREATE_BOY' | 'UPDATE_BOY' | 'DELETE_BOY' | 'RECREATE_BOY' | 'CREATE_AUDIT_LOG' | 'UPDATE_USER_ROLE' | 'DELETE_USER_ROLE';
  payload: any;
  tempId?: string; // Used to track temporarily created boys before they get a real Firestore ID.
};

const DB_NAME = 'BBManagerDB';
const DB_VERSION = 6; // Incrementing version to remove invite_codes
const PENDING_WRITES_STORE = 'pending_writes';
const USER_ROLES_STORE = 'user_roles';
const GLOBAL_AUDIT_LOGS_STORE = 'global_audit_logs';

/**
 * Generates a consistent object store name based on the section and resource type.
 */
const getStoreName = (section: Section | null, resource: 'boys' | 'audit_logs') => {
    if (resource === 'audit_logs' && section === null) {
        return GLOBAL_AUDIT_LOGS_STORE;
    }
    if (!section) {
        return `unknown_section_${resource}`;
    }
    return `${section}_${resource}`;
};

// A singleton instance of the database connection.
let db: IDBDatabase;

/**
 * Opens and initializes the IndexedDB database.
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
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

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      // Cleanup old invite_codes store if it exists (from v5 or older)
      if (db.objectStoreNames.contains('invite_codes')) {
          db.deleteObjectStore('invite_codes');
      }

      // Create new stores if they don't exist
      if (!db.objectStoreNames.contains(GLOBAL_AUDIT_LOGS_STORE)) {
        db.createObjectStore(GLOBAL_AUDIT_LOGS_STORE, { keyPath: 'id' });
      }
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
      if (!db.objectStoreNames.contains(PENDING_WRITES_STORE)) {
          db.createObjectStore(PENDING_WRITES_STORE, { autoIncrement: true, keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(USER_ROLES_STORE)) {
        db.createObjectStore(USER_ROLES_STORE, { keyPath: 'uid' });
      }
    };
  });
};

const getStore = (storeName: string, mode: IDBTransactionMode): IDBObjectStore => {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
};

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
export const saveBoyToDB = async (boy: Boy, section: Section): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'boys'), 'readwrite');
    const request = store.put(boy);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

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

export const getBoysFromDB = async (section: Section): Promise<Boy[]> => {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(getStoreName(section, 'boys'), 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getBoyFromDB = async (id: string, section: Section): Promise<Boy | undefined> => {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(getStoreName(section, 'boys'), 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

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
export const saveLogToDB = async (log: AuditLog, section: Section | null): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'audit_logs'), 'readwrite');
    const request = store.put(log);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveLogsToDB = async (logs: AuditLog[], section: Section | null): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(getStoreName(section, 'audit_logs'), 'readwrite');
    const store = tx.objectStore(getStoreName(section, 'audit_logs'));
    logs.forEach(log => store.put(log));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getLogsFromDB = async (section: Section | null): Promise<AuditLog[]> => {
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

export const deleteLogFromDB = async (id: string, section: Section | null): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'audit_logs'), 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteLogsFromDB = async (logIds: string[], section: Section | null): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(getStoreName(section, 'audit_logs'), 'readwrite');
    const store = tx.objectStore(getStoreName(section, 'audit_logs'));
    logIds.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// --- User Role Functions ---
export const saveUserRoleToDB = async (uid: string, role: UserRole): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(USER_ROLES_STORE, 'readwrite');
    const request = store.put({ uid, role });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getUserRoleFromDB = async (uid: string): Promise<UserRole | undefined> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(USER_ROLES_STORE, 'readonly');
    const request = store.get(uid);
    request.onsuccess = () => resolve(request.result?.role);
    request.onerror = () => reject(request.error);
  });
};

export const deleteUserRoleFromDB = async (uid: string): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(USER_ROLES_STORE, 'readwrite');
    const request = store.delete(uid);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearAllUserRolesFromDB = async (): Promise<void> => {
  return clearStore(USER_ROLES_STORE);
};

// --- Pending Writes Functions ---
export const addPendingWrite = async (write: Omit<PendingWrite, 'id'>): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(PENDING_WRITES_STORE, 'readwrite');
    const request = store.add(write);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getPendingWrites = async (): Promise<PendingWrite[]> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(PENDING_WRITES_STORE, 'readonly');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const clearPendingWrites = async (): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(PENDING_WRITES_STORE, 'readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearAllSectionDataFromDB = async (section: Section): Promise<void> => {
  await openDB();
  await Promise.all([
    clearStore(getStoreName(section, 'boys')),
    clearStore(getStoreName(section, 'audit_logs')),
    clearStore(GLOBAL_AUDIT_LOGS_STORE),
    clearStore(PENDING_WRITES_STORE),
    clearAllUserRolesFromDB(),
  ]);
};