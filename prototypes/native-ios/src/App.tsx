import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  emptyEntry,
  entryError,
  formatDate,
  initialDate,
  initialMembers,
  seedEntries,
  weeks,
  type Entry,
  type Member,
  type Page,
  type Role,
  type Section,
} from "./data";
import { Icon, type IconName } from "./icons";
import { Button, IconButton, Sheet } from "./ui";
import { Roster } from "./Roster";
import { Marks } from "./Marks";
import { Squad } from "./Squad";
import {
  Settings,
  Calendar,
  PortalHome,
  companyLogo,
  juniorLogo,
  bbLogo,
} from "./Settings";
import { MemberDetail, MemberEditor } from "./MemberSheets";
import "../src/theme.css";

type Overlay =
  | { type: "workspace" | "date" | "actions" | "clear" | "prototype" | "error" }
  | { type: "member" | "editor" | "delete"; id?: string }
  | { type: "discard"; date?: string; section?: Section };
const initialParams = new URLSearchParams(location.search);
const role: Role =
  initialParams.get("role") === "leader"
    ? "leader"
    : initialParams.get("role") === "boy"
      ? "boy"
      : "staff";
const tabs: Record<Role, { page: Page; title: string; icon: IconName }[]> = {
  staff: [
    { page: "members", title: "Members", icon: "members" },
    { page: "marks", title: "Marks", icon: "marks" },
    { page: "squad", title: "Squad", icon: "squad" },
    { page: "more", title: "More", icon: "more" },
  ],
  leader: [
    { page: "mine", title: "Home", icon: "members" },
    { page: "squad", title: "Squad", icon: "squad" },
    { page: "calendar", title: "Calendar", icon: "calendar" },
    { page: "more", title: "More", icon: "more" },
  ],
  boy: [
    { page: "mine", title: "Home", icon: "members" },
    { page: "calendar", title: "Calendar", icon: "calendar" },
    { page: "more", title: "More", icon: "more" },
  ],
};
const allowed = (
  value: string | null,
  section: Section = initialParams.get("section") === "junior" &&
  role === "staff"
    ? "junior"
    : "company",
): Page =>
  value === "calendar" && section === "junior"
    ? "members"
    : tabs[role].some((tab) => tab.page === value) || value === "calendar"
      ? (value as Page)
      : tabs[role][0].page;

