export const isWebAuthnCancellation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { name?: string; code?: string; message?: string };
  const message = (candidate.message || '').toLowerCase();
  return (
    candidate.name === 'NotAllowedError' ||
    candidate.name === 'AbortError' ||
    candidate.code === 'ERROR_CEREMONY_ABORTED' ||
    message.includes('notallowederror') ||
    message.includes('the operation either timed out or was not allowed') ||
    message.includes('timed out or was not allowed')
  );
};

export const describePasskeyError = (error: unknown, action: 'sign-in' | 'register' | 'manage'): string => {
  if (isWebAuthnCancellation(error)) {
    return action === 'sign-in'
      ? 'Passkey sign-in was cancelled.'
      : action === 'register'
        ? 'Passkey registration was cancelled.'
        : 'Passkey update was cancelled.';
  }

  if (error && typeof error === 'object') {
    const candidate = error as { code?: string; message?: string };
    if (candidate.code === 'passkey_disabled') {
      return 'Passkey sign-in is not enabled for this project yet.';
    }
    if (candidate.code === 'webauthn_credential_not_found') {
      return 'That passkey is not registered on this BB Manager account.';
    }
    if (candidate.code === 'webauthn_credential_exists') {
      return 'This device already has a passkey on this account.';
    }
    if (candidate.code === 'too_many_passkeys') {
      return 'This account already has the maximum number of passkeys.';
    }
    if (candidate.message === 'Browser does not support WebAuthn') {
      return 'This browser does not support passkeys.';
    }
    if (candidate.message) {
      return candidate.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return action === 'sign-in'
    ? 'Could not sign in with a passkey.'
    : action === 'register'
      ? 'Could not add a passkey.'
      : 'Could not update passkeys.';
};

export const browserSupportsPasskeys = (webAuthn: unknown = globalThis.PublicKeyCredential): boolean =>
  typeof webAuthn !== 'undefined' && webAuthn !== null;
