import React, { useEffect, useState } from "react";
import { NativeButton, InlineNotice } from "./ui";
import "./shell/staff-shell.css";
import { branding } from "./branding";
import { KeyIcon } from "./Icons";
import { browserSupportsPasskeys } from "../services/passkeyErrors";
import {
  listPasskeys,
  registerPasskey,
  retireRememberedPasswordAfterPasskey,
} from "../services/supabaseAuth";

interface PasskeyEnrollmentGateProps {
  onComplete: () => void;
  onSignOut: () => void;
}

const PasskeyEnrollmentGate: React.FC<PasskeyEnrollmentGateProps> = ({
  onComplete,
  onSignOut,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRetiring, setIsRetiring] = useState(false);
  const [passkeySaved, setPasskeySaved] = useState(false);
  const supported = browserSupportsPasskeys();

  useEffect(() => {
    let cancelled = false;
    void listPasskeys()
      .then((passkeys) => {
        if (!cancelled && passkeys.length > 0) {
          setPasskeySaved(true);
        }
      })
      .catch(() => {
        // Leave the create-passkey action available if listing fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const retirePassword = async (): Promise<boolean> => {
    setIsRetiring(true);
    try {
      const result = await retireRememberedPasswordAfterPasskey();
      if (!result.retired) {
        setError(
          result.error
            ? `Your passkey was saved, but the old password could not be turned off: ${result.error}`
            : "Your passkey was saved, but the old password could not be turned off. Try again.",
        );
        return false;
      }
      return true;
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not turn off password sign-in. Try again.",
      );
      return false;
    } finally {
      setIsRetiring(false);
    }
  };

  const handleCreatePasskey = async () => {
    setError(null);
    setIsRegistering(true);
    try {
      const { error: registerError } = await registerPasskey();
      if (registerError) {
        setError(registerError.message);
        return;
      }
      setPasskeySaved(true);
      if (await retirePassword()) {
        onComplete();
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not create your passkey. Try again.",
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRetryPasswordOff = async () => {
    setError(null);
    if (await retirePassword()) {
      onComplete();
    }
  };

  return (
    <main className="bb-auth-page">
      <div className="bb-auth-content">
        <img
          src={branding.bbLogo}
          alt="The Boys’ Brigade"
          className="bb-auth-brand"
        />
        <h1 className="bb-auth-heading">Create your passkey</h1>
        <p className="bb-auth-caption">
          Use this device’s fingerprint, face, PIN or password manager.
        </p>
        <p className="bb-secondary">
          This is a one-time step. After you create a passkey, this account can
          no longer sign in with the old password.
        </p>
        {!supported && (
          <InlineNotice>
            This browser cannot create passkeys. Open BB Manager in current
            Chrome, Safari or Edge on bb-manager.vercel.app, then sign in with
            your password once.
          </InlineNotice>
        )}
        {error && <InlineNotice kind="error">{error}</InlineNotice>}
        <div className="bb-auth-actions">
          {passkeySaved ? (
            <NativeButton
              onClick={() => void handleRetryPasswordOff()}
              busy={isRetiring}
            >
              {isRetiring
                ? "Turning off password sign-in…"
                : "Turn off password sign-in"}
            </NativeButton>
          ) : (
            <NativeButton
              onClick={() => void handleCreatePasskey()}
              disabled={!supported || isRetiring}
              busy={isRegistering}
            >
              <KeyIcon className="h-5 w-5" />
              {isRegistering
                ? "Waiting for passkey…"
                : isRetiring
                  ? "Turning off password sign-in…"
                  : "Create passkey"}
            </NativeButton>
          )}
          <NativeButton
            variant="plain"
            onClick={onSignOut}
            disabled={isRegistering || isRetiring}
          >
            Sign out
          </NativeButton>
        </div>
      </div>
    </main>
  );
};
export default PasskeyEnrollmentGate;
