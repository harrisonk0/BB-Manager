/**
 * @file firebase.ts
 * @description This file handles the initialization of Firebase services.
 * It uses a singleton pattern to ensure that Firebase is only initialized once
 * and provides getter functions to access the Firestore, and Auth instances throughout the app.
 */

// FIX: Changed to namespace imports to fix module resolution issues.
import * as fbApp from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
// FIX: Use named imports for Firebase v9 compatibility.
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

// Interface for the Firebase configuration object structure.
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Singleton instances for Firebase services.
let app: fbApp.FirebaseApp | null = null;
let db: Firestore | null = null;
// FIX: Use Auth type from named import.
let auth: Auth | null = null;

/**
 * Initializes the Firebase app and its services (Firestore, Auth).
 * This function is designed to be called once when the application starts.
 * It checks if the app is already initialized to prevent re-initialization.
 */
export const initializeFirebase = () => {
  // If the app instance already exists, do nothing.
  if (app) {
    return;
  }

  const config = firebaseConfig;

  // Validate that the Firebase configuration is complete.
  if (!config || !config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      const errorMessage = `Firebase configuration is missing or invalid. Ensure all FIREBASE_* environment variables are set correctly in the hosting environment.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
  }
  
  try {
    app = fbApp.initializeApp(config);
    db = getFirestore(app);
    // FIX: Use getAuth function from named import.
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw new Error("Failed to initialize Firebase. Please check your configuration.");
  }
};

/**
 * Getter function for the Firestore database instance.
 * @returns The Firestore instance.
 * @throws An error if Firebase has not been initialized.
 */
export const getDb = (): Firestore => {
  if (!db) {
    throw new Error("Firebase is not initialized. Call initializeFirebase() first.");
  }
  return db;
};

/**
 * Getter function for the Firebase Auth instance.
 * @returns The Auth instance.
 * @throws An error if Firebase has not been initialized.
 */
// FIX: Use Auth type from named import.
export const getAuthInstance = (): Auth => {
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Call initializeFirebase() first.");
  }
  return auth;
};
