import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { getAppUrl } from './appUrl';
import { describePasskeyError } from './passkeyErrors';

export type AppPasskey = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signInWithPasskey() {
  const { data, error } = await supabase.auth.signInWithPasskey();
  if (error) {
    return { data: null, error: new Error(describePasskeyError(error, 'sign-in')) };
  }
  return { data, error: null };
}

export async function registerPasskey() {
  const { data, error } = await supabase.auth.registerPasskey();
  if (error) {
    return { data: null, error: new Error(describePasskeyError(error, 'register')) };
  }
  return { data, error: null };
}

export async function listPasskeys(): Promise<AppPasskey[]> {
  const { data, error } = await supabase.auth.passkey.list();
  if (error) {
    throw new Error(describePasskeyError(error, 'manage'));
  }
  return data ?? [];
}

export async function renamePasskey(passkeyId: string, friendlyName: string) {
  const { data, error } = await supabase.auth.passkey.update({
    passkeyId,
    friendlyName,
  });
  if (error) {
    throw new Error(describePasskeyError(error, 'manage'));
  }
  return data;
}

export async function deletePasskey(passkeyId: string) {
  const { error } = await supabase.auth.passkey.delete({ passkeyId });
  if (error) {
    throw new Error(describePasskeyError(error, 'manage'));
  }
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function requestPasswordReset(email: string) {
  const redirectTo = getAppUrl();
  return supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export function subscribeToAuth(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data.subscription;
}
