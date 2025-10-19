import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Boy } from '../types';
import { getDb, getAuthInstance } from './firebase';

const BOYS_COLLECTION = 'boys';

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

// DELETE a boy by ID
export const deleteBoyById = async (id: string): Promise<void> => {
  const db = getDb();
  const auth = getAuthInstance();
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  const docRef = doc(db, BOYS_COLLECTION, id);
  await deleteDoc(docRef);
};
