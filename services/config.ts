/**
 * @file config.ts
 * @description This file exports the Firebase configuration object for the application.
 */

import { FirebaseConfig } from './firebase';

// --- Firebase Configuration ---
// It is standard and safe practice for client-side web applications to include the
// Firebase configuration directly in the code. This information is necessary for the
// Firebase SDK to connect to the correct project.
//
// Security is not managed by hiding these keys; it is enforced through Firebase
// Security Rules defined on the backend (in the Firebase console). These rules
// control who can read or write data, ensuring that only authenticated users
// can access the information they are permitted to.
export const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyABlNyf1h1EtqWG8g-YoyLwmdoF1fE4HRE",
  authDomain: "bb-manager-af77f.firebaseapp.com",
  projectId: "bb-manager-af77f",
  storageBucket: "bb-manager-af77f.firebasestorage.app",
  messagingSenderId: "501850814005",
  appId: "1:501850814005:web:acddde9ec0577a1050237c"
};
