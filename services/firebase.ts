import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyABlNyf1h1EtqWG8g-YoyLwmdoF1fE4HRE",
  authDomain: "bb-manager-af77f.firebaseapp.com",
  projectId: "bb-manager-af77f",
  storageBucket: "bb-manager-af77f.appspot.com",
  messagingSenderId: "501850814005",
  appId: "1:501850814005:web:acddde9ec0577a1050237c"
};

export const initializeFirebase = () => {
  if (app) {
    return;
  }
  
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw new Error("Failed to initialize Firebase with the hard-coded configuration.");
  }
};

export const getDb = (): Firestore => {
  if (!db) {
    throw new Error("Firebase is not initialized. Call initializeFirebase() first.");
  }
  return db;
};

export const getAuthInstance = (): Auth => {
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Call initializeFirebase() first.");
  }
  return auth;
};
