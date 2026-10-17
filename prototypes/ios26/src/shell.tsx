import React, { useEffect } from "react";
import { useModel, type Screen, type Role } from "./model";
import { Icon, WorkspaceControl } from "./foundation";
import bbLogo from "../../native-ios/assets/bb-blue.png";
export const tabPages = (role: Role): Screen[] =>
  role === "staff"
    ? ["members", "marks", "squad", "settings"]
    : role === "leader"
      ? ["home", "squad", "settings"]
      : ["home", "settings"];
export function updateAddress(screen: Screen, member?: string) {
  const u = new URL(location.href);
  u.searchParams.set("page", screen);
  if (member) u.searchParams.set("member", member);
  else u.searchParams.delete("member");
  history.pushState({ screen, member }, "", u);
  document.title = `${screen === "marks" ? "Weekly marks" : screen === "squad" ? "Your squad" : screen === "settings" ? "Settings" : "Members"} · BB Manager prototype`;
}
export function Sidebar({
  screen,
  navigate,
}: {
  screen: Screen;
  navigate: (p: Screen) => void;
}) {
  const m = useModel();
  return (
    <aside className="native-sidebar">
      <div className="sidebar-brand">
        <img src={bbLogo} alt="The Boys’ Brigade" />
        <strong>BB Manager</strong>
        <p>Your Company, together.</p>
      </div>
      <WorkspaceControl />
      <nav aria-label="Sidebar navigation">
        {tabPages(m.role).map((s) => (
          <button
            key={s}
            onClick={() => navigate(s)}
            aria-current={screen === s ? "page" : undefined}
          >
            <Icon name={s === "home" ? "members" : s} />
            {s === "settings"
              ? "Settings"
              : s === "marks"
                ? "Weekly marks"
                : s === "squad"
                  ? "Squad"
                  : s === "home"
                    ? "Home"
                    : "Members"}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>
          Friday, 16 October
          <br />
          2026 / 27
        </p>
        <a href="/">
          Compare experiments
          <Icon name="external" size={14} />
        </a>
      </div>
    </aside>
  );
}
export function useEnvironment() {
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const set = () =>
      document.documentElement.classList.toggle(
        "system-reduce-motion",
        reduced.matches,
      );
    set();
    reduced.addEventListener("change", set);
    const viewport = () => {
      const vv = window.visualViewport;
      const inset = vv
        ? Math.max(0, innerHeight - vv.height - vv.offsetTop)
        : 0;
      document.documentElement.style.setProperty(
        "--keyboard-inset",
        inset + "px",
      );
      document.documentElement.classList.toggle("keyboard-open", inset > 100);
    };
    window.visualViewport?.addEventListener("resize", viewport);
    return () => {
      reduced.removeEventListener("change", set);
      window.visualViewport?.removeEventListener("resize", viewport);
    };
  }, []);
}
