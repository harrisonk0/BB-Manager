import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const chunk = (arr, size = 500) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const parseTimestampToISO = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return new Date(value).toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object') {
    if ('_seconds' in value || 'seconds' in value) {
      const seconds = value._seconds ?? value.seconds ?? 0;
      const nanos = value._nanoseconds ?? value.nanoseconds ?? 0;
      return new Date(seconds * 1000 + nanos / 1_000_000).toISOString();
    }
  }
  return null;
};

const loadJson = async (filename) => {
  const fullPath = path.join(__dirname, filename);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(raw);
};

const migrateBoys = async () => {
  const company = await loadJson('boys_company.json');
  const junior = await loadJson('boys_junior.json');

  const normalizeBoy = (boy, section) => ({
    id: boy.id || boy.uid || boy.docId || undefined,
    section,
    name: boy.name,
    squad: boy.squad,
    year: boy.year,
    marks: Array.isArray(boy.marks) ? boy.marks : [],
    is_squad_leader: boy.isSquadLeader ?? boy.is_squad_leader ?? false,
  });

  const rows = [
    ...company.map((b) => normalizeBoy(b, 'company')),
    ...junior.map((b) => normalizeBoy(b, 'junior')),
  ];

  for (const batch of chunk(rows)) {
    const { error } = await supabase.from('boys').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
  }

  console.log(`Migrated ${rows.length} boys records.`);
};

const migrateAuditLogs = async () => {
  const logs = await loadJson('audit_logs.json');

  const rows = logs.map((log) => ({
    id: log.id,
    section: log.section ?? null,
    timestamp: parseTimestampToISO(log.timestamp) || new Date(log.timestamp || Date.now()).toISOString(),
    user_email: log.userEmail || log.user_email,
    action_type: log.actionType || log.action_type,
    description: log.description,
    revert_data: log.revertData || log.revert_data || {},
    reverted_log_id: log.revertedLogId || log.reverted_log_id || null,
  }));

  for (const batch of chunk(rows)) {
    const { error } = await supabase.from('audit_logs').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
  }

  console.log(`Migrated ${rows.length} audit log records.`);
};

const migrateInviteCodes = async () => {
  const inviteCodes = await loadJson('invite_codes.json');

  const rows = inviteCodes.map((code) => ({
    id: code.id,
    generated_by: code.generatedBy || code.generated_by,
    generated_at: parseTimestampToISO(code.generatedAt || code.generated_at) || new Date().toISOString(),
    section: code.section ?? null,
    is_used: Boolean(code.isUsed),
    used_by: code.usedBy || null,
    used_at: parseTimestampToISO(code.usedAt) || null,
    revoked: Boolean(code.revoked),
    default_user_role: code.defaultUserRole || code.default_user_role,
    expires_at: parseTimestampToISO(code.expiresAt || code.expires_at),
  }));

  for (const batch of chunk(rows)) {
    const { error } = await supabase.from('invite_codes').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
  }

  console.log(`Migrated ${rows.length} invite codes.`);
};

const migrateUserRoles = async () => {
  const roles = await loadJson('user_roles.json');

  const rows = roles.map((role) => ({
    uid: role.uid || role.id,
    email: role.email,
    role: role.role,
    updated_at: parseTimestampToISO(role.updatedAt || role.updated_at) || new Date().toISOString(),
    created_at: parseTimestampToISO(role.createdAt || role.created_at) || new Date().toISOString(),
  }));

  for (const batch of chunk(rows)) {
    const { error } = await supabase.from('user_roles').upsert(batch, { onConflict: 'uid' });
    if (error) throw error;
  }

  console.log(`Migrated ${rows.length} user roles.`);
};

const migrateSettings = async () => {
  const settings = await loadJson('settings.json');

  const rows = settings.map((setting) => ({
    section: setting.section || setting.id,
    meeting_day: setting.meetingDay || setting.meeting_day || 5,
    updated_at: parseTimestampToISO(setting.updatedAt || setting.updated_at) || new Date().toISOString(),
  }));

  for (const batch of chunk(rows)) {
    const { error } = await supabase.from('settings').upsert(batch, { onConflict: 'section' });
    if (error) throw error;
  }

  console.log(`Migrated ${rows.length} settings rows.`);
};

const main = async () => {
  try {
    await migrateBoys();
    await migrateAuditLogs();
    await migrateInviteCodes();
    await migrateUserRoles();
    await migrateSettings();
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  }
};

main();
