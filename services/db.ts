import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, Timestamp, query, orderBy } from 'firebase/firestore';
import { Boy, AuditLog } from '../types';
import { getDb, getAuthInstance } from './firebase';

const BOYS_COLLECTION = 'boys';
const AUDIT_LOGS_COLLECTION = 'audit_logs';

// --- Boy Functions ---

// CREATE a new boy
export const createBoy = async (boy: Omit<Boy, 'id'>): Promise<Boy> => {
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  const boyCollection = collection(db, BOYS_COLLECTION);
  const docRef = await addDoc(boyCollection, boy);
  return { ...boy, id: docRef.id };
};

// READ all boys
export const fetchBoys = async (): Promise<Boy[]> => {
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) return []; // Return empty array if not logged in

  const boyCollection = collection(db, BOYS_COLLECTION);
  const snapshot = await getDocs(boyCollection);
  return snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Boy));
};

// READ a single boy by ID
export const fetchBoyById = async (id: string): Promise<Boy | undefined> => {
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");

  const docRef = doc(db, BOYS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { ...docSnap.data(), id: docSnap.id } as Boy;
  } else {
    return undefined;
  }
};

// UPDATE a boy's record
export const updateBoy = async (boy: Boy): Promise<Boy> => {
  if (!boy.id) {
    throw new Error("Boy must have an ID to be updated");
  }
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");

  const { id, ...boyData } = boy;
  const docRef = doc(db, BOYS_COLLECTION, id);
  await updateDoc(docRef, boyData as any);
  return boy;
};

// RECREATE a boy with a specific ID (for revert)
export const recreateBoy = async (boy: Boy): Promise<Boy> => {
  if (!boy.id) {
    throw new Error("Boy must have an ID to be recreated");
  }
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");

  const docRef = doc(db, BOYS_COLLECTION, boy.id);
  const { id, ...boyData } = boy;
  await setDoc(docRef, boyData);
  return boy;
};

// DELETE a boy by ID
export const deleteBoyById = async (id: string): Promise<void> => {
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  const docRef = doc(db, BOYS_COLLECTION, id);
  await deleteDoc(docRef);
};


// --- Audit Log Functions ---

// CREATE a new audit log
export const createAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated for logging");

  const logData = { ...log, timestamp: serverTimestamp() };
  const docRef = await addDoc(collection(db, AUDIT_LOGS_COLLECTION), logData);
  return { ...log, id: docRef.id, timestamp: Date.now() }; // Return client-side version
};

// READ all audit logs
export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) return [];

  const q = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    const timestamp = data.timestamp;
    let timestampInMillis: number;

    if (timestamp && typeof timestamp.toMillis === 'function') {
      // It's a Firestore Timestamp object.
      timestampInMillis = timestamp.toMillis();
    } else if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
      // It's a plain object with seconds and nanoseconds (e.g., from cache or serialization).
      timestampInMillis = timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;
    } else {
      // Fallback for null, undefined, or other types. Use current time.
      timestampInMillis = Date.now();
    }
    
    return {
      ...data,
      id: doc.id,
      timestamp: timestampInMillis,
    } as AuditLog;
  });
};

// UPDATE an audit log (e.g., to mark as reverted)
export const updateAuditLog = async (log: AuditLog): Promise<AuditLog> => {
  if (!log.id) {
    throw new Error("Log must have an ID to be updated");
  }
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");

  const { id, ...logData } = log;
  const docRef = doc(db, AUDIT_LOGS_COLLECTION, id);
  await updateDoc(docRef, logData as any);
  return log;
};