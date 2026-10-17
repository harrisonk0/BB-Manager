import PortalShell, { type PortalDestination } from "./shell/PortalShell";
import {
  NativeButton,
  NativeSwitch,
  NativeInput,
  GroupedList,
  SettingsRow,
  InlineNotice,
  LoadingState,
} from "./ui";
import "./portal/portal.css";
import { NameWithRank } from "./RankBadge";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  CompanyEvent,
  PortalAccount,
  PortalSummary,
} from "../types/portal";
import {
  getPortalAccount,
  getPortalSummary,
  listCompanyEvents,
  portalRequest,
  notificationSupport,
  enablePortalNotifications,
  disablePortalNotifications,
  portalNotificationsEnabled,
} from "../services/portal";
import { registerPasskey, listPasskeys } from "../services/supabaseAuth";
import { branding } from "./branding";
import CompanyCalendar, { EventCard } from "./CompanyCalendar";
import PasskeysCard from "./PasskeysCard";
import SquadLeaderDashboard from "./SquadLeaderDashboard";
import type { ToastType } from "../types";
import {
  CalendarIcon,
  StarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  UserCircleIcon,
  TrophyIcon,
} from "./Icons";

export default function PortalHomePage({
  onSignOut,
  showToast,
}: {
  onSignOut: () => void;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState("");
  const [notified, setNotified] = useState(false);
  const refreshGeneration = useRef(0);
  const accountIdentity = useRef("");
  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    const current = () => generation === refreshGeneration.current;
    try {
      const a = await getPortalAccount();
      if (!current()) return;
      const identity = a ? `${a.user_id}:${a.member_id}:${a.activated_at}` : "";
      if (identity !== accountIdentity.current) {
        accountIdentity.current = identity;
        setFeed("");
        setNotified(false);
        setSummary(null);
        setEvents([]);
      }
      setAccount(a);
      if (!a)
        throw new Error(
          "Portal access is no longer available. Please speak to a staff member.",
        );
      if (a.activated_at) {
        const [s, e] = await Promise.all([
          getPortalSummary(),
          listCompanyEvents(),
        ]);
        if (!current()) return;
        setSummary(s);
        setEvents(e);
      } else {
        setSummary(null);
        setEvents([]);
        setFeed("");
      }
      setError("");
    } catch (e) {
      if (!current()) return;
      setAccount(null);
      setSummary(null);
      setEvents([]);
      setFeed("");
      setNotified(false);
      accountIdentity.current = "";
      setError(e instanceof Error ? e.message : "Could not load your portal.");
    } finally {
      if (current()) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    window.addEventListener("focus", refresh);
    const id = window.setInterval(() => void refresh(), 60000);
    return () => {
      ++refreshGeneration.current;
      accountIdentity.current = "";
      window.removeEventListener("focus", refresh);
      window.clearInterval(id);
    };
  }, [refresh]);
  useEffect(() => {
    if (!notificationSupport() || !account?.activated_at) return;
    portalNotificationsEnabled()
      .then(setNotified)
      .catch(() => {});
  }, [account?.user_id, account?.activated_at]);
  const task = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not complete this action.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const setup = () =>
    task(async () => {
      if (!(await listPasskeys()).length) {
        const r = await registerPasskey();
        if (r.error) throw r.error;
      }
      await portalRequest("complete");
      await refresh();
    });
  const next = events.find((e) => new Date(e.ends_at).getTime() >= Date.now());
  const maxSquadTotal = Math.max(
    ...(summary?.squads ?? []).map((squad) => squad.total),
    0,
  );
  const metric = (
    label: string,
    value: string | number,
    Icon: React.FC<{ className?: string }>,
    progress?: number,
  ) => (
    <div className="bb-portal-metric">
      <span aria-hidden="true">
        <Icon className="w-5 h-5" />
      </span>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {progress !== undefined && (
        <div aria-hidden="true" className="bb-portal-progress">
          <div style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
  const renderPage = (
    page: PortalDestination,
    setPage: (page: PortalDestination) => void,
  ) => {
    if (loading) return <LoadingState label="Loading your portal…" />;
    if (error)
      return (
        <InlineNotice kind="error">
          <p>{error}</p>
          <div className="bb-portal-actions">
            <NativeButton onClick={() => void refresh()}>
              Try again
            </NativeButton>
            <NativeButton variant="plain" onClick={onSignOut}>
              Sign out
            </NativeButton>
          </div>
        </InlineNotice>
      );
    if (!account?.activated_at)
      return (
        <section className="bb-portal-panel">
          <h2>Finish setting up</h2>
          <p>Create a passkey to open your calendar and stats.</p>
          <div className="bb-portal-actions">
            <NativeButton busy={busy} onClick={() => void setup()}>
              Create my passkey
            </NativeButton>
            <NativeButton variant="plain" onClick={onSignOut}>
              Sign out
            </NativeButton>
          </div>
        </section>
      );
    if (!summary) return <LoadingState label="Loading your summary…" />;
    if (page === "squad")
      return summary.isSquadLeader && summary.squadMembers ? (
        <SquadLeaderDashboard
          key={summary.squad}
          squad={summary.squad}
          squads={summary.squads}
          members={summary.squadMembers}
        />
      ) : (
        <InlineNotice>
          The squad dashboard is available to current squad leaders only.
        </InlineNotice>
      );
    if (page === "calendar")
      return (
        <>
          <CompanyCalendar events={events} />
          <GroupedList
            title="Your calendar"
            footer="Your calendar app controls how quickly changes appear. In Google Calendar, use ‘From URL’."
          >
            <SettingsRow
              title="Calendar subscription"
              detail="Create a private link for your calendar app"
              onClick={() => {
                if (!busy)
                  void task(async () => {
                    const generation = refreshGeneration.current;
                    const identity = accountIdentity.current;
                    const r = await portalRequest<{ url: string }>("feed");
                    if (
                      generation === refreshGeneration.current &&
                      identity &&
                      identity === accountIdentity.current
                    )
                      setFeed(r.url);
                  });
              }}
              icon={<CalendarIcon className="w-6 h-6" />}
              trailing={busy ? "Creating…" : undefined}
            />
          </GroupedList>
          {feed && (
            <section className="bb-portal-panel">
              <NativeInput
                label="Calendar subscription URL"
                readOnly
                value={feed}
                hint="Keep this link private. Creating another replaces the previous link."
              />
              <div className="bb-portal-actions">
                <a
                  className="bb-portal-link external"
                  href={feed.replace(/^https:/, "webcal:")}
                >
                  Open calendar app
                </a>
                <NativeButton
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void task(async () => {
                      await navigator.clipboard.writeText(feed);
                      showToast("Calendar link copied.");
                    })
                  }
                >
                  Copy link
                </NativeButton>
              </div>
            </section>
          )}
        </>
      );
    if (page === "account")
      return (
        <>
          <GroupedList title="Company account">
            <SettingsRow
              title={summary.name}
              detail={`Username: ${account.username}`}
              icon={<UserCircleIcon className="w-6 h-6" />}
            />
          </GroupedList>
          <PasskeysCard activeSection="company" showToast={showToast} />
          <GroupedList
            title="Notifications"
            footer={
              notificationSupport()
                ? "Get updates when nights are added, cancelled, moved or change time."
                : "On iPhone, add BB Manager to your Home Screen and open it there to enable notifications."
            }
          >
            <SettingsRow
              title="Event updates"
              detail={
                busy
                  ? "Updating…"
                  : notified
                    ? "Enabled on this device"
                    : "Disabled on this device"
              }
              trailing={
                <NativeSwitch
                  label="Event updates"
                  checked={notified}
                  disabled={busy}
                  onChange={() =>
                    void task(async () => {
                      if (notified) {
                        await disablePortalNotifications();
                        setNotified(false);
                      } else {
                        await enablePortalNotifications();
                        setNotified(true);
                      }
                      showToast(
                        notified
                          ? "Notifications disabled on this device."
                          : "Notifications enabled on this device.",
                      );
                    })
                  }
                />
              }
            />
          </GroupedList>
          <GroupedList title="Session">
            <SettingsRow title="Sign out" destructive onClick={onSignOut} />
          </GroupedList>
        </>
      );
    return (
      <>
        <div className="bb-portal-identity">
          <img src={branding.bbLogo} alt="The Boys’ Brigade" />
          <div>
            <p className="bb-portal-note">Company Section</p>
            <h2>
              Hi,{" "}
              <NameWithRank
                name={summary.name.split(" ")[0]}
                memberRank={summary.memberRank}
              />
            </h2>
          </div>
        </div>
        {summary.isSquadLeader && summary.squadMembers && (
          <GroupedList title="Leadership">
            <SettingsRow
              title="Squad dashboard"
              detail="Weekly marks, attendance and progress"
              onClick={() => setPage("squad")}
              icon={<ChartBarIcon className="w-6 h-6" />}
            />
          </GroupedList>
        )}
        <section className="space-y-3">
          <h2>Next night</h2>
          {next ? (
            <EventCard event={next} />
          ) : (
            <p className="bb-portal-note">No upcoming nights yet.</p>
          )}
        </section>
        <section className="space-y-3">
          <h2>
            My stats <span className="bb-portal-note">This BB year</span>
          </h2>
          <div className="bb-portal-metrics">
            {metric("Total marks", summary.total, StarIcon)}
            {metric(
              "Attendance",
              summary.recorded
                ? `${Math.round((summary.attended / summary.recorded) * 100)}%`
                : "—",
              CheckCircleIcon,
              summary.recorded
                ? (summary.attended / summary.recorded) * 100
                : undefined,
            )}
            {metric(
              "Position in my squad",
              summary.recorded ? `#${summary.squadRank}` : "—",
              UserCircleIcon,
            )}
            {metric(
              "Position in Company",
              summary.recorded ? `#${summary.companyRank}` : "—",
              TrophyIcon,
            )}
          </div>
          <p className="bb-portal-note">
            {summary.attended} present out of {summary.recorded} recorded
            nights. Equal totals share a position.
          </p>
        </section>
        <GroupedList
          title="Squad standings"
          footer="Total marks this BB year. Equal totals share a position."
        >
          {summary.squads.map((s) => (
            <li
              key={s.number}
              className={`bb-portal-summary-row ${s.number === summary.squad ? "is-own" : ""}`}
            >
              <div className="flex justify-between gap-3">
                <span>
                  #
                  {1 +
                    summary.squads.filter((other) => other.total > s.total)
                      .length}{" "}
                  · Squad {s.number}
                  {s.label ? ` · ${s.label}` : ""}
                  {s.number === summary.squad ? " · Yours" : ""}
                </span>
                <strong className="bb-numeric">{s.total} marks</strong>
              </div>
              <div aria-hidden="true" className="bb-portal-progress">
                <div
                  style={{
                    width: `${maxSquadTotal ? (s.total / maxSquadTotal) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="bb-portal-note">
                {s.recorded
                  ? `${Math.round((s.attended / s.recorded) * 100)}%`
                  : "—"}{" "}
                attendance
              </p>
            </li>
          ))}
        </GroupedList>
        <GroupedList
          title="My squad teammates"
          footer="Squad leaders can view weekly squad stats. Other boys see names only."
        >
          {(summary.teammates ?? []).map((teammate, index) => (
            <SettingsRow
              key={index}
              title={
                <NameWithRank
                  name={teammate.name}
                  memberRank={teammate.memberRank}
                />
              }
              detail={teammate.isSquadLeader ? "Squad leader" : undefined}
            />
          ))}
          {!summary.teammates?.length && (
            <SettingsRow title="No other boys in your squad yet" />
          )}
        </GroupedList>
        <details className="bb-portal-disclosure">
          <summary>My weekly marks</summary>
          <GroupedList>
            {summary.marks.map((mark) => (
              <SettingsRow
                key={mark.date}
                title={new Date(`${mark.date}T12:00:00Z`).toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  },
                )}
                trailing={mark.score < 0 ? "Absent" : `${mark.score} marks`}
              />
            ))}
            {!summary.marks.length && (
              <SettingsRow title="No marks recorded yet" />
            )}
          </GroupedList>
        </details>
      </>
    );
  };
  return (
    <PortalShell
      squadLeader={Boolean(summary?.isSquadLeader && summary.squadMembers)}
      render={renderPage}
    />
  );
}
