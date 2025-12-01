import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// 1. Setup Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

async function exportUsers() {
  console.log('Starting Firebase User Export...');
  const allUsers = [];
  let nextPageToken;

  // 2. Loop through all users in batches of 1000
  do {
    const listUsersResult = await getAuth().listUsers(1000, nextPageToken);
    
    listUsersResult.users.forEach((userRecord) => {
      // We extract only what we need for Supabase
      allUsers.push({
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        phoneNumber: userRecord.phoneNumber,
        disabled: userRecord.disabled,
        metadata: userRecord.metadata,
        // We capture hash info just in case, though SDK import ignores it
        passwordHash: userRecord.passwordHash,
        passwordSalt: userRecord.passwordSalt,
        customClaims: userRecord.customClaims
      });
    });

    nextPageToken = listUsersResult.pageToken;
    console.log(`Fetched ${allUsers.length} users so far...`);
  } while (nextPageToken);

  // 3. Save to file
  fs.writeFileSync('firebase-users.json', JSON.stringify(allUsers, null, 2));
  console.log(`\nSUCCESS: Exported ${allUsers.length} users to firebase-users.json`);
  process.exit(0);
}

exportUsers().catch(console.error);