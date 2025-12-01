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
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load data and ID map
const dump = JSON.parse(fs.readFileSync('firestore-dump.json', 'utf8'));
const idMap = JSON.parse(fs.readFileSync('id-map.json', 'utf8'));

// Helper to recursively replace IDs in objects
function replaceIds(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => replaceIds(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      let value = obj[key];
      
      // Check if value is one of our old IDs
      if (typeof value === 'string' && idMap[value]) {
        value = idMap[value];
      }
      
      newObj[key] = replaceIds(value);
    }
    return newObj;
  }
  return obj;
}

// Convert camelCase keys (Firestore) to snake_case keys (Postgres/Supabase)
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper to sanitize data for Postgres
function sanitizeData(obj) {
  const newObj = {};
  for (const key in obj) {
    const snakeKey = toSnakeCase(key);
    let value = obj[key];

    // FIX: Convert Epoch timestamps (numbers or strings looking like numbers) to ISO Strings
    // Only applies to keys that look like time/date columns
    if ((snakeKey.includes('time') || snakeKey.includes('date') || snakeKey.includes('at')) && value) {
      // If it's a number (milliseconds) or a string that contains only digits
      if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
        // Assume milliseconds if the number is huge (greater than year 2000 in seconds)
        // 946684800000 is year 2000 in ms
        const numVal = Number(value);
        if (numVal > 946684800000) {
           value = new Date(numVal).toISOString();
        }
      }
    }

    newObj[snakeKey] = value;
  }
  return newObj;
}

async function importToSupabase() {
  console.log('Starting Supabase Data Import...');

  for (const [collectionName, records] of Object.entries(dump)) {
    if (records.length === 0) continue;

    console.log(`Processing table: ${collectionName}...`);

    const cleanRecords = records.map(record => {
      // 1. Rename _id to id
      const { _id, ...rest } = record;
      const dataWithId = { id: _id, ...rest };

      // 2. Replace IDs
      const dataWithNewIds = replaceIds(dataWithId);

      // 3. Convert keys to snake_case AND fix timestamps
      return sanitizeData(dataWithNewIds);
    });

    // 4. Insert in batches
    const { error } = await supabase
      .from(collectionName)
      .upsert(cleanRecords);

    if (error) {
      console.error(`  -> ERROR importing ${collectionName}:`, error.message);
    } else {
      console.log(`  -> [OK] Imported ${cleanRecords.length} records.`);
    }
  }

  console.log('\nMigration Complete!');
}

importToSupabase();