export default function App() {
  const [page, setPage] = useState<Page>(() =>
    allowed(initialParams.get("page")),
  );
  const [section, setSection] = useState<Section>(
    initialParams.get("section") === "junior" && role === "staff"
      ? "junior"
      : "company",
  );
  const [members, setMembers] = useState(initialMembers);
  const [date, setDate] = useState(initialDate);
  const [savedDays, setSavedDays] = useState<
    Record<string, Record<string, Entry>>
  >({ [initialDate]: seedEntries(initialMembers) });
  const [entries, setEntries] = useState(seedEntries(initialMembers));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [saveError, setSaveError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [notice, setNotice] = useState("");
  const [offline, setOffline] = useState(
    initialParams.get("simulate") === "offline" || !navigator.onLine,
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [solidSurfaces, setSolidSurfaces] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scrollPositions = useRef<Partial<Record<Page, number>>>({});
  const firstNavigation = useRef(true);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const notify = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setNotice(""), 4500);
  }, []);
  const baseline = savedDays[date] || seedEntries(members, date);
  const dirtyCount = members.filter(
    (member) =>
      JSON.stringify(entries[member.id]) !==
      JSON.stringify(baseline[member.id] || emptyEntry()),
  ).length;
  const locked = date < initialDate && !unlocked;
  const visibleTabs = tabs[role];

  useEffect(() => {
    const pop = () => {
      scrollPositions.current[page] = window.scrollY;
      setOverlay(null);
      setPage(
        allowed(new URLSearchParams(location.search).get("page"), section),
      );
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [page, section]);
  useEffect(() => {
    if (!dirtyCount) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirtyCount]);
  useEffect(() => {
    const update = () => {
      const inset = window.visualViewport
        ? Math.max(
            0,
            window.innerHeight -
              window.visualViewport.height -
              window.visualViewport.offsetTop,
          )
        : 0;
      setKeyboardOpen(inset > 100);
      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${inset}px`,
      );
    };
    window.visualViewport?.addEventListener("resize", update);
    return () => window.visualViewport?.removeEventListener("resize", update);
  }, []);
  useEffect(() => {
    const off = () => setOffline(true);
    const on = () => setOffline(false);
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, []);
  useLayoutEffect(() => {
    document.title = `${visibleTabs.find((tab) => tab.page === page)?.title || "Calendar"} · BB Manager prototype`;
    if (firstNavigation.current) {
      firstNavigation.current = false;
      return;
    }
    window.scrollTo(0, scrollPositions.current[page] || 0);
    document
      .querySelector<HTMLElement>(".screen:not([hidden]) [data-page-title]")
      ?.focus({ preventScroll: true });
  }, [page, visibleTabs]);

  const navigate = (next: Page) => {
    if (next === "calendar" && section === "junior") return;
    if (page === next) {
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "instant" : "smooth",
      });
      return;
    }
    scrollPositions.current[page] = window.scrollY;
    const url = new URL(location.href);
    url.searchParams.set("page", next);
    history.pushState({}, "", url);
    setOverlay(null);
    setPage(next);
  };
  const setEntry = (id: string, patch: Partial<Entry>) => {
    if (saving) return;
    setEntries((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
    setSaveError("");
    setSavedAt("");
  };
  const applyDate = (next: string) => {
    setDate(next);
    setEntries(savedDays[next] || seedEntries(members, next));
    setUnlocked(false);
    setSavedAt("");
    setSaveError("");
    setOverlay(null);
  };
  const requestDate = (next: string) => {
    if (saving) return;
    if (next === date) {
      setOverlay(null);
      return;
    }
    if (dirtyCount) setOverlay({ type: "discard", date: next });
    else applyDate(next);
  };
  const shiftDate = (direction: number) => {
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + direction * 7);
    requestDate(next.toISOString().slice(0, 10));
  };
  const switchSection = (next: Section) => {
    if (next === section) {
      setOverlay(null);
      return;
    }
    if (next === "junior" && page === "calendar") navigate("members");
    setSection(next);
    setEntries(seedEntries(members));
    setSavedDays({ [initialDate]: seedEntries(members) });
    setDate(initialDate);
    setSavedAt("");
    setSaveError("");
    const url = new URL(location.href);
    url.searchParams.set("section", next);
    history.replaceState({}, "", url);
    setOverlay(null);
  };
  const save = () => {
    const invalid = members.find((member) =>
      entryError(entries[member.id], section),
    );
    if (invalid) {
      setSaveError("Check the highlighted scores.");
      document
        .querySelector<HTMLInputElement>(
          '.screen:not([hidden]) input[aria-invalid="true"]',
        )
        ?.focus();
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      if (offline) {
        setSaveError("No connection. Try again when you’re online.");
        return;
      }
      const normalized = Object.fromEntries(
        Object.entries(entries).map(([id, entry]) => [
          id,
          entry.attendance === "present"
            ? {
                ...entry,
                score: entry.score || "0",
                uniform: entry.uniform || "0",
                behaviour: entry.behaviour || "0",
              }
            : { ...entry, score: "", uniform: "", behaviour: "" },
        ]),
      );
      setEntries(normalized);
      const week = weeks.indexOf(date);
      if (week >= 0 && section === "company")
        setMembers((current) =>
          current.map((member) => {
            const entry = normalized[member.id];
            const history = member.history.map((score, index) =>
              index !== week
                ? score
                : entry.attendance === "present"
                  ? Number(entry.score)
                  : entry.attendance === "absent"
                    ? -1
                    : -2,
            );
            return {
              ...member,
              history,
              attended: history.filter((score) => score >= 0).length,
              total: history.reduce(
                (sum, score) => sum + Math.max(0, score),
                0,
              ),
            };
          }),
        );
      setSavedDays((value) => ({ ...value, [date]: normalized }));
      setSaveError("");
      setSavedAt(new Date().toISOString());
      notify("Marks saved.");
    }, 450);
  };
  const activeMember =
    overlay && "id" in overlay
      ? members.find((member) => member.id === overlay.id)
      : undefined;
  const openMember = (member: Member) =>
    setOverlay({ type: "member", id: member.id });
  const navLink = (tab: (typeof visibleTabs)[number]) => (
    <a
      href={`?page=${tab.page}${role !== "staff" ? `&role=${role}` : ""}&section=${section}`}
      key={tab.page}
      aria-current={tab.page === page ? "page" : undefined}
      onClick={(event) => {
        if (
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          event.button === 0
        ) {
          event.preventDefault();
          navigate(tab.page);
        }
      }}
    >
      <Icon name={tab.icon} size={23} />
      <span>{tab.title}</span>
    </a>
  );

  return (
    <div
      className={`prototype-app section-${section} ${reducedMotion ? "reduce-motion" : ""} ${solidSurfaces ? "solid-surfaces" : ""} ${keyboardOpen ? "keyboard-open" : ""} ${page === "marks" && (dirtyCount || savedAt || saveError) ? "has-save-accessory" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={bbLogo} alt="The Boys’ Brigade" width="164" height="66" />
          <strong>BB Manager</strong>
          <span>
            {role === "staff"
              ? "Your Company, together."
              : "Your Company portal."}
          </span>
        </div>
        <button
          className="sidebar-workspace"
          onClick={() => setOverlay({ type: "workspace" })}
        >
          <span className="workspace-symbol">
            <Icon name="members" />
          </span>
          <span>
            <strong>
              {section === "company" ? "Company Section" : "Junior Section"}
            </strong>
            <small>
              {role === "staff"
                ? "Staff workspace"
                : role === "leader"
                  ? "Squad leader"
                  : "Member"}
            </small>
          </span>
          <Icon name="down" size={15} />
        </button>
        <nav aria-label="Main navigation" className="sidebar-nav">
          {visibleTabs.map(navLink)}
          {role === "staff" && section === "company" && (
            <a
              href="?page=calendar"
              aria-current={page === "calendar" ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate("calendar");
              }}
            >
              <Icon name="calendar" />
              <span>Calendar</span>
            </a>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-meeting">
            <Icon name="calendar" />
            <div>
              <strong>Friday night</strong>
              <span>16 October · 19:00</span>
            </div>
          </div>
          <button onClick={() => setOverlay({ type: "prototype" })}>
            <Icon name="info" size={17} /> Design prototype{" "}
            <Icon name="chevron" size={15} />
          </button>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="topbar">
          <button
            className="section-picker"
            onClick={() => setOverlay({ type: "workspace" })}
            aria-label={`Switch workspace, ${section === "company" ? "Company" : "Junior"} Section`}
          >
            <span>{section === "company" ? "Company" : "Junior"}</span>
            <Icon name="down" size={13} />
          </button>
          <span className="topbar-context">
            {role === "staff"
              ? "2026 / 27"
              : role === "leader"
                ? "Squad leader"
                : "My Company"}
          </span>
          <button
            className="account-button"
            onClick={() => navigate("more")}
            aria-label={`${role === "staff" ? "EW" : "AM"}, Account and settings`}
          >
            {role === "staff" ? "EW" : "AM"}
          </button>
        </header>
        {offline && (
          <div className="connection-banner" role="status">
            <Icon name="wifi" size={18} />
            <span>Offline preview. Your changes stay here.</span>
            <button onClick={() => setOffline(false)}>Reconnect</button>
          </div>
        )}
        <main
          id="main-content"
          className={`main-content ${page === "squad" ? "main-report" : ""}`}
          tabIndex={-1}
        >
          {role === "staff" && (
            <>
              <div className="screen" hidden={page !== "members"}>
                <Roster
                  members={members}
                  section={section}
                  onMember={openMember}
                  onAdd={() => setOverlay({ type: "editor" })}
                />
              </div>
              <div className="screen" hidden={page !== "marks"}>
                <Marks
                  members={members}
                  section={section}
                  date={date}
                  entries={entries}
                  dirtyCount={dirtyCount}
                  saving={saving}
                  savedAt={savedAt}
                  saveError={saveError}
                  locked={locked}
                  onEntry={setEntry}
                  onDate={() => setOverlay({ type: "date" })}
                  onShift={shiftDate}
                  onSave={save}
                  onClear={() => setOverlay({ type: "actions" })}
                  onUnlock={() => setUnlocked(true)}
                />
              </div>
            </>
          )}
          {role !== "boy" && (
            <div className="screen" hidden={page !== "squad"}>
              <Squad
                members={members}
                section={section}
                role={role}
                onMember={openMember}
              />
            </div>
          )}
          {role !== "staff" && (
            <div className="screen" hidden={page !== "mine"}>
              <PortalHome
                members={members}
                section={section}
                onCalendar={() => navigate("calendar")}
              />
            </div>
          )}
          <div className="screen" hidden={page !== "calendar"}>
            <Calendar onNotice={notify} />
          </div>
          <div className="screen" hidden={page !== "more"}>
            <Settings
              members={members}
              section={section}
              role={role}
              reducedMotion={reducedMotion}
              setReducedMotion={setReducedMotion}
              solidSurfaces={solidSurfaces}
              setSolidSurfaces={setSolidSurfaces}
              onWorkspace={() => setOverlay({ type: "workspace" })}
              onCalendar={() => navigate("calendar")}
              onPrototype={() => setOverlay({ type: "prototype" })}
              onNotice={notify}
            />
          </div>
        </main>
      </div>
      <nav className="tabbar" aria-label="Tab navigation">
        {visibleTabs.map(navLink)}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="check" size={17} />
          </span>
          <span>{notice}</span>
          <IconButton
            icon="close"
            label="Dismiss message"
            onClick={() => setNotice("")}
          />
        </div>
      )}
      {overlay?.type === "workspace" && (
        <Sheet title="Your workspace" onClose={() => setOverlay(null)}>
          <p className="sheet-intro">One Company. A place for every section.</p>
          <div className="workspace-options">
            {(["company", "junior"] as const)
              .filter((value) => role === "staff" || value === "company")
              .map((value) => (
                <button
                  key={value}
                  aria-pressed={section === value}
                  onClick={() => {
                    if (saving) {
                      notify("Finishing this save…");
                      return;
                    }
                    if (dirtyCount && section !== value)
                      setOverlay({ type: "discard", section: value });
                    else switchSection(value);
                  }}
                >
                  <span className="section-brand">
                    <img
                      src={value === "company" ? companyLogo : juniorLogo}
                      alt=""
                    />
                  </span>
                  <span>
                    <strong>
                      {value === "company"
                        ? "Company Section"
                        : "Junior Section"}
                    </strong>
                    <span>
                      {value === "company"
                        ? "School years 8–14"
                        : "School years P4–P7"}
                    </span>
                  </span>
                  {section === value && <Icon name="check" size={20} />}
                </button>
              ))}
          </div>
        </Sheet>
      )}
      {overlay?.type === "member" && activeMember && (
        <MemberDetail
          member={activeMember}
          section={section}
          canEdit={role === "staff"}
          onClose={() => setOverlay(null)}
          onEdit={() => setOverlay({ type: "editor", id: activeMember.id })}
          onDelete={() => setOverlay({ type: "delete", id: activeMember.id })}
          onReviewDate={(next) => {
            requestDate(next);
            navigate("marks");
            if (dirtyCount && next !== date)
              setOverlay({ type: "discard", date: next });
          }}
          onMark={() => {
            setOverlay(null);
            navigate("marks");
            setTimeout(
              () =>
                document
                  .getElementById(`mark-${activeMember.id}`)
                  ?.scrollIntoView({
                    block: "center",
                    behavior: reducedMotion ? "instant" : "smooth",
                  }),
              50,
            );
          }}
        />
      )}
      {overlay?.type === "editor" && (
        <MemberEditor
          member={activeMember}
          section={section}
          onClose={() => setOverlay(null)}
          onSave={(value) => {
            const id = activeMember?.id || `demo-new-${Date.now()}`;
            if (activeMember)
              setMembers((current) =>
                current.map((member) =>
                  member.id === id ? { ...member, ...value } : member,
                ),
              );
            else {
              setMembers((current) => [
                ...current,
                {
                  ...value,
                  id,
                  attended: 0,
                  total: 0,
                  history: Array(8).fill(-2),
                },
              ]);
              setEntries((current) => ({ ...current, [id]: emptyEntry() }));
            }
            setOverlay(null);
            notify(activeMember ? "Member updated." : "Member added.");
          }}
        />
      )}
      {overlay?.type === "delete" && activeMember && (
        <Sheet
          title="Remove member?"
          onClose={() => setOverlay(null)}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  setOverlay({ type: "member", id: activeMember.id })
                }
              >
                Keep member
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setMembers((value) =>
                    value.filter((member) => member.id !== activeMember.id),
                  );
                  setOverlay(null);
                  notify("Member removed from this preview.");
                }}
              >
                Remove member
              </Button>
            </>
          }
        >
          <p className="sheet-intro">
            Remove {activeMember.name} from the prototype roster? This affects
            only this local preview.
          </p>
        </Sheet>
      )}
      {overlay?.type === "date" && (
        <DateSheet
          date={date}
          onSelect={requestDate}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.type === "discard" && (
        <Sheet
          title="Keep your changes?"
          onClose={() => setOverlay(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOverlay(null)}>
                Stay here
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (overlay.date) applyDate(overlay.date);
                  else if (overlay.section) switchSection(overlay.section);
                }}
              >
                Discard changes
              </Button>
            </>
          }
        >
          <p className="sheet-intro">
            You have {dirtyCount} unsaved{" "}
            {dirtyCount === 1 ? "change" : "changes"}. Save them before{" "}
            {overlay.date ? "changing the meeting" : "switching sections"}, or
            discard them to continue.
          </p>
        </Sheet>
      )}
      {overlay?.type === "actions" && (
        <Sheet title="Meeting actions" onClose={() => setOverlay(null)}>
          <div className="list-group choice-list">
            <button onClick={() => setOverlay({ type: "date" })}>
              <Icon name="calendar" /> Choose meeting date{" "}
              <Icon name="chevron" />
            </button>
            <button
              className="text-danger"
              disabled={locked}
              onClick={() => setOverlay({ type: "clear" })}
            >
              <Icon name="trash" /> Clear this meeting
            </button>
          </div>
          <p className="group-footnote">
            Cleared entries are only removed when you save the meeting.
          </p>
        </Sheet>
      )}
      {overlay?.type === "clear" && (
        <Sheet
          title="Clear this meeting?"
          onClose={() => setOverlay(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOverlay(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setEntries(
                    Object.fromEntries(
                      members.map((member) => [member.id, emptyEntry()]),
                    ),
                  );
                  setSavedAt("");
                  setOverlay(null);
                }}
              >
                Clear entries
              </Button>
            </>
          }
        >
          <p className="sheet-intro">
            Set everyone to Not recorded for {formatDate(date)}. Nothing changes
            until you save.
          </p>
        </Sheet>
      )}
      {overlay?.type === "prototype" && (
        <Sheet title="About this prototype" onClose={() => setOverlay(null)}>
          <p className="sheet-intro">Assembly · Native-first design study</p>
          <p>
            All names and records are synthetic. Edits and saves stay in memory,
            and reload resets the preview. No account, production service or
            database is connected.
          </p>
          <h3 className="detail-section-title">Explore a role</h3>
          <div className="list-group choice-list">
            {[
              { role: "staff", label: "Staff workspace", page: "members" },
              { role: "leader", label: "Squad leader", page: "squad" },
              { role: "boy", label: "Ordinary boy portal", page: "mine" },
            ].map((option) => (
              <a
                href={`?role=${option.role}&page=${option.page}`}
                key={option.role}
              >
                {option.label}
                <Icon name="chevron" />
              </a>
            ))}
          </div>
          <h3 className="detail-section-title">Connection preview</h3>
          <Button
            variant="secondary"
            onClick={() => {
              setOffline((value) => !value);
              setOverlay(null);
            }}
          >
            {offline ? "Return online" : "Simulate offline"}
          </Button>
          <p className="group-footnote">
            Native passkeys, push, Home Screen installation and real device
            keyboards are outside this local simulation.
          </p>
        </Sheet>
      )}
    </div>
  );
}
function DateSheet({
  date,
  onSelect,
  onClose,
}: {
  date: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(date);
  return (
    <Sheet
      title="Choose meeting"
      onClose={onClose}
      footer={
        <Button onClick={() => onSelect(value)} disabled={!value}>
          Choose date
        </Button>
      }
    >
      <p className="sheet-intro">
        Your marks stay with the meeting they belong to.
      </p>
      <label className="form-field">
        Meeting date
        <input
          type="date"
          value={value}
          name="meeting-date"
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <div className="list-group choice-list">
        {["2026-10-09", "2026-10-16", "2026-10-23"].map((day) => (
          <button
            key={day}
            aria-pressed={value === day}
            onClick={() => setValue(day)}
          >
            <span>{formatDate(day)}</span>
            {value === day && <Icon name="check" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
