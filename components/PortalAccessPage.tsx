import { NativeButton, NativeInput, InlineNotice } from "./ui";
import "./portal/portal.css";
import { NameWithRank } from "./RankBadge";
import React, { useEffect, useState } from "react";
import type { Boy, ToastType } from "../types";
import type { PortalAccount, SetupLink } from "../types/portal";
import { listPortalAccounts, provisionPortalAccount } from "../services/portal";
import Modal from "./Modal";
import { KeyIcon, UserCircleIcon } from "./Icons";

export default function PortalAccessPage({
  boys,
  showToast,
}: {
  boys: Boy[];
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [links, setLinks] = useState<Record<string, SetupLink>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState<Boy | null>(null);
  const refresh = async () => {
    setLoaded(false);
    const a = await listPortalAccounts();
    setAccounts(a);
    setLoaded(true);
  };
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, []);
  const generate = async (targets: Boy[]) => {
    setBusy(true);
    setError("");
    let count = 0;
    try {
      for (const boy of targets) {
        if (!boy.id) continue;
        const link = await provisionPortalAccount(boy.id);
        setLinks((prev) => ({ ...prev, [boy.id!]: link }));
        count++;
      }
      showToast(`${count} setup ${count === 1 ? "link" : "links"} generated.`);
    } catch (e) {
      setError(
        `Generated ${count} links. ${e instanceof Error ? e.message : "Could not finish."}`,
      );
    } finally {
      try {
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not refresh.");
      }
      setBusy(false);
      setReset(null);
    }
  };
  const missing = boys.filter(
    (b) => b.id && !accounts.some((a) => a.member_id === b.id),
  );
  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Setup link copied.");
    } catch {
      showToast(
        "Could not copy. Select the link and copy it manually.",
        "error",
      );
    }
  };
  return (
    <div className="bb-portal-content">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="p-3 bg-blue-50 text-company-blue rounded-xl"
            >
              <KeyIcon className="w-6 h-6" />
            </span>
            <h2>Portal accounts</h2>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Give each Company boy his personal link. He creates a passkey and
            signs in from the normal login page.
          </p>
        </div>
        <NativeButton
          disabled={busy || !loaded || !missing.length}
          onClick={() => void generate(missing)}
        >
          {!loaded
            ? "Loading access…"
            : busy
              ? "Generating…"
              : `Generate for ${missing.length} boys without access`}
        </NativeButton>
      </div>
      <p className="bb-portal-note">
        Copy new links before leaving this page. If a link is lost, generate a
        replacement. Resetting access removes existing passkeys and calendar
        subscriptions.
      </p>
      {error && (
        <InlineNotice kind="error">
          {error}
          {!loaded && (
            <NativeButton
              disabled={busy}
              onClick={() =>
                void refresh()
                  .then(() => setError(""))
                  .catch((e) => setError(e.message))
              }
            >
              Try again
            </NativeButton>
          )}
        </InlineNotice>
      )}
      <ul className="bb-portal-access-list">
        {boys.map((boy) => {
          const a = accounts.find((a) => a.member_id === boy.id);
          const link = links[boy.id!];
          return (
            <li key={boy.id} className="bb-portal-account-row">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <span aria-hidden="true">
                      <UserCircleIcon className="w-5 h-5 text-slate-400" />
                    </span>
                    <NameWithRank name={boy.name} memberRank={boy.memberRank} />
                  </h2>
                  <p className="bb-portal-note">
                    {!loaded
                      ? "Loading…"
                      : a
                        ? `${a.username} · ${a.activated_at ? "Active" : "Awaiting passkey setup"}`
                        : "Not generated"}
                  </p>
                </div>
                <div className="bb-portal-actions">
                  {link && (
                    <NativeButton
                      variant="plain"
                      disabled={busy}
                      onClick={() => void copy(link.link)}
                    >
                      Copy setup link
                    </NativeButton>
                  )}
                  <NativeButton
                    variant="secondary"
                    disabled={busy || !loaded}
                    onClick={() => (a ? setReset(boy) : void generate([boy]))}
                  >
                    {a ? "Reset access" : "Generate link"}
                  </NativeButton>
                </div>
              </div>
              {link && (
                <NativeInput
                  label={`Setup link for ${boy.name}`}
                  readOnly
                  value={link.link}
                  className="bb-input bb-portal-secret"
                />
              )}
            </li>
          );
        })}
      </ul>
      {!boys.length && (
        <p className="bb-portal-note">Add Company boys to the roster first.</p>
      )}
      <Modal
        isOpen={!!reset}
        dismissible={!busy}
        onClose={() => {
          if (!busy) setReset(null);
        }}
        title="Reset portal access"
      >
        <div className="space-y-4">
          <p>
            Generate a fresh setup link for{" "}
            {reset && (
              <NameWithRank name={reset.name} memberRank={reset.memberRank} />
            )}
            ? His existing passkeys and calendar subscription will stop working.
          </p>
          <div className="flex justify-end gap-3">
            <NativeButton
              variant="plain"
              disabled={busy}
              onClick={() => setReset(null)}
            >
              Cancel
            </NativeButton>
            <NativeButton
              danger
              disabled={busy}
              onClick={() => reset && void generate([reset])}
            >
              {busy ? "Resetting…" : "Reset and generate link"}
            </NativeButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
