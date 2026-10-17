import React, { useState } from "react";
import { NativeButton, InlineNotice } from "./ui";
import "./shell/staff-shell.css";
import { branding } from "./branding";
import { supabase } from "../services/supabaseClient";
import { listPasskeys, registerPasskey } from "../services/supabaseAuth";
import { browserSupportsPasskeys } from "../services/passkeyErrors";
import { portalRequest } from "../services/portal";

export default function PortalSetupPage({
  setup,
  onComplete,
}: {
  setup: { username: string; code: string };
  onComplete: () => void;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const create = async () => {
    setBusy(true);
    setError("");
    try {
      if (!signedIn) {
        const signedOut = await supabase.auth.signOut();
        if (signedOut.error) throw signedOut.error;
        const { tokenHash } = await portalRequest<{ tokenHash: string }>(
          "exchange",
          setup,
        );
        const verified = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "magiclink",
        });
        if (verified.error) throw verified.error;
        setSignedIn(true);
      }
      if (!(await listPasskeys()).length) {
        const r = await registerPasskey();
        if (r.error) throw r.error;
      }
      await portalRequest("complete");
      onComplete();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not create your passkey. Try again.",
      );
    } finally {
      setBusy(false);
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
        <p className="bb-group-label">Company Section</p>
        <h1 className="bb-auth-heading">Welcome, {setup.username}</h1>
        <p className="bb-auth-caption">
          Create a passkey to open your calendar and see your progress.
        </p>
        {error && <InlineNotice kind="error">{error}</InlineNotice>}
        {!browserSupportsPasskeys() && (
          <InlineNotice>
            Open this link in a browser that supports passkeys, such as current
            Safari, Chrome or Edge.
          </InlineNotice>
        )}
        <div className="bb-auth-actions">
          <NativeButton
            disabled={!browserSupportsPasskeys()}
            busy={busy}
            onClick={() => void create()}
          >
            {busy ? "Setting up…" : "Create my passkey"}
          </NativeButton>
        </div>
        <p className="bb-secondary">
          This link stops working once your passkey is set up.
        </p>
      </div>
    </main>
  );
}
