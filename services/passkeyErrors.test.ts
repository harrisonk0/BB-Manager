import { describe, expect, it } from 'vitest';

import {
  browserSupportsPasskeys,
  describePasskeyError,
  isWebAuthnCancellation,
} from './passkeyErrors';

describe('passkeyErrors', () => {
  it('treats WebAuthn NotAllowedError as a user cancellation', () => {
    expect(isWebAuthnCancellation({ name: 'NotAllowedError' })).toBe(true);
    expect(describePasskeyError({ name: 'NotAllowedError' }, 'sign-in')).toBe(
      'Passkey sign-in was cancelled.',
    );
  });

  it('maps hosted Auth passkey error codes', () => {
    expect(describePasskeyError({ code: 'webauthn_credential_not_found' }, 'sign-in')).toBe(
      'That passkey is not registered on this BB Manager account.',
    );
    expect(describePasskeyError({ code: 'webauthn_credential_exists' }, 'register')).toBe(
      'This device already has a passkey on this account.',
    );
  });

  it('detects passkey support from PublicKeyCredential', () => {
    expect(browserSupportsPasskeys(undefined)).toBe(false);
    expect(browserSupportsPasskeys(function PublicKeyCredential() {})).toBe(true);
  });
});
