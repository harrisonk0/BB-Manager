import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canRemovePasskey,
  clearRememberedPassword,
  generateUnusablePassword,
  hasRememberedPassword,
  isPasskeyEnrollmentRequiredForHost,
  rememberPasswordForPasskeyMigration,
  resolvePasskeyGateDecision,
  retirePasswordAfterPasskeyIfPossible,
} from './passkeyMigration';

describe('passkeyMigration', () => {
  afterEach(() => {
    clearRememberedPassword();
  });

  it('requires enrollment only on the live Vercel host', () => {
    expect(isPasskeyEnrollmentRequiredForHost('bb-manager.vercel.app')).toBe(true);
    expect(isPasskeyEnrollmentRequiredForHost('127.0.0.1')).toBe(false);
    expect(isPasskeyEnrollmentRequiredForHost('localhost')).toBe(false);
    expect(isPasskeyEnrollmentRequiredForHost('bb-manager-git-main.vercel.app')).toBe(false);
  });

  it('skips the gate off the live origin so local and CI password login keep working', () => {
    expect(resolvePasskeyGateDecision({
      enrollmentRequired: false,
      passkeyCount: 0,
      hasRememberedPassword: false,
    })).toEqual({ action: 'skip' });
  });

  it('forces a password sign-in when an existing live session has no passkey yet', () => {
    expect(resolvePasskeyGateDecision({
      enrollmentRequired: true,
      passkeyCount: 0,
      hasRememberedPassword: false,
    })).toEqual({ action: 'sign-out-for-password-login' });
  });

  it('blocks the app until a passkey is created after a live password sign-in', () => {
    expect(resolvePasskeyGateDecision({
      enrollmentRequired: true,
      passkeyCount: 0,
      hasRememberedPassword: true,
    })).toEqual({ action: 'require-enrollment' });
  });

  it('retires the password when the live account already has a passkey', () => {
    expect(resolvePasskeyGateDecision({
      enrollmentRequired: true,
      passkeyCount: 1,
      hasRememberedPassword: true,
    })).toEqual({ action: 'retire-then-continue' });
  });

  it('keeps the last live passkey', () => {
    expect(canRemovePasskey(1, true)).toBe(false);
    expect(canRemovePasskey(2, true)).toBe(true);
    expect(canRemovePasskey(1, false)).toBe(true);
  });

  it('generates a high-entropy password that cannot be guessed from a previous value', () => {
    const first = generateUnusablePassword();
    const second = generateUnusablePassword();
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(second).not.toBe(first);
  });

  it('reauthenticates with the remembered password then replaces it', async () => {
    rememberPasswordForPasskeyMigration('officer@example.com', 'once-only');
    expect(hasRememberedPassword()).toBe(true);

    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    const updatePassword = vi.fn().mockResolvedValue({ error: null });

    const result = await retirePasswordAfterPasskeyIfPossible(updatePassword, signInWithPassword);

    expect(result).toEqual({ retired: true });
    expect(signInWithPassword).toHaveBeenCalledWith('officer@example.com', 'once-only');
    expect(updatePassword).toHaveBeenCalledTimes(1);
    expect(String(updatePassword.mock.calls[0][0])).not.toBe('once-only');
    expect(updatePassword.mock.calls[0][1]).toBe('once-only');
    expect(hasRememberedPassword()).toBe(false);
  });

  it('does not retire a password remembered for a different account', async () => {
    rememberPasswordForPasskeyMigration('officer@example.com', 'once-only');
    const signInWithPassword = vi.fn();
    const updatePassword = vi.fn();

    const result = await retirePasswordAfterPasskeyIfPossible(
      updatePassword,
      signInWithPassword,
      'someone-else@example.com',
    );

    expect(result).toEqual({ retired: false });
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
    expect(hasRememberedPassword()).toBe(false);
  });

  it('keeps the remembered password when retirement fails', async () => {
    rememberPasswordForPasskeyMigration('officer@example.com', 'once-only');
    const result = await retirePasswordAfterPasskeyIfPossible(
      async () => ({ error: { message: 'Could not update password' } }),
      async () => ({ error: null }),
    );

    expect(result).toEqual({ retired: false, error: 'Could not update password' });
    expect(hasRememberedPassword()).toBe(true);
  });
});
