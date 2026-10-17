import React, { useCallback, useEffect, useState } from "react";
import { Section, ToastType } from "../types";
import * as supabaseAuth from "../services/supabaseAuth";
import type { AppPasskey } from "../services/supabaseAuth";
import { browserSupportsPasskeys } from "../services/passkeyErrors";
import {
  canRemovePasskey,
  isPasskeyEnrollmentRequired,
} from "../services/passkeyMigration";
import {
  NativeButton,
  NativeInput,
  InlineNotice,
  LoadingState,
  TaskSheet,
} from "./ui";

interface PasskeysCardProps {
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
}

const formatPasskeyDate = (value?: string) => {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const PasskeysCard: React.FC<PasskeysCardProps> = ({
  activeSection,
  showToast,
}) => {
  const [passkeys, setPasskeys] = useState<AppPasskey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [passkeyToDelete, setPasskeyToDelete] = useState<AppPasskey | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const supported = browserSupportsPasskeys();
  const enrollmentRequired = isPasskeyEnrollmentRequired();
  const lastPasskeyLocked = !canRemovePasskey(
    passkeys.length,
    enrollmentRequired,
  );

  const refreshPasskeys = useCallback(async () => {
    setIsLoading(true);
    try {
      setPasskeys(await supabaseAuth.listPasskeys());
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not load passkeys.";
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshPasskeys();
  }, [refreshPasskeys]);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const { error } = await supabaseAuth.registerPasskey();
      if (error) {
        showToast(error.message, "error");
        return;
      }
      showToast(
        "Passkey added. You can sign in with it on bb-manager.vercel.app.",
        "success",
      );
      await refreshPasskeys();
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Could not add a passkey. Try again.",
        "error",
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRename = async (passkey: AppPasskey) => {
    const nextName = renameValue.trim();
    if (!nextName) {
      showToast("Enter a name for this passkey.", "error");
      return;
    }
    try {
      await supabaseAuth.renamePasskey(passkey.id, nextName);
      setRenamingId(null);
      setRenameValue("");
      showToast("Passkey renamed.", "success");
      await refreshPasskeys();
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Could not rename that passkey.",
        "error",
      );
    }
  };

  const handleDelete = async () => {
    if (!passkeyToDelete) return;
    if (!canRemovePasskey(passkeys.length, enrollmentRequired)) {
      showToast("Add another passkey before removing this one.", "error");
      return;
    }
    setIsDeleting(true);
    try {
      await supabaseAuth.deletePasskey(passkeyToDelete.id);
      setPasskeyToDelete(null);
      showToast("Passkey removed.", "success");
      await refreshPasskeys();
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : "Could not remove that passkey.",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="bb-surface">
      <h2 className="bb-section-title">Passkeys</h2>
      <p className="bb-secondary">
        Passkeys sign you in with this device’s fingerprint, face, PIN or
        password manager. They are bound to bb-manager.vercel.app, so add them
        while you are on the live site.
        {enrollmentRequired &&
          " Keep at least one passkey; password sign-in is turned off after the first one is created."}
      </p>
      {!supported && (
        <InlineNotice>
          This browser cannot create passkeys. Use a current Chrome, Safari or
          Edge on the live site.
        </InlineNotice>
      )}
      {isLoading ? (
        <LoadingState label="Loading passkeys…" />
      ) : passkeys.length === 0 ? (
        <p className="bb-secondary">No passkeys on this account yet.</p>
      ) : (
        <ul className="bb-passkey-list">
          {passkeys.map((passkey) => (
            <li key={passkey.id}>
              <strong>{passkey.friendly_name || "Unnamed passkey"}</strong>
              <p className="bb-secondary">
                Added {formatPasskeyDate(passkey.created_at)} · Last used{" "}
                {formatPasskeyDate(passkey.last_used_at)}
              </p>
              {renamingId === passkey.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleRename(passkey);
                  }}
                >
                  <NativeInput
                    label="Passkey name"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    maxLength={120}
                    autoFocus
                  />
                  <div className="bb-inline-actions">
                    <NativeButton type="submit">Save name</NativeButton>
                    <NativeButton
                      variant="secondary"
                      onClick={() => {
                        setRenamingId(null);
                        setRenameValue("");
                      }}
                    >
                      Cancel
                    </NativeButton>
                  </div>
                </form>
              ) : (
                <div className="bb-inline-actions">
                  <NativeButton
                    variant="secondary"
                    onClick={() => {
                      setRenamingId(passkey.id);
                      setRenameValue(passkey.friendly_name || "");
                    }}
                  >
                    Rename
                  </NativeButton>
                  <NativeButton
                    variant="plain"
                    danger
                    onClick={() => setPasskeyToDelete(passkey)}
                    disabled={lastPasskeyLocked}
                    title={
                      lastPasskeyLocked
                        ? "Add another passkey before removing this one."
                        : undefined
                    }
                  >
                    Remove
                  </NativeButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {lastPasskeyLocked && passkeys.length > 0 && (
        <p className="bb-secondary">
          Add another passkey before removing your last one.
        </p>
      )}
      <NativeButton
        onClick={() => void handleRegister()}
        busy={isRegistering}
        disabled={!supported}
      >
        {isRegistering ? "Waiting for passkey…" : "Add a passkey"}
      </NativeButton>
      <TaskSheet
        open={Boolean(passkeyToDelete)}
        onClose={() => {
          if (!isDeleting) setPasskeyToDelete(null);
        }}
        dismissible={!isDeleting}
        title="Remove this passkey?"
        size="sm"
      >
        <p>
          {lastPasskeyLocked
            ? "This is the last passkey on the account. Add another one before removing it, or you will be locked out."
            : `You will not be able to sign in with ${passkeyToDelete?.friendly_name || "this passkey"} until you add it again.`}
        </p>
        <div className="bb-auth-actions">
          <NativeButton
            danger
            busy={isDeleting}
            disabled={lastPasskeyLocked}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? "Removing…" : "Remove passkey"}
          </NativeButton>
          <NativeButton
            variant="secondary"
            disabled={isDeleting}
            onClick={() => setPasskeyToDelete(null)}
          >
            Cancel
          </NativeButton>
        </div>
      </TaskSheet>
    </section>
  );
};
export default PasskeysCard;
