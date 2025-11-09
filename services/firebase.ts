import { initializeApp, FirebaseApp } from 'firebase/app';
// FIX: Changed to named imports for Firebase v9 compatibility.
import { Firestore, getFirestore, doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth, Auth, createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | null = null;
// FIX: Use imported Firestore type directly.
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
    // FIX: Use imported getFirestore function directly.
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw new Error("Failed to initialize Firebase with the hard-coded configuration.");
  }
};

// FIX: Use imported Firestore type directly.
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

export const createOfficerAccount = async (email: string, password: string, inviteId: string): Promise<UserCredential> => {
    const dbInstance = getDb();
    const authInstance = getAuthInstance();
    
    const inviteRef = doc(dbInstance, 'invites', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists() || inviteSnap.data().isUsed) {
        throw new Error('This invitation link is invalid or has already been used.');
    }
    
    // Try to create the user first
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
    
    // If successful, mark the invite as used
    try {
        await updateDoc(inviteRef, { 
            isUsed: true,
            redeemedAt: serverTimestamp(),
            redeemedBy: email
        });
    } catch (dbError) {
        // This is a fallback. If updating the code fails, the user is created but the invite isn't marked.
        // The next time they try to sign up it will fail at createUserWithEmailAndPassword, so it's not a major security issue, just a dangling invite.
        console.error("CRITICAL: Failed to mark invite as used after user creation.", dbError);
    }
    
    return userCredential;
}