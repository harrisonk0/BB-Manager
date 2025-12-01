import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Environment Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function importUsers() {
  console.log('Starting Supabase User Import...');
  
  try {
    const users = JSON.parse(fs.readFileSync('firebase-users.json', 'utf8'));
    const idMap = {}; // Maps Firebase UID -> Supabase UUID
    
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      console.log(`Importing ${user.email}...`);

      // 1. Check if user already exists to avoid duplicates
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === user.email);

      if (existingUser) {
        console.log(`  -> User already exists. Mapping ID.`);
        idMap[user.uid] = existingUser.id;
        successCount++;
        continue;
      }

      // 2. Create new user (Let Supabase generate the ID)
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        email_confirm: user.emailVerified,
        password: 'temp-password-change-me', // User will need to reset password
        user_metadata: {
          displayName: user.displayName,
          photoURL: user.photoURL,
          firebase_uid: user.uid, // Store old ID for reference
          ...user.customClaims
        }
      });

      if (error) {
        console.error(`  -> Failed: ${error.message}`);
        failCount++;
      } else {
        console.log(`  -> Success! New ID: ${data.user.id}`);
        idMap[user.uid] = data.user.id;
        successCount++;
      }
    }

    // 3. Save the ID Mapping for Phase 3
    fs.writeFileSync('id-map.json', JSON.stringify(idMap, null, 2));
    
    console.log(`\nImport Complete! Success: ${successCount}, Failed: ${failCount}`);
    console.log('ID Mapping saved to id-map.json (REQUIRED for database migration)');

  } catch (err) {
    console.error('Fatal Error:', err);
  }
}

importUsers();