import React, { useEffect, useState } from "react";
import * as supabaseAuth from "../services/supabaseAuth";
import { branding } from "./branding";
import { browserSupportsPasskeys } from "../services/passkeyErrors";
import {
  clearRememberedPassword,
  isPasskeyEnrollmentRequired,
  rememberPasswordForPasskeyMigration,
  takePasskeyMigrationNotice,
} from "../services/passkeyMigration";
import { NativeButton, NativeInput, InlineNotice } from "./ui";
import "./shell/staff-shell.css";
import { KeyIcon } from "./Icons";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const passkeysSupported = browserSupportsPasskeys();
  const enrollmentRequired = isPasskeyEnrollmentRequired();
  const [showPassword, setShowPassword] = useState(
    !passkeysSupported || !enrollmentRequired,
  );

  useEffect(() => {
    if (takePasskeyMigrationNotice()) {
      setShowPassword(true);
      setInfo("Sign in once to set up your passkey.");
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfo(null);
    if (enrollmentRequired) {
      rememberPasswordForPasskeyMigration(email.trim(), password);
    }
    try {
      const { error: signInError } = await supabaseAuth.signIn(email, password);
      if (signInError) {
        clearRememberedPassword();
        setError(signInError.message || "Invalid email or password.");
      }
    } catch (err: unknown) {
      clearRememberedPassword();
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setIsPasskeyLoading(true);
    setError(null);
    setInfo(null);
    clearRememberedPassword();
    try {
      const { error: passkeyError } = await supabaseAuth.signInWithPasskey();
      if (passkeyError) {
        setError(passkeyError.message);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in with a passkey.",
      );
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your email address first, then request a reset link.");
      return;
    }
    setIsResetting(true);
    try {
      const { error: resetError } = await supabaseAuth.requestPasswordReset(
        email.trim(),
      );
      if (resetError) {
        setError(resetError.message || "Could not send a reset email.");
        return;
      }
      setInfo("If that email is registered, a reset link is on its way.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not send a reset email.",
      );
    } finally {
      setIsResetting(false);
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
        <h1 className="bb-auth-heading">Welcome back</h1>
        <p className="bb-auth-caption">Sign in to BB Manager</p>
        {error && (
          <InlineNotice kind="error" title="Sign-in unsuccessful">
            {error}
          </InlineNotice>
        )}
        {info && <InlineNotice>{info}</InlineNotice>}
        <div className="bb-auth-actions">
          {passkeysSupported && (
            <NativeButton
              onClick={() => void handlePasskeySignIn()}
              busy={isPasskeyLoading}
              disabled={isLoading}
            >
              <KeyIcon className="h-5 w-5" />
              {isPasskeyLoading
                ? "Waiting for passkey…"
                : "Sign in with passkey"}
            </NativeButton>
          )}
          {passkeysSupported && (
            <NativeButton
              variant="plain"
              onClick={() => setShowPassword((v) => !v)}
              aria-expanded={showPassword}
            >
              {showPassword
                ? "Back to passkey sign-in"
                : "I don’t have a passkey"}
            </NativeButton>
          )}
        </div>
        {showPassword && (
          <>
            <p className="bb-secondary">
              Staff can sign in below. Boys should ask a staff member for a
              setup link.
            </p>
            <form onSubmit={handleSignIn}>
              <NativeInput
                label="Email address"
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <NativeInput
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <NativeButton
                variant="plain"
                onClick={() => void handleForgotPassword()}
                busy={isResetting}
              >
                {isResetting ? "Sending reset link…" : "Forgot password?"}
              </NativeButton>
              <NativeButton
                type="submit"
                busy={isLoading}
                disabled={isPasskeyLoading}
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </NativeButton>
            </form>
          </>
        )}
      </div>
    </main>
  );
};
export default LoginPage;
