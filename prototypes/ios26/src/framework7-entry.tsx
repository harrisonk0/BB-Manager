import React, { useEffect, useMemo, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import Framework7 from "framework7/lite";
import TabsModule from "framework7/components/tabs";
import SheetModule from "framework7/components/sheet";
import SearchModule from "framework7/components/searchbar";
import ToggleModule from "framework7/components/toggle";
import ActionsModule from "framework7/components/actions";
import Framework7React, {
  App,
  Views,
  View,
  Page,
  Navbar,
  NavLeft,
  NavRight,
  Toolbar,
  ToolbarPane,
  Link,
  List,
  ListItem,
  Segmented,
  Button,
  Searchbar,
  Toggle,
  Sheet,
  f7,
  f7ready,
} from "framework7-react";
import "framework7/css";
import "framework7/components/tabs/css";
import "framework7/components/sheet/css";
import "framework7/components/searchbar/css";
import "framework7/components/toggle/css";
import "framework7/components/actions/css";
import "./shared.css";
import "./framework7.css";
import { ModelProvider, useModel, initialScreen, type Screen } from "./model";
import {
  FoundationContext,
  useUI,
  overlayOrigin,
  rememberTrigger,
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
Framework7.use([
  Framework7React,
  TabsModule,
  SheetModule,
  SearchModule,
  ToggleModule,
  ActionsModule,
]);
function F7Switch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const ref = useRef<{ el: HTMLElement; f7Toggle: () => any }>(null);
  useEffect(() => {
    ref.current?.el?.querySelector("input")?.setAttribute("aria-label", label);
    const toggle = ref.current?.f7Toggle();
    if (toggle && toggle.checked !== value) toggle.checked = value;
  }, [label, value]);
  return (
    <span className="native-switch">
      <Toggle
        ref={ref}
        name={label}
        defaultChecked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
function F7Button({
  children,
  danger,
  quiet,
  disabled,
  onClick,
  type = "button",
  form,
}: React.ComponentProps<Components["Button"]>) {
  const ref = useRef<{ el: HTMLElement }>(null);
  useEffect(() => {
    ref.current?.el?.toggleAttribute("disabled", !!disabled);
  }, [disabled]);
  return (
    <Button
      ref={ref}
      fill={!quiet}
      round
      large
      color={danger ? "red" : undefined}
      className={`native-button ${danger ? "destructive-button" : ""}`}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      type={type}
      {...{ form }}
    >
      {children}
    </Button>
  );
}
const primitive: Pick<
  Components,
  "Group" | "Row" | "Segment" | "Search" | "Switch" | "Button"
> = {
  Group: ({ children, className = "" }) => (
    <List strong inset dividersIos className={`native-group ${className}`}>
      <ul>{children}</ul>
    </List>
  ),
  Row: ({ title, subtitle, after, media, onClick, className = "" }) => (
    <ListItem
      link={onClick ? "#" : undefined}
      preventRouter
      noChevron
      className={`native-row ${className}`}
      onClick={
        onClick
          ? (e) => {
              e.preventDefault();
              rememberTrigger(e.currentTarget);
              onClick();
            }
          : undefined
      }
    >
      {media && <span slot="media">{media}</span>}
      <span slot="title">{title}</span>
      {subtitle && (
        <span slot="footer" className="person-meta">
          {subtitle}
        </span>
      )}
      {after && <span slot="after">{after}</span>}
    </ListItem>
  ),
  Segment: ({ label, value, options, onChange }) => (
    <div className="native-segment" role="group" aria-label={label}>
      <Segmented strong round>
        {options.map((o) => (
          <Button
            type="button"
            key={o.value}
            active={value === o.value}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            <span>{o.label}</span>
          </Button>
        ))}
      </Segmented>
    </div>
  ),
  Search: ({ value, onChange }) => (
    <div className="native-search">
      <Searchbar
        inline
        customSearch
        backdrop={false}
        disableButton={false}
        clearButton={false}
        placeholder="Search members"
        value={value}
        onInput={(e) => onChange(e.target.value)}
      />
    </div>
  ),
  Switch: F7Switch,
  Button: F7Button,
};
function F7Screen({ screen }: { screen: Screen }) {
  const C = screenComponents[screen];
  return (
    <Page
      onPageBeforeIn={(p) => {
        p.el.inert = false;
      }}
      onPageBeforeOut={(p) => {
        p.el.inert = true;
      }}
      name={screen}
      className={`screen-page screen-${screen}`}
    >
      <Navbar large largeTransparent title={screenTitles[screen]}>
        <NavLeft>
          <WorkspaceControl />
        </NavLeft>
        <NavRight>
          <PageActions screen={screen} />
        </NavRight>
      </Navbar>
      <h1 className="sr-only">{screenTitles[screen]}</h1>
      <C />
    </Page>
  );
}
function F7Detail({ f7route }: { f7route: any }) {
  const { screen } = useUI();
  return (
    <Page
      onPageBeforeIn={(p) => {
        p.el.inert = false;
      }}
      onPageBeforeOut={(p) => {
        p.el.inert = true;
      }}
      name="member-detail"
      className="screen-page detail-page"
    >
      <Navbar
        title="Member"
        backLink={screen === "squad" ? "Squad" : "Members"}
        backLinkShowText
      />
      <h1 className="sr-only">Member details</h1>
      <MemberDetail id={f7route.params.id} />
    </Page>
  );
}
function F7Overlay() {
  const m = useModel();
  const ref = useRef<any>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const [detent, setDetent] = useState(1);
  useEffect(() => {
    if (m.overlay && !wasOpen.current) {
      trigger.current = overlayOrigin.current?.isConnected
        ? overlayOrigin.current
        : (document.activeElement as HTMLElement);
    }
    wasOpen.current = !!m.overlay;
  }, [m.overlay]);
  const close = () => m.setOverlay(null);
  return (
    <Sheet
      ref={ref}
      className="experiment-sheet"
      opened={!!m.overlay}
      backdrop
      closeByBackdropClick
      closeOnEscape
      swipeToClose
      swipeToStep
      swipeHandler=".sheet-grab"
      breakpoints={[0.65, 1]}
      style={{ height: "min(700px, 92dvh)" }}
      {...{
        onSheetBreakpoint: (_instance: unknown, value: number) =>
          setDetent(value),
      }}
      onSheetOpened={() => {
        ref.current?.f7Sheet()?.setBreakpoint(1);
        const el = ref.current?.el;
        el?.setAttribute("role", "dialog");
        el?.setAttribute("aria-modal", "true");
        el?.setAttribute("aria-labelledby", "sheet-title");
        el?.querySelector("h2")?.focus();
        document.querySelector(".app-surface")?.setAttribute("inert", "");
      }}
      onSheetClose={() => {
        document.querySelector(".app-surface")?.removeAttribute("inert");
      }}
      onSheetClosed={() => {
        close();
        trigger.current?.focus();
      }}
    >
      <div className="sheet-grab">
        <span />
      </div>
      <header className="sheet-header">
        <h2 id="sheet-title" tabIndex={-1}>
          {titleForOverlay(m.overlay)}
        </h2>
        <div className="sheet-header-actions">
          {m.overlay?.kind === "editor" ? (
            <EditorAction />
          ) : (
            <button
              className="text-action detent-control"
              onClick={() =>
                ref.current?.f7Sheet()?.setBreakpoint(detent === 1 ? 0.65 : 1)
              }
            >
              {detent === 1 ? "Compact" : "Expand"}
            </button>
          )}
          <IconButton
            name="close"
            label="Close sheet"
            onClick={() => ref.current?.f7Sheet()?.close()}
          />
        </div>
      </header>
      <div className="sheet-content">
        {m.overlay && (
          <OverlayContent close={() => ref.current?.f7Sheet()?.close()} />
        )}
      </div>
    </Sheet>
  );
}
function Experiment() {
  const m = useModel();
  const [screen, setScreen] = useState<Screen>(() => initialScreen(m.role));
  const pages = tabPages(m.role);
  const initial = useRef(screen);
  useEnvironment();
  // iOS touch activation can bypass React click; View lifecycle owns active-tab state.
  const activateTab = (next: Screen) => {
    setScreen(next);
    if (new URLSearchParams(location.search).get("page") !== next)
      updateAddress(next);
  };
  const navigate = (next: Screen) => {
    f7.tab.show("#view-" + next);
    activateTab(next);
  };
  const openMember = (id: string) =>
    f7.views.get("#view-" + screen)?.router.navigate("/member/" + id + "/");
  const back = () => f7.views.get("#view-" + screen)?.router.back();
  const routes = useMemo(
    () =>
      Object.fromEntries(
        pages.map((s) => [
          s,
          [
            { path: "/", component: () => <F7Screen screen={s} /> },
            { path: "/member/:id/", component: F7Detail },
          ],
        ]),
      ),
    [],
  );
  useEffect(() => {
    const pop = () => {
      const next = new URLSearchParams(location.search).get("page") as Screen;
      if (pages.includes(next)) {
        f7.tab.show("#view-" + next);
        setScreen(next);
      }
      m.setOverlay(null);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [m.setOverlay]);
  useEffect(() => {
    f7ready(() => {
      for (const input of document.querySelectorAll(".searchbar input"))
        input.setAttribute("aria-label", "Search members");
      for (const toggle of document.querySelectorAll(".native-switch")) {
        const input = toggle.querySelector("input");
        input?.setAttribute("aria-label", toggle.textContent || "Switch");
      }
    });
  }, [screen, m]);
  return (
    <App
      name="BB Manager"
      theme="ios"
      iosTranslucentBars
      className={`f7-experiment section-${m.section}`}
      view={{ iosSwipeBack: false }}
    >
      <FoundationContext.Provider
        value={{
          ...primitive,
          variant: "framework7",
          screen,
          navigate,
          openMember,
          back,
        }}
      >
        <a href="#view-members" className="skip-link">
          Skip to content
        </a>
        <div className="app-surface">
          <Sidebar screen={screen} navigate={navigate} />
          <Views tabs className="experiment-views tabs">
            {pages.map((s) => (
              <View
                id={"view-" + s}
                key={s}
                tab
                tabActive={s === screen}
                onTabShow={() => activateTab(s)}
                main={s === initial.current}
                url="/"
                routes={routes[s]}
                iosSwipeBack={false}
              />
            ))}
          </Views>
          <Toolbar
            tabbar
            icons
            position="bottom"
            className="native-tabs"
            aria-label="Main navigation"
            {...{ role: "navigation" }}
          >
            <ToolbarPane>
              {pages.map((s) => (
                <Link
                  key={s}
                  tabLink={"#view-" + s}
                  tabLinkActive={screen === s}
                  aria-current={screen === s ? "page" : undefined}
                >
                  <Icon name={s === "home" ? "members" : s} />
                  <span className="tabbar-label">
                    {s === "settings"
                      ? "More"
                      : s === "marks"
                        ? "Marks"
                        : s === "squad"
                          ? "Squad"
                          : s === "home"
                            ? "Home"
                            : "Members"}
                  </span>
                </Link>
              ))}
            </ToolbarPane>
          </Toolbar>
          {screen === "marks" && <SaveAccessory />}
        </div>
        <F7Overlay />
      </FoundationContext.Provider>
    </App>
  );
}
createRoot(document.getElementById("root")!).render(
  <ModelProvider>
    <Experiment />
  </ModelProvider>,
);
