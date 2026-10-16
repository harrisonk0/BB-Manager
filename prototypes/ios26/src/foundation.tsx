import React, { createContext, useContext } from "react";
import {
  UsersRound,
  ClipboardCheck,
  ChartNoAxesColumn,
  Ellipsis,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  X,
  CalendarDays,
  Sun,
  Moon,
  ShieldCheck,
  KeyRound,
  Bell,
  Trash2,
  Star,
  ArrowUpRight,
  UserRound,
  WifiOff,
  Settings2,
  Search,
} from "lucide-react";
import {
  type Screen,
  type RankedMember,
  useModel,
  type Section,
  initials,
} from "./model";
const icons = {
  members: UsersRound,
  marks: ClipboardCheck,
  squad: ChartNoAxesColumn,
  settings: Ellipsis,
  plus: Plus,
  filter: SlidersHorizontal,
  next: ChevronRight,
  back: ChevronLeft,
  down: ChevronDown,
  check: Check,
  close: X,
  calendar: CalendarDays,
  sun: Sun,
  moon: Moon,
  shield: ShieldCheck,
  key: KeyRound,
  bell: Bell,
  trash: Trash2,
  star: Star,
  external: ArrowUpRight,
  person: UserRound,
  wifi: WifiOff,
  tune: Settings2,
  search: Search,
};
// Explicit origin survives Safari's choice not to focus a tapped button.
export const overlayOrigin: { current: HTMLElement | null } = { current: null };
export function rememberTrigger(element: HTMLElement) {
  overlayOrigin.current = element.matches(
    "a[href],button,input,select,textarea,[tabindex]",
  )
    ? element
    : element.querySelector<HTMLElement>(
        "a[href],button,input,select,textarea,[tabindex]",
      ) || element;
}
export function restoreFocus(trigger: HTMLElement | null, mainId: string) {
  if (trigger?.isConnected && !trigger.closest("[inert],[hidden]")) {
    trigger.focus({ preventScroll: true });
    if (
      document.activeElement === trigger ||
      trigger.contains(document.activeElement)
    )
      return;
  }
  const main = document.getElementById(mainId);
  if (main) {
    main.tabIndex = -1;
    main.focus({ preventScroll: true });
  }
}
export function SkipLink({ target }: { target: string }) {
  return (
    <a
      className="skip-link external"
      href={"#" + target}
      onClick={(event) => {
        event.preventDefault();
        const main = document.getElementById(target);
        if (main) {
          main.tabIndex = -1;
          main.focus({ preventScroll: true });
        }
      }}
    >
      Skip to content
    </a>
  );
}
export function Icon({
  name,
  size = 22,
}: {
  name: keyof typeof icons;
  size?: number;
}) {
  const C = icons[name];
  return <C size={size} strokeWidth={1.85} aria-hidden="true" />;
}
export type RowProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  after?: React.ReactNode;
  media?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  label?: string;
};
export type SegProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};
export type Components = {
  Group: React.ComponentType<{ children: React.ReactNode; className?: string }>;
  Row: React.ComponentType<RowProps>;
  Segment: React.ComponentType<SegProps>;
  Search: React.ComponentType<{ value: string; onChange: (v: string) => void }>;
  Switch: React.ComponentType<{
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }>;
  Button: React.ComponentType<{
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
    quiet?: boolean;
    type?: "button" | "submit";
    form?: string;
  }>;
  variant: "framework7" | "native-plus";
  screen: Screen;
  navigate: (s: Screen) => void;
  openMember: (id: string) => void;
  back: () => void;
};
export const FoundationContext = createContext<Components>(null!);
export const useUI = () => useContext(FoundationContext);
export function IconButton({
  name,
  label,
  onClick,
}: {
  name: keyof typeof icons;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="round-control material-control"
      aria-label={label}
      onClick={(event) => {
        rememberTrigger(event.currentTarget);
        onClick();
      }}
    >
      <Icon name={name} />
    </button>
  );
}
export function Avatar({ member }: { member: RankedMember }) {
  return (
    <span className={`person-avatar tone-${member.squad}`} aria-hidden="true">
      {initials(member.name)}
    </span>
  );
}
export function Rank({
  member,
  section,
}: {
  member: RankedMember;
  section: Section;
}) {
  if (!member.rank || section !== "company") return null;
  const count = {
    "Lance Corporal": 1,
    Corporal: 2,
    Sergeant: 3,
    "Staff Sergeant": 4,
  }[member.rank];
  return (
    <span className="nco-rank">
      <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <path
            key={i}
            d={
              member.rank === "Staff Sergeant"
                ? `M2 ${19 - i * 4}L9 ${15 - i * 4}L16 ${19 - i * 4}`
                : `M2 ${3 + i * 4}L9 ${7 + i * 4}L16 ${3 + i * 4}`
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        ))}
      </svg>
      <span className="sr-only">, {member.rank}</span>
    </span>
  );
}
export function MemberName({ member }: { member: RankedMember }) {
  const { section } = useModel();
  return (
    <span className="name-line">
      {member.name}
      <Rank member={member} section={section} />
      {member.leader && (
        <span className="leader-mark">
          <Icon name="star" size={13} />
          <span className="sr-only">, Squad leader</span>
        </span>
      )}
    </span>
  );
}
export const screenTitles: Record<Screen, string> = {
  members: "Members",
  marks: "Weekly marks",
  squad: "Your squad",
  settings: "Settings",
  home: "My Company",
};
export function WorkspaceControl() {
  const m = useModel();
  return (
    <button
      className="workspace-control material-control"
      onClick={(event) => {
        rememberTrigger(event.currentTarget);
        m.setOverlay({ kind: "workspace" });
      }}
      aria-label={`Switch workspace, ${m.section === "company" ? "Company" : "Junior"}`}
    >
      <span>{m.section === "company" ? "Company" : "Junior"}</span>
      <Icon name="down" size={13} />
    </button>
  );
}
export function PageActions({ screen }: { screen: Screen }) {
  const m = useModel();
  return screen === "members" ? (
    <IconButton
      name="plus"
      label="Add member"
      onClick={() => m.setOverlay({ kind: "editor" })}
    />
  ) : screen === "marks" ? (
    <IconButton
      name="settings"
      label="Meeting actions"
      onClick={() => m.setOverlay({ kind: "actions" })}
    />
  ) : screen === "squad" ? (
    <IconButton
      name="calendar"
      label="Report period"
      onClick={() => m.setOverlay({ kind: "report" })}
    />
  ) : (
    <button
      className="account-disc"
      onClick={(event) => {
        rememberTrigger(event.currentTarget);
        m.setOverlay({ kind: "about" });
      }}
      aria-label={`${m.role === "staff" ? "EW" : "AM"}, Preview options`}
    >
      {m.role === "staff" ? "EW" : "AM"}
    </button>
  );
}
