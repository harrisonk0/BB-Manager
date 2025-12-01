import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('firestore-dump.json', 'utf8'));

// Helper to determine a rough SQL type
function guessType(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'numeric'; // Safe bet for all numbers
  if (Array.isArray(value)) return 'jsonb';
  if (typeof value === 'object' && value !== null) return 'jsonb';
  if (typeof value === 'string') {
    // Check if it looks like a date
    if (value.match(/^\d{4}-\d{2}-\d{2}T/)) return 'timestamptz';
    return 'text';
  }
  return 'text';
}

function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

console.log('--- DETECTED SCHEMA ---');

for (const [table, records] of Object.entries(dump)) {
  const fields = {};

  records.forEach(record => {
    Object.keys(record).forEach(key => {
      if (key === '_id') return; // We know this maps to 'id'
      
      const snakeKey = toSnakeCase(key);
      const type = guessType(record[key]);
      
      // Keep the most complex type found (e.g. if some are null/text but one is jsonb, treat as jsonb)
      if (!fields[snakeKey]) {
        fields[snakeKey] = type;
      } else if (fields[snakeKey] === 'text' && type === 'jsonb') {
        fields[snakeKey] = 'jsonb';
      }
    });
  });

  console.log(`\nTABLE: ${table}`);
  Object.entries(fields).forEach(([col, type]) => {
    console.log(`  ${col}: ${type}`);
  });
}