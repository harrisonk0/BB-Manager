/**
 * Supabase-aware IndexedDB cache for offline reads and queued writes.
 */

import { AuditLog, Boy, InviteCode, Section, UserRole } from '../types';

export type PendingWrite = {
  id?: number;
  section?: Section;
  type:
    | 'CREATE_BOY'
    | 'UPDATE_BOY'
    | 'DELETE_BOY'
    | 'RECREATE_BOY'
    | 'CREATE_AUDIT_LOG'
    | 'CREATE_INVITE_CODE'
    | 'UPDATE_INVITE_CODE'
    | 'UPDATE_USER_ROLE'
    | 'DELETE_USER_ROLE';
  payload: any;
  tempId?: string;
};

const DB_NAME = 'supabase-cache';
const DB_VERSION = 1;

const STORES = {
  BOYS: 'boys',
  AUDIT_LOGS: 'audit_logs',
  INVITE_CODES: 'invite_codes',
  SETTINGS: 'settings',
  USER_ROLES: 'user_roles',
  PENDING_WRITES: 'pending_writes',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let db: IDBDatabase;

export const openDB = async (): Promise<IDBDatabase> => {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORES.BOYS)) {
        database.createObjectStore(STORES.BOYS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.AUDIT_LOGS)) {
        database.createObjectStore(STORES.AUDIT_LOGS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.INVITE_CODES)) {
        database.createObjectStore(STORES.INVITE_CODES, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.USER_ROLES)) {
        database.createObjectStore(STORES.USER_ROLES, { keyPath: 'uid' });
      }
      if (!database.objectStoreNames.contains(STORES.PENDING_WRITES)) {
        database.createObjectStore(STORES.PENDING_WRITES, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

const getStore = (storeName: StoreName, mode: IDBTransactionMode) => {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
};

const withStore = async <T>(
  store: StoreName,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest,
): Promise<T> => {
  await openDB();
  return new Promise((resolve, reject) => {
    const request = action(getStore(store, mode));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
};

const guardId = (record: any, key: string) => {
  if (!record || record[key] === undefined || record[key] === null) {
    console.warn(`Skipping cache write: record missing required key '${key}'`, record);
    return false;
  }
  return true;
};

export const clearStore = async (storeName: StoreName): Promise<void> => {
  await withStore(storeName, 'readwrite', (store) => store.clear());
};

// Boys
export const saveBoyToDB = async (boy: Boy, section: Section): Promise<void> => {
  if (!guardId(boy, 'id')) return;
  await withStore<void>(STORES.BOYS, 'readwrite', (store) => store.put({ ...boy, section }));
};

export const saveBoysToDB = async (boys: Boy[], section: Section): Promise<void> => {
  await openDB();
  const filtered = boys.filter((b) => b && b.id !== undefined && b.id !== null);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BOYS, 'readwrite');
    const store = tx.objectStore(STORES.BOYS);
    filtered.forEach((boy) => store.put({ ...boy, section }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getBoysFromDB = async (section: Section): Promise<Boy[]> => {
  const boys = await withStore<Boy[]>(STORES.BOYS, 'readonly', (store) => store.getAll());
  return boys.filter((b) => b.section === section);
};

export const getBoyFromDB = async (id: string, section: Section): Promise<Boy | undefined> => {
  const boy = await withStore<Boy | undefined>(STORES.BOYS, 'readonly', (store) => store.get(id));
  if (boy && boy.section === section) return boy;
  return undefined;
};

export const deleteBoyFromDB = async (id: string, section: Section): Promise<void> => {
  const existing = await getBoyFromDB(id, section);
  if (!existing) return;
  await withStore<void>(STORES.BOYS, 'readwrite', (store) => store.delete(id));
};

// Audit Logs
export const saveLogToDB = async (log: AuditLog, section: Section | null): Promise<void> => {
  if (!guardId(log, 'id')) return;
  await withStore<void>(STORES.AUDIT_LOGS, 'readwrite', (store) => store.put({ ...log, section }));
};

export const saveLogsToDB = async (logs: AuditLog[], section: Section | null): Promise<void> => {
  await openDB();
  const valid = logs.filter((l) => l && l.id !== undefined && l.id !== null);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AUDIT_LOGS, 'readwrite');
    const store = tx.objectStore(STORES.AUDIT_LOGS);
    valid.forEach((log) => store.put({ ...log, section }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getLogsFromDB = async (section: Section | null): Promise<AuditLog[]> => {
  const logs = await withStore<AuditLog[]>(STORES.AUDIT_LOGS, 'readonly', (store) => store.getAll());
  return logs
    .filter((l) => (section === null ? l.section === null : l.section === section))
    .sort((a, b) => b.timestamp - a.timestamp);
};

export const deleteLogFromDB = async (id: string, section: Section | null): Promise<void> => {
  const existing = await withStore<AuditLog | undefined>(STORES.AUDIT_LOGS, 'readonly', (store) => store.get(id));
  if (!existing) return;
  if ((section === null && existing.section !== null) || (section && existing.section !== section)) return;
  await withStore<void>(STORES.AUDIT_LOGS, 'readwrite', (store) => store.delete(id));
};

export const deleteLogsFromDB = async (logIds: string[], _section: Section | null): Promise<void> => {
  await openDB();
  const tx = db.transaction(STORES.AUDIT_LOGS, 'readwrite');
  const store = tx.objectStore(STORES.AUDIT_LOGS);
  tx.oncomplete = () => {};
  logIds.forEach((id) => store.delete(id));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Invite Codes
export const saveInviteCodeToDB = async (code: InviteCode): Promise<void> => {
  if (!guardId(code, 'id')) return;
  await withStore<void>(STORES.INVITE_CODES, 'readwrite', (store) => store.put(code));
};

export const getInviteCodeFromDB = async (id: string): Promise<InviteCode | undefined> => {
  return withStore<InviteCode | undefined>(STORES.INVITE_CODES, 'readonly', (store) => store.get(id));
};

export const getAllInviteCodesFromDB = async (): Promise<InviteCode[]> => {
  return withStore<InviteCode[]>(STORES.INVITE_CODES, 'readonly', (store) => store.getAll());
};

export const deleteInviteCodeFromDB = async (id: string): Promise<void> => {
  await withStore<void>(STORES.INVITE_CODES, 'readwrite', (store) => store.delete(id));
};

export const deleteInviteCodesFromDB = async (codeIds: string[]): Promise<void> => {
  await openDB();
  const tx = db.transaction(STORES.INVITE_CODES, 'readwrite');
  const store = tx.objectStore(STORES.INVITE_CODES);
  codeIds.forEach((id) => store.delete(id));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearUsedRevokedInviteCodesFromDB = async (): Promise<void> => {
  await openDB();
  const tx = db.transaction(STORES.INVITE_CODES, 'readwrite');
  const store = tx.objectStore(STORES.INVITE_CODES);
  const request = store.openCursor();
  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
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

export const clearAllInviteCodesFromDB = async (): Promise<void> => clearStore(STORES.INVITE_CODES);

// User Roles
export const saveUserRoleToDB = async (uid: string, role: UserRole): Promise<void> => {
  await withStore<void>(STORES.USER_ROLES, 'readwrite', (store) => store.put({ uid, role }));
};

export const getUserRoleFromDB = async (uid: string): Promise<UserRole | undefined> => {
  const record = await withStore<{ uid: string; role: UserRole } | undefined>(STORES.USER_ROLES, 'readonly', (store) =>
    store.get(uid),
  );
  return record?.role;
};

export const deleteUserRoleFromDB = async (uid: string): Promise<void> => {
  await withStore<void>(STORES.USER_ROLES, 'readwrite', (store) => store.delete(uid));
};

export const clearAllUserRolesFromDB = async (): Promise<void> => clearStore(STORES.USER_ROLES);

// Pending Writes
export const addPendingWrite = async (write: Omit<PendingWrite, 'id'>): Promise<void> => {
  await withStore<void>(STORES.PENDING_WRITES, 'readwrite', (store) => store.add(write));
};

export const getPendingWrites = async (): Promise<PendingWrite[]> => {
  return withStore<PendingWrite[]>(STORES.PENDING_WRITES, 'readonly', (store) => store.getAll());
};

export const clearPendingWrites = async (): Promise<void> => clearStore(STORES.PENDING_WRITES);

// Clearing helpers
const deleteBySection = async (storeName: StoreName, predicate: (value: any) => boolean) => {
  await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const request = store.openCursor();
  return new Promise<void>((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        if (predicate(cursor.value)) {
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

export const clearAllSectionDataFromDB = async (section: Section): Promise<void> => {
  await Promise.all([
    deleteBySection(STORES.BOYS, (value) => value.section === section),
    deleteBySection(STORES.AUDIT_LOGS, (value) => value.section === section),
    clearPendingWrites(),
    clearAllInviteCodesFromDB(),
    clearAllUserRolesFromDB(),
  ]);
};
