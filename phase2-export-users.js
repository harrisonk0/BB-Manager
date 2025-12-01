import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Fix for ES Modules directory resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the current directory
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
}

// Debug check
console.log('Loading configuration...');
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  console.error('\n[ERROR] Missing Configuration!');
  console.error('Could not find FIREBASE_SERVICE_ACCOUNT_PATH in your .env file.');
  console.error(`Looking in: ${envPath}`);
  console.error('\nPlease ensure your .env file looks like this:');
  console.error('FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json');
  process.exit(1);
}

// Resolve the full path to the JSON file
const fullServiceAccountPath = path.resolve(__dirname, serviceAccountPath);

if (!fs.existsSync(fullServiceAccountPath)) {
  console.error(`\n[ERROR] File not found: ${fullServiceAccountPath}`);
  console.error('Please make sure you downloaded the JSON key from Firebase and saved it with this name.');
  process.exit(1);
}

// 1. Setup Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync(fullServiceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

async function exportUsers() {
  console.log('Starting Firebase User Export...');
  const allUsers = [];
  let nextPageToken;

  try {
    // 2. Loop through all users in batches of 1000
    do {
      const listUsersResult = await getAuth().listUsers(1000, nextPageToken);
      
      listUsersResult.users.forEach((userRecord) => {
        allUsers.push({
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          phoneNumber: userRecord.phoneNumber,
          disabled: userRecord.disabled,
          metadata: userRecord.metadata,
          passwordHash: userRecord.passwordHash,
          passwordSalt: userRecord.passwordSalt,
          customClaims: userRecord.customClaims
        });
      });

      nextPageToken = listUsersResult.pageToken;
      process.stdout.write(`\rFetched ${allUsers.length} users...`);
    } while (nextPageToken);

    // 3. Save to file
    fs.writeFileSync('firebase-users.json', JSON.stringify(allUsers, null, 2));
    console.log(`\n\nSUCCESS: Exported ${allUsers.length} users to firebase-users.json`);
    process.exit(0);
  } catch (error) {
    console.error('\n\n[EXPORT FAILED]', error);
    process.exit(1);
  }
}

exportUsers();