import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// 1. Setup Supabase Admin
// We need the SERVICE_ROLE key to bypass Auth restrictions
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
  
  if (!fs.existsSync('firebase-users.json')) {
    console.error('Error: firebase-users.json not found. Run the export script first.');
    process.exit(1);
  }

  const users = JSON.parse(fs.readFileSync('firebase-users.json', 'utf8'));
  let successCount = 0;
  let errorCount = 0;

  // 2. Loop and Create
  for (const user of users) {
    if (!user.email) {
      console.log(`Skipping user ${user.uid} (No email)`);
      continue;
    }

    try {
      // createUser allows us to specify the ID, preserving the Firebase UID
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        id: user.uid, // CRITICAL: This links the user to their future data
        password: 'temp-password-123', // Placeholder as discussed
        email_confirm: user.emailVerified,
        user_metadata: {
          display_name: user.displayName,
          photo_url: user.photoURL,
          firebase_uid: user.uid // backup reference
        }
      });

      if (error) throw error;
      console.log(`Imported: ${user.email}`);
      successCount++;
    } catch (err) {
      console.error(`Failed: ${user.email} - ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\nImport Complete! Success: ${successCount}, Failed: ${errorCount}`);
  process.exit(0);
}

importUsers().catch(console.error);