import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from "react";
import { createRoot } from "react-dom/client";
import {
  App,
  Navbar,
  Tabbar,
  TabbarLink,
  ToolbarPane,
  List,
  ListItem,
  Segmented,
  SegmentedButton,
  Searchbar,
  Toggle,
  Button,
} from "konsta/react";
import { Drawer } from "vaul";
import "./native-plus.css";
import { ModelProvider, useModel, initialScreen, type Screen } from "./model";
import {
  FoundationContext,
  SkipLink,
  overlayOrigin,
  rememberTrigger,
  restoreFocus,
  Icon,
  IconButton,
  WorkspaceControl,
  PageActions,
  screenTitles,
  type Components,
} from "./foundation";
import { screenComponents, SaveAccessory, MemberDetail } from "./screens";
import {
  OverlayContent,
  EditorAction,
  titleForOverlay,
} from "./overlay-content";
import { Sidebar, useEnvironment, tabPages, updateAddress } from "./shell";
const primitive: Pick<
  Components,
  "Group" | "Row" | "Segment" | "Search" | "Switch" | "Button"
> = {
  Group: ({ children, className = "" }) => (
    <List strong inset dividers className={`native-group ${className}`}>
      {children}
    </List>
  ),
  Row: ({ title, subtitle, after, media, onClick, className = "" }) => (
    <ListItem
      className={`native-row ${className}`}
      title={title}
      subtitle={
        subtitle ? <span className="person-meta">{subtitle}</span> : undefined
      }
      after={after}
      media={media}
      link={!!onClick}
      linkProps={onClick ? { component: "button", type: "button" } : undefined}
      onClick={
        onClick
          ? (event) => {
              rememberTrigger(
                event.currentTarget.querySelector("button,a") ||
                  event.currentTarget,
              );
              onClick();
            }
          : undefined
      }
      chevron={false}
    />
  ),
  Segment: ({ label, value, options, onChange }) => (
    <Segmented
      strong
      rounded
      className="native-segment"
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <SegmentedButton
          key={o.value}
          active={value === o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </SegmentedButton>
      ))}
    </Segmented>
  ),
  Search: ({ value, onChange }) => (
    <div className="native-search">
      <Searchbar
        placeholder="Search members"
        value={value}
        onInput={(e) => onChange(e.target.value)}
        clearButton={false}
        disableButton={false}
      />
    </div>
  ),
  Switch: ({ label, value, onChange }) => (
    <span className="native-switch">
      <Toggle
        name={label}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      >
        <span className="sr-only">{label}</span>
      </Toggle>
    </span>
  ),
  Button: ({
    children,
    onClick,
    danger,
    quiet,
    disabled,
    type = "button",
    form,
  }) => (
    <Button
      large
      rounded
      clear={quiet}
      disabled={disabled}
      onClick={
        onClick
          ? (event) => {
              rememberTrigger(
                event.currentTarget.querySelector("button,a") ||
                  event.currentTarget,
              );
              onClick();
            }
          : undefined
      }
      type={type}
      form={form}
      className={`native-button ${danger ? "destructive-button" : ""}`}
    >
      {children}
    </Button>
  ),
};
function PlusPage({ screen, active }: { screen: Screen; active: boolean }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const C = screenComponents[screen];
  return (
    <section className="plus-page" hidden={!active}>
      <div className="plus-scroll" ref={setEl}>
        <Navbar
          large
          transparent
          title={screenTitles[screen]}
          scrollEl={el || undefined}
          left={<WorkspaceControl />}
          right={<PageActions screen={screen} />}
          className="plus-navbar"
        />
        <h1 className="sr-only">{screenTitles[screen]}</h1>
        <C />
      </div>
    </section>
  );
}
function PlusOverlay() {
  const m = useModel();
  const [snap, setSnap] = useState<number | string | null>(0.68);
  const trigger = useRef<HTMLElement | null>(null);
  const open = !!m.overlay;
  const [wide, setWide] = useState(
    () => matchMedia("(min-width:768px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(min-width:768px)");
    const update = () => setWide(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useLayoutEffect(() => {
    if (open) {
      trigger.current = overlayOrigin.current?.isConnected
        ? overlayOrigin.current
        : (document.activeElement as HTMLElement);
      setSnap(m.overlay?.kind === "editor" ? 1 : 0.68);
    }
  }, [open]);
  useEffect(() => {
    if (m.overlay)
      document
        .querySelector<HTMLElement>("[data-sheet-title]")
        ?.focus({ preventScroll: true });
  }, [m.overlay?.kind]);
  const close = () => m.setOverlay(null);
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
      snapPoints={wide ? [1] : [0.68, 1]}
      activeSnapPoint={wide ? 1 : snap}
      setActiveSnapPoint={setSnap}
      fadeFromIndex={0}
      handleOnly
      modal
      repositionInputs
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="vaul-overlay" />
        <Drawer.Content
          className="sheet-shell plus-experiment"
          aria-describedby="sheet-description"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLElement>("[data-sheet-title]")?.focus();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            restoreFocus(trigger.current, "plus-main");
          }}
        >
          <Drawer.Handle className="vaul-handle" aria-label="Drag sheet" />
          <header className="sheet-header">
            <Drawer.Title tabIndex={-1} data-sheet-title>
              {titleForOverlay(m.overlay)}
            </Drawer.Title>
            <div className="sheet-header-actions">
              {m.overlay?.kind === "editor" ? (
                <EditorAction />
              ) : (
                !wide && (
                  <button
                    className="text-action detent-control"
                    onClick={() => setSnap(snap === 1 ? 0.68 : 1)}
                  >
                    {snap === 1 ? "Compact" : "Expand"}
                  </button>
                )
              )}
              <Drawer.Close asChild>
                <button className="round-control" aria-label="Close sheet">
                  <Icon name="close" />
                </button>
              </Drawer.Close>
            </div>
          </header>
          <Drawer.Description id="sheet-description" className="sr-only">
            A focused task. Drag the handle or use Expand to change the sheet
            height.
          </Drawer.Description>
          <div className="sheet-content">
            {m.overlay && <OverlayContent close={close} />}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
function Experiment() {
  const m = useModel();
  const pages = tabPages(m.role);
  const [screen, setScreen] = useState<Screen>(() => initialScreen(m.role));
  const [member, setMember] = useState<string | null>(null);
  const [detailEl, setDetailEl] = useState<HTMLElement | null>(null);
  const pushed = useRef(false);
  useEnvironment();
  const navigate = (s: Screen) => {
    setMember(null);
    setScreen(s);
    m.setOverlay(null);
    updateAddress(s);
  };
  const openMember = (id: string) => {
    pushed.current = true;
    setMember(id);
    updateAddress(screen, id);
  };
  const back = () => {
    if (pushed.current) {
      history.back();
      pushed.current = false;
    } else setMember(null);
  };
  useEffect(() => {
    const pop = () => {
      const p = new URLSearchParams(location.search);
      setMember(p.get("member"));
      const s = p.get("page") as Screen;
      if (pages.includes(s)) setScreen(s);
      m.setOverlay(null);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    for (const e of document.querySelectorAll(".native-search input")) {
      e.setAttribute("aria-label", "Search members");
      e.setAttribute("role", "searchbox");
      e.setAttribute("enterkeyhint", "search");
    }
    for (const wrap of document.querySelectorAll(".native-switch"))
      wrap
        .querySelector("input")
        ?.setAttribute("aria-label", wrap.textContent || "Switch");
  }, [m, screen]);
  return (
    <App theme="ios" className={`plus-experiment section-${m.section}`}>
      <FoundationContext.Provider
        value={{
          ...primitive,
          variant: "native-plus",
          screen,
          navigate,
          openMember,
          back,
        }}
      >
        <SkipLink target="plus-main" />
        <div className="app-surface">
          <Sidebar screen={screen} navigate={navigate} />
          <main
            id="plus-main"
            tabIndex={-1}
            className={`plus-main ${member ? "has-detail" : ""}`}
          >
            <div className="plus-pages" inert={!!member}>
              {pages.map((s) => (
                <PlusPage key={s} screen={s} active={screen === s} />
              ))}
            </div>
            {member && (
              <section className="plus-detail">
                <div className="plus-scroll" ref={setDetailEl}>
                  <Navbar
                    title="Member"
                    scrollEl={detailEl || undefined}
                    left={
                      <button className="back-control" onClick={back}>
                        <Icon name="back" />
                        {screen === "squad" ? "Squad" : "Members"}
                      </button>
                    }
                    right={
                      <IconButton
                        name="settings"
                        label="Member actions"
                        onClick={() =>
                          m.setOverlay({ kind: "delete", id: member })
                        }
                      />
                    }
                  />
                  <h1 className="sr-only">Member details</h1>
                  <MemberDetail id={member} />
                </div>
              </section>
            )}
          </main>
          <Tabbar
            component="nav"
            className="native-tabs"
            labels
            icons
            aria-label="Main navigation"
          >
            <ToolbarPane className="navigation-pane">
              {pages.map((s) => (
                <TabbarLink
                  key={s}
                  active={screen === s}
                  label={
                    s === "settings"
                      ? "More"
                      : s === "marks"
                        ? "Marks"
                        : s === "squad"
                          ? "Squad"
                          : s === "home"
                            ? "Home"
                            : "Members"
                  }
                  icon={<Icon name={s === "home" ? "members" : s} />}
                  component="button"
                  aria-current={screen === s ? "page" : undefined}
                  onClick={() => navigate(s)}
                />
              ))}
            </ToolbarPane>
          </Tabbar>
          {screen === "marks" && !member && <SaveAccessory />}
        </div>
        <PlusOverlay />
      </FoundationContext.Provider>
    </App>
  );
}
createRoot(document.getElementById("root")!).render(
  <ModelProvider>
    <Experiment />
  </ModelProvider>,
);
