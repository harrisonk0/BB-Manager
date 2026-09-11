const PRODUCTION_PASSKEY_HOST = 'bb-manager.vercel.app';
export const PASSKEY_MIGRATION_NOTICE_KEY = 'bb-passkey-migration-notice';

type RememberedPassword = {
  email: string;
  password: string;
};

let rememberedPassword: RememberedPassword | null = null;

export type PasskeyGateDecision =
  | { action: 'skip' }
  | { action: 'sign-out-for-password-login' }
  | { action: 'require-enrollment' }
  | { action: 'retire-then-continue' };

export function isPasskeyEnrollmentRequiredForHost(hostname: string): boolean {
  return hostname === PRODUCTION_PASSKEY_HOST;
}

export function isPasskeyEnrollmentRequired(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return isPasskeyEnrollmentRequiredForHost(window.location.hostname);
}

export function resolvePasskeyGateDecision(options: {
  enrollmentRequired: boolean;
  passkeyCount: number;
  hasRememberedPassword: boolean;
}): PasskeyGateDecision {
  if (!options.enrollmentRequired) {
    return { action: 'skip' };
  }
  if (options.passkeyCount === 0) {
    return options.hasRememberedPassword
      ? { action: 'require-enrollment' }
      : { action: 'sign-out-for-password-login' };
  }
  return { action: 'retire-then-continue' };
}

export function canRemovePasskey(passkeyCount: number, enrollmentRequired = isPasskeyEnrollmentRequired()): boolean {
  if (!enrollmentRequired) {
    return true;
  }
  return passkeyCount > 1;
}

export function rememberPasswordForPasskeyMigration(email: string, password: string) {
  rememberedPassword = { email, password };
}

export function hasRememberedPassword(): boolean {
  return Boolean(rememberedPassword?.email && rememberedPassword.password);
}

export function clearRememberedPassword() {
  rememberedPassword = null;
}

export function generateUnusablePassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `Pk.${encoded}`;
}

function sessionStore(): Storage | null {
  try {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage;
  } catch {
    return null;
  }
}

export function setPasskeyMigrationNotice() {
  sessionStore()?.setItem(PASSKEY_MIGRATION_NOTICE_KEY, '1');
}

export function takePasskeyMigrationNotice(): boolean {
  const store = sessionStore();
  if (!store) {
    return false;
  }
  const present = store.getItem(PASSKEY_MIGRATION_NOTICE_KEY) === '1';
  if (present) {
    store.removeItem(PASSKEY_MIGRATION_NOTICE_KEY);
  }
  return present;
}

export async function retirePasswordAfterPasskeyIfPossible(
  updatePassword: (nextPassword: string, currentPassword: string) => Promise<{ error: { message: string } | null }>,
  signInWithPassword: (email: string, password: string) => Promise<{ error: { message: string } | null }>,
  currentEmail?: string | null,
): Promise<{ retired: boolean; error?: string }> {
  if (!rememberedPassword) {
    return { retired: false };
  }
  if (currentEmail && rememberedPassword.email.trim().toLowerCase() !== currentEmail.trim().toLowerCase()) {
    rememberedPassword = null;
    return { retired: false };
  }

  const { email, password } = rememberedPassword;
  const { error: reauthError } = await signInWithPassword(email, password);
  if (reauthError) {
    return { retired: false, error: reauthError.message };
  }

  const { error } = await updatePassword(generateUnusablePassword(), password);
  if (error) {
    return { retired: false, error: error.message };
  }

  rememberedPassword = null;
  return { retired: true };
}
