import { Boy, AuditLog, Section } from '../types';

export type PendingWrite = {
  id?: number;
  section: Section;
  type: 'CREATE_BOY' | 'UPDATE_BOY' | 'DELETE_BOY' | 'RECREATE_BOY' | 'CREATE_AUDIT_LOG' | 'UPDATE_AUDIT_LOG';
  payload: any;
  tempId?: string;
};

const DB_NAME = 'BBManagerDB';
const DB_VERSION = 2; // Incremented version for migration
const PENDING_WRITES_STORE = 'pending_writes';

const getStoreName = (section: Section, resource: 'boys' | 'audit_logs') => `${section}_${resource}`;

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
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      // New stores for version 2
      if (event.oldVersion < 2) {
          console.log("Upgrading IndexedDB to v2: creating section-specific stores.");
          db.createObjectStore(getStoreName('company', 'boys'), { keyPath: 'id' });
          db.createObjectStore(getStoreName('company', 'audit_logs'), { keyPath: 'id' });
          db.createObjectStore(getStoreName('junior', 'boys'), { keyPath: 'id' });
          db.createObjectStore(getStoreName('junior', 'audit_logs'), { keyPath: 'id' });
          
          if (!db.objectStoreNames.contains(PENDING_WRITES_STORE)) {
              db.createObjectStore(PENDING_WRITES_STORE, { autoIncrement: true, keyPath: 'id' });
          }

          // Migrate old data if it exists
          if (db.objectStoreNames.contains('boys')) {
              console.log("Migrating old 'boys' data to 'company_boys'...");
              const oldStore = transaction!.objectStore('boys');
              const newStore = transaction!.objectStore(getStoreName('company', 'boys'));
              oldStore.openCursor().onsuccess = (e) => {
                  const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
                  if (cursor) {
                      newStore.put(cursor.value);
                      cursor.continue();
                  } else {
                      db.deleteObjectStore('boys');
                      console.log("Old 'boys' store migrated and deleted.");
                  }
              };
          }
          if (db.objectStoreNames.contains('audit_logs')) {
             console.log("Migrating old 'audit_logs' data to 'company_audit_logs'...");
             const oldStore = transaction!.objectStore('audit_logs');
             const newStore = transaction!.objectStore(getStoreName('company', 'audit_logs'));
             oldStore.openCursor().onsuccess = (e) => {
                 const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
                 if (cursor) {
                     newStore.put(cursor.value);
                     cursor.continue();
                 } else {
                     db.deleteObjectStore('audit_logs');
                     console.log("Old 'audit_logs' store migrated and deleted.");
                 }
             };
          }
      }
    };
  });
};

const getStore = (storeName: string, mode: IDBTransactionMode): IDBObjectStore => {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
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
export const saveLogToDB = async (log: AuditLog, section: Section): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'audit_logs'), 'readwrite');
    const request = store.put(log);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

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

export const deleteLogFromDB = async (id: string, section: Section): Promise<void> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(getStoreName(section, 'audit_logs'), 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

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
