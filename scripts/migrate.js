import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// --- CONFIGURATION ---
// 1. Get your Firebase Service Account Key (JSON file) from Firebase Console -> Project Settings -> Service Accounts
// 2. Save it as 'serviceAccountKey.json' in the root of your project.
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

// 3. Ensure your .env file has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use Service Role Key to bypass RLS for migration

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env file.');
  process.exit(1);
}

// --- INITIALIZATION ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- HELPER FUNCTIONS ---

// Convert Firestore Timestamp (or number) to ISO String for Postgres
const toIsoString = (ts) => {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'number') return new Date(ts).toISOString(); // It's already a millisecond timestamp
  if (ts.toDate) return ts.toDate().toISOString(); // It's a Firestore Timestamp
  return new Date(ts).toISOString(); // It's likely a string
};

// Convert Firestore Timestamp (or number) to BigInt (number) for Postgres BIGINT columns
const toBigInt = (ts) => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    if (ts.toMillis) return ts.toMillis();
    return Date.now();
};

async function migrateCollection(firestoreCol, supabaseTable, transformFn) {
  console.log(`Migrating ${firestoreCol} -> ${supabaseTable}...`);
  const snapshot = await db.collection(firestoreCol).get();
  
  if (snapshot.empty) {
    console.log(`No documents found in ${firestoreCol}.`);
    return;
  }

  const records = [];
  snapshot.forEach(doc => {
    records.push(transformFn(doc.id, doc.data()));
  });

  // Insert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const { error } = await supabase.from(supabaseTable).upsert(batch);
    if (error) {
      console.error(`Error inserting batch into ${supabaseTable}:`, error);
    } else {
      console.log(`Inserted ${batch.length} records into ${supabaseTable}.`);
    }
  }
}

// --- MIGRATION LOGIC ---

async function runMigration() {
  try {
    // 1. User Roles
    await migrateCollection('user_roles', 'user_roles', (id, data) => ({
      uid: id,
      email: data.email,
      role: data.role,
      created_at: toIsoString(data.created_at)
    }));

    // 2. Company Boys
    await migrateCollection('company_boys', 'boys', (id, data) => ({
      id: id,
      section: 'company',
      name: data.name,
      squad: data.squad,
      year: String(data.year), // Ensure string
      is_squad_leader: data.isSquadLeader || false,
      marks: data.marks || [], // Store as JSONB
      created_at: toIsoString(data.created_at)
    }));

    // 3. Junior Boys
    await migrateCollection('junior_boys', 'boys', (id, data) => ({
      id: id,
      section: 'junior',
      name: data.name,
      squad: data.squad,
      year: String(data.year),
      is_squad_leader: data.isSquadLeader || false,
      marks: data.marks || [],
      created_at: toIsoString(data.created_at)
    }));

    // 4. Audit Logs (Company)
    await migrateCollection('company_audit_logs', 'audit_logs', (id, data) => ({
      id: id,
      section: 'company',
      timestamp: toBigInt(data.timestamp),
      user_email: data.userEmail,
      action_type: data.actionType,
      description: data.description,
      revert_data: data.revertData || {},
      reverted_log_id: data.revertedLogId || null,
      created_at: toIsoString(data.timestamp) // Use action timestamp as created_at
    }));

    // 5. Audit Logs (Junior)
    await migrateCollection('junior_audit_logs', 'audit_logs', (id, data) => ({
      id: id,
      section: 'junior',
      timestamp: toBigInt(data.timestamp),
      user_email: data.userEmail,
      action_type: data.actionType,
      description: data.description,
      revert_data: data.revertData || {},
      reverted_log_id: data.revertedLogId || null,
      created_at: toIsoString(data.timestamp)
    }));
    
    // 6. Audit Logs (Global)
    await migrateCollection('global_audit_logs', 'audit_logs', (id, data) => ({
        id: id,
        section: null,
        timestamp: toBigInt(data.timestamp),
        user_email: data.userEmail,
        action_type: data.actionType,
        description: data.description,
        revert_data: data.revertData || {},
        reverted_log_id: data.revertedLogId || null,
        created_at: toIsoString(data.timestamp)
    }));

    // 7. Invite Codes
    await migrateCollection('invite_codes', 'invite_codes', (id, data) => ({
      id: id,
      generated_by: data.generatedBy,
      generated_at: toBigInt(data.generatedAt),
      section: data.section || null,
      is_used: data.isUsed || false,
      used_by: data.usedBy || null,
      used_at: toBigInt(data.usedAt),
      revoked: data.revoked || false,
      default_user_role: data.defaultUserRole || 'officer',
      expires_at: toBigInt(data.expiresAt),
      created_at: toIsoString(data.generatedAt)
    }));

    console.log("Migration Complete!");
  } catch (error) {
    console.error("Migration Failed:", error);
  }
}

runMigration();