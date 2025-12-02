/**
 * @file offlineDb.ts
 * @description Wrapper around IndexedDB using generic helpers to minimize boilerplate.
 */

import { Section, UserRoleInfo, EncryptedPayload, PendingWrite } from '../types';
import { DB_NAME, DB_VERSION, PENDING_WRITES_STORE, USER_ROLES_STORE, GLOBAL_AUDIT_LOGS_STORE, DLQ_STORE } from '../src/constants';

let db: IDBDatabase;

export const getStoreName = (section: Section | null, resource: 'boys' | 'audit_logs') => {
    if (resource === 'audit_logs' && section === null) return GLOBAL_AUDIT_LOGS_STORE;
    if (!section) return `unknown_section_${resource}`;
    return `${section}_${resource}`;
};

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const createStore = (name: string, options?: IDBObjectStoreParameters) => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options);
      };
      
      if (db.objectStoreNames.contains('invite_codes')) db.deleteObjectStore('invite_codes');

      createStore(GLOBAL_AUDIT_LOGS_STORE, { keyPath: 'id' });
      createStore('company_boys', { keyPath: 'id' });
      createStore('company_audit_logs', { keyPath: 'id' });
      createStore('junior_boys', { keyPath: 'id' });
      createStore('junior_audit_logs', { keyPath: 'id' });
      createStore(PENDING_WRITES_STORE, { autoIncrement: true, keyPath: 'id' });
      createStore(USER_ROLES_STORE, { keyPath: 'uid' });
      createStore(DLQ_STORE, { autoIncrement: true, keyPath: 'id' });
    };
  });
};

// Generic Transaction Helper
const performTx = <T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
    return new Promise(async (resolve, reject) => {
        try {
            await openDB();
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            const request = operation(store);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (e) { reject(e); }
    });
};

// Generic CRUD
export const getItem = <T>(storeName: string, key: string): Promise<T | undefined> => 
    performTx(storeName, 'readonly', store => store.get(key));

export const getAllItems = <T>(storeName: string): Promise<T[]> => 
    performTx(storeName, 'readonly', store => store.getAll());

export const putItem = (storeName: string, item: any): Promise<void> => 
    performTx(storeName, 'readwrite', store => store.put(item));

export const addItem = (storeName: string, item: any): Promise<void> => 
    performTx(storeName, 'readwrite', store => store.add(item));

export const deleteItem = (storeName: string, key: string): Promise<void> => 
    performTx(storeName, 'readwrite', store => store.delete(key));

export const clearStore = (storeName: string): Promise<void> => 
    performTx(storeName, 'readwrite', store => store.clear());

// Specific Domain Wrappers
export const saveBoyToDB = (id: string, encryptedData: EncryptedPayload, section: Section) => 
    putItem(getStoreName(section, 'boys'), { id, encryptedData });

export const getBoysFromDB = (section: Section) => 
    getAllItems<{ id: string, encryptedData: EncryptedPayload }>(getStoreName(section, 'boys'));

export const getBoyFromDB = (id: string, section: Section) => 
    getItem<{ id: string, encryptedData: EncryptedPayload }>(getStoreName(section, 'boys'), id);

export const deleteBoyFromDB = (id: string, section: Section) => 
    deleteItem(getStoreName(section, 'boys'), id);

export const saveBoysToDB = async (boys: any[], section: Section) => {
    await openDB(); // Batch optimization remains manual
    const tx = db.transaction(getStoreName(section, 'boys'), 'readwrite');
    const store = tx.objectStore(getStoreName(section, 'boys'));
    boys.forEach(boy => store.put(boy));
    return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
};

export const saveLogToDB = (id: string, encryptedData: EncryptedPayload, section: Section | null) => 
    putItem(getStoreName(section, 'audit_logs'), { id, encryptedData });

export const getLogsFromDB = (section: Section | null) => 
    getAllItems<{ id: string, encryptedData: EncryptedPayload }>(getStoreName(section, 'audit_logs'));

export const deleteLogFromDB = (id: string, section: Section | null) => 
    deleteItem(getStoreName(section, 'audit_logs'), id);

export const saveLogsToDB = async (logs: any[], section: Section | null) => {
    await openDB();
    const tx = db.transaction(getStoreName(section, 'audit_logs'), 'readwrite');
    const store = tx.objectStore(getStoreName(section, 'audit_logs'));
    logs.forEach(log => store.put(log));
    return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
};

export const deleteLogsFromDB = async (ids: string[], section: Section | null) => {
    await openDB();
    const tx = db.transaction(getStoreName(section, 'audit_logs'), 'readwrite');
    const store = tx.objectStore(getStoreName(section, 'audit_logs'));
    ids.forEach(id => store.delete(id));
    return new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
};

export const saveUserRoleToDB = (uid: string, roleInfo: UserRoleInfo) => 
    putItem(USER_ROLES_STORE, { uid, ...roleInfo });

export const getUserRoleFromDB = (uid: string): Promise<UserRoleInfo | undefined> => 
    getItem<{ uid: string } & UserRoleInfo>(USER_ROLES_STORE, uid).then(data => {
        if (!data) return undefined;
        // CRITICAL FIX: Strip the uid property before returning to ensure deepEqual comparison works correctly 
        // in userService.ts against the Supabase result (which lacks uid).
        const { uid: _, ...roleInfo } = data;
        return roleInfo as UserRoleInfo;
    });

export const deleteUserRoleFromDB = (uid: string) => 
    deleteItem(USER_ROLES_STORE, uid);

export const clearAllUserRolesFromDB = () => clearStore(USER_ROLES_STORE);

export const addPendingWrite = (write: Omit<PendingWrite, 'id'>) => 
    addItem(PENDING_WRITES_STORE, write);

export const getPendingWrites = () => 
    getAllItems<PendingWrite>(PENDING_WRITES_STORE);

export const clearPendingWrites = () => clearStore(PENDING_WRITES_STORE);

export const addToDLQ = (write: PendingWrite, error: string) => 
    addItem(DLQ_STORE, { ...write, error, failedAt: new Date().toISOString() });

export const clearAllLocalDataFromDB = async () => {
    await Promise.all([
        clearStore(getStoreName('company', 'boys')),
        clearStore(getStoreName('junior', 'boys')),
        clearStore(getStoreName('company', 'audit_logs')),
        clearStore(getStoreName('junior', 'audit_logs')),
        clearStore(GLOBAL_AUDIT_LOGS_STORE),
        clearStore(PENDING_WRITES_STORE),
        clearStore(USER_ROLES_STORE),
        clearStore(DLQ_STORE),
    ]);
};