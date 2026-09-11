const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const supabaseUrl = requireEnv('VITE_SUPABASE_URL').replace(/\/$/, '');
const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY');
const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  },
});

if (!response.ok) {
  throw new Error(`Failed to read Auth settings (${response.status}).`);
}

const settings = await response.json();

if (settings.disable_signup !== true) {
  throw new Error('Public signup must be disabled (disable_signup=true).');
}

if (settings.passkeys_enabled !== true) {
  throw new Error('Passkey authentication must be enabled (passkeys_enabled=true).');
}

console.log('Auth config check passed: public signup is disabled and passkeys are enabled.');
