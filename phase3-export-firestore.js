import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Environment Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// The collections you listed
const COLLECTIONS = [
  'audit_logs',
  'boys',
  'company_audit_logs',
  'company_boys',
  'invites',
  'junior_audit_logs',
  'junior_boys',
  'settings',
  'user_activity',
  'user_roles'
];

async function exportFirestore() {
  console.log('Starting Firestore Export...');
  const fullDump = {};

  for (const collectionName of COLLECTIONS) {
    console.log(`Reading collection: ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`  -> [EMPTY] (Skipping)`);
      continue;
    }

    fullDump[collectionName] = [];
    
    snapshot.forEach(doc => {
      // We store the ID and the data
      const data = doc.data();
      
      // Helper to convert Firestore Timestamps to ISO strings for JSON compatibility
      const sanitizedData = Object.keys(data).reduce((acc, key) => {
        const value = data[key];
        if (value && typeof value === 'object' && '_seconds' in value) {
            // It's a timestamp object from Firebase Admin
            acc[key] = new Date(value._seconds * 1000).toISOString();
        } else if (value && value.toDate && typeof value.toDate === 'function') {
            // It's a native Firestore Timestamp
            acc[key] = value.toDate().toISOString();
        } else {
            acc[key] = value;
        }
        return acc;
      }, {});

      fullDump[collectionName].push({
        _id: doc.id,
        ...sanitizedData
      });
    });
    
    console.log(`  -> [OK] Exported ${fullDump[collectionName].length} documents.`);
  }

  // Save to file
  const filename = 'firestore-dump.json';
  fs.writeFileSync(filename, JSON.stringify(fullDump, null, 2));
  console.log(`\nSUCCESS: All data exported to ${filename}`);
  process.exit(0);
}

exportFirestore().catch(console.error);