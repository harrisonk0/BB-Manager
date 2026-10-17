import React, { useState } from "react";
import { Section, ToastType } from "../types";
import * as supabaseAuth from "../services/supabaseAuth";
import {
  isPasskeyEnrollmentRequired,
  rememberPasswordForPasskeyMigration,
} from "../services/passkeyMigration";
import { NativeInput, NativeButton, InlineNotice } from "./ui";
import PasskeysCard from "./PasskeysCard";

const MIN_PASSWORD_LENGTH = 8;

interface AccountSettingsPageProps {
  showToast: (message: string, type?: ToastType) => void;
  activeSection: Section;
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({
  showToast,
  activeSection,
  recoveryMode = false,
  onRecoveryComplete,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | null
  >(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [newPasswordConfirmError, setNewPasswordConfirmError] = useState<
    string | null
  >(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setNewPasswordConfirmError(null);
    setGeneralError(null);

    let isValid = true;

    if (!recoveryMode && !currentPassword) {
      setCurrentPasswordError("Current password is required.");
      isValid = false;
    }
    if (!newPassword) {
      setNewPasswordError("New password is required.");
      isValid = false;
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setNewPasswordError(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
      isValid = false;
    }
    if (!newPasswordConfirm) {
      setNewPasswordConfirmError("Confirm new password is required.");
      isValid = false;
    } else if (newPassword !== newPasswordConfirm) {
      setNewPasswordConfirmError("New password and confirmation do not match.");
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsChangingPassword(true);
    try {
      if (!recoveryMode) {
        const user = await supabaseAuth.getCurrentUser();
        const email = user?.email;
        if (!email) {
          throw new Error(
            "Could not confirm the signed-in account. Sign in again and retry.",
          );
        }
        const { error: reauthError } = await supabaseAuth.signIn(
          email,
          currentPassword,
        );
        if (reauthError) {
          setCurrentPasswordError("Current password is incorrect.");
          showToast("Current password is incorrect.", "error");
          return;
        }
      }

      const { error } = await supabaseAuth.updatePassword(
        newPassword,
        recoveryMode ? undefined : currentPassword,
      );

      if (error) {
        throw error;
      }

      if (recoveryMode && isPasskeyEnrollmentRequired()) {
        const user = await supabaseAuth.getCurrentUser();
        if (user?.email) {
          rememberPasswordForPasskeyMigration(user.email, newPassword);
        }
      }

      showToast("Password changed successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      onRecoveryComplete?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to change password. Please try again.";
      console.error("Failed to change password:", err);
      setGeneralError(message);
      showToast("Failed to change password.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formCard = (
    <section className="bb-surface">
      <h2 className="bb-section-title">
        {recoveryMode ? "Set a new password" : "Change password"}
      </h2>
      {recoveryMode && (
        <p className="bb-secondary">
          {isPasskeyEnrollmentRequired()
            ? "This password is temporary. After you save it, you must create a passkey. The password then stops working."
            : "Choose a new password for this account. You will continue into the app afterwards."}
        </p>
      )}
      {generalError && <InlineNotice kind="error">{generalError}</InlineNotice>}
      <form onSubmit={handleChangePassword} className="bb-account-form">
        {!recoveryMode && (
          <NativeInput
            label="Current password"
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
            error={currentPasswordError || undefined}
          />
        )}
        <NativeInput
          label="New password"
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          error={newPasswordError || undefined}
        />
        <NativeInput
          label="Confirm new password"
          id="confirm-new-password"
          type="password"
          value={newPasswordConfirm}
          onChange={(event) => setNewPasswordConfirm(event.target.value)}
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          error={newPasswordConfirmError || undefined}
        />
        <NativeButton type="submit" busy={isChangingPassword}>
          {isChangingPassword
            ? "Saving…"
            : recoveryMode
              ? "Save Password"
              : "Change Password"}
        </NativeButton>
      </form>
    </section>
  );
  if (recoveryMode)
    return (
      <main className="bb-auth-page">
        <div className="bb-auth-content">
          <h1 className="bb-auth-heading">Reset password</h1>
          {formCard}
        </div>
      </main>
    );
  return (
    <div className="bb-account-settings bb-form-container">
      <PasskeysCard activeSection={activeSection} showToast={showToast} />
      {isPasskeyEnrollmentRequired() ? (
        <section className="bb-surface">
          <h2 className="bb-section-title">Password</h2>
          <p className="bb-secondary">
            On the live site, password sign-in is turned off after you create a
            passkey. If you lose every passkey, use Forgot password on the
            sign-in screen, then add a new passkey before you sign out.
          </p>
        </section>
      ) : (
        formCard
      )}
    </div>
  );
};
export default AccountSettingsPage;
