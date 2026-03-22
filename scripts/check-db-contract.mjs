import { createClient } from '@supabase/supabase-js';

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const requireMeetingDay = (section, value) => {
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    throw new Error(`Settings row for ${section} has invalid meeting_day: ${value}`);
  }
};

const supabase = createClient(requireEnv('VITE_SUPABASE_URL'), requireEnv('VITE_SUPABASE_ANON_KEY'), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const allowedRoles = new Set(['admin', 'captain', 'officer']);

try {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: requireEnv('E2E_TEST_EMAIL'),
    password: requireEnv('E2E_TEST_PASSWORD'),
  });

  if (signInError) {
    throw new Error(`Failed to sign in smoke-test user: ${signInError.message}`);
  }

  if (!signInData.user) {
    throw new Error('Supabase sign-in succeeded without returning a user.');
  }

  const { data: role, error: roleError } = await supabase.rpc('current_app_role');

  if (roleError) {
    throw new Error(`Failed to resolve current_app_role(): ${roleError.message}`);
  }

  if (typeof role !== 'string' || !allowedRoles.has(role)) {
    throw new Error(`Unexpected app role for smoke-test user: ${String(role)}`);
  }

  const { data: settingsRows, error: settingsError } = await supabase
    .from('settings')
    .select('section,meeting_day')
    .in('section', ['company', 'junior']);

  if (settingsError) {
    throw new Error(`Failed to read seeded settings rows: ${settingsError.message}`);
  }

  const rows = settingsRows ?? [];
  const rowsBySection = new Map(rows.map((row) => [row.section, row]));

  if (rows.length !== 2 || rowsBySection.size !== 2) {
    throw new Error(
      `Expected exactly one settings row for company and junior. Received ${rows.length} row(s).`,
    );
  }

  for (const section of ['company', 'junior']) {
    const row = rowsBySection.get(section);

    if (!row) {
      throw new Error(`Missing seeded settings row for ${section}.`);
    }

    requireMeetingDay(section, row.meeting_day);
  }

  console.log(`Database contract smoke check passed for ${signInData.user.email} (${role}).`);
} finally {
  await supabase.auth.signOut();
}
