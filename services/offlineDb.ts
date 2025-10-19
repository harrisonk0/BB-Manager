import { Boy, AuditLog } from '../types';

export type PendingWrite = {
  id?: number;
  type: 'CREATE_BOY' | 'UPDATE_BOY' | 'DELETE_BOY' | 'RECREATE_BOY' | 'CREATE_AUDIT_LOG' | 'UPDATE_AUDIT_LOG';
  payload: any;
  tempId?: string;
};

const DB_NAME = 'BBManagerDB';
const DB_VERSION = 1;
const BOYS_STORE = 'boys';
const LOGS_STORE = 'audit_logs';
const PENDING_WRITES_STORE = 'pending_writes';

let db: IDBDatabase;

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
      if (!db.objectStoreNames.contains(BOYS_STORE)) {
        db.createObjectStore(BOYS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        db.createObjectStore(LOGS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING_WRITES_STORE)) {
        db.createObjectStore(PENDING_WRITES_STORE, { autoIncrement: true, keyPath: 'id' });
      }
    };
  });
};

const getStore = (storeName: string, mode: IDBTransactionMode): IDBObjectStore => {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
};

// --- Boy Functions ---
export const saveBoyToDB = async (boy: Boy): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(BOYS_STORE, 'readwrite');
    const request = store.put(boy);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveBoysToDB = async (boys: Boy[]): Promise<void> => {
    await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BOYS_STORE, 'readwrite');
      const store = tx.objectStore(BOYS_STORE);
      boys.forEach(boy => store.put(boy));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
};

export const getBoysFromDB = async (): Promise<Boy[]> => {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(BOYS_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getBoyFromDB = async (id: string): Promise<Boy | undefined> => {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(BOYS_STORE, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const deleteBoyFromDB = async (id: string): Promise<void> => {
    await openDB();
    return new Promise((resolve, reject) => {
        const store = getStore(BOYS_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- Audit Log Functions ---
export const saveLogToDB = async (log: AuditLog): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(LOGS_STORE, 'readwrite');
    const request = store.put(log);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveLogsToDB = async (logs: AuditLog[]): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOGS_STORE, 'readwrite');
    const store = tx.objectStore(LOGS_STORE);
    logs.forEach(log => store.put(log));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getLogsFromDB = async (): Promise<AuditLog[]> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(LOGS_STORE, 'readonly');
    const request = store.getAll();
    request.onsuccess = () => {
        const sortedLogs = request.result.sort((a,b) => b.timestamp - a.timestamp);
        resolve(sortedLogs);
    }
    request.onerror = () => reject(request.error);
  });
};

export const deleteLogFromDB = async (id: string): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(LOGS_STORE, 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
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