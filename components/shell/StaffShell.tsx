import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View as NativeView,
  Toolbar,
  ToolbarPane,
  Link,
  Page,
  Navbar,
  NavRight,
  NavLeft,
} from "framework7-react";
import { Router } from "framework7/types";
import {
  Users,
  CheckCheck,
  ChartNoAxesColumn,
  CalendarDays,
  Settings,
  Archive,
  KeyRound,
  UserRound,
  ChevronLeft,
  ChevronDown,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { AppUser, Section, UserRole, View } from "../../types";
import {
  NativeButton,
  PageBody,
  TaskSheet,
  GroupedList,
  SettingsRow,
} from "../ui";
import { branding } from "../branding";
import {
  allowedDestination,
  pathView,
  staffDestinations,
  viewPath,
  viewTitle,
} from "./navigation";
import "./staff-shell.css";
export interface StaffShellProps {
  view: View;
  section: Section;
  role: UserRole | null;
  user: AppUser;
  onNavigate: (view: View) => void;
  onRouteChanged: (view: View) => void;
  guardNavigation: (proceed: () => void, reject: () => void) => void;
  onSwitchSection: () => void;
  onSignOut: () => void;
  renderContent: (view: View) => React.ReactNode;
  banner?: React.ReactNode;
}
const Context = createContext<StaffShellProps | null>(null);
const icons = {
  users: Users,
  check: CheckCheck,
  chart: ChartNoAxesColumn,
  calendar: CalendarDays,
  settings: Settings,
  archive: Archive,
  key: KeyRound,
  account: UserRound,
};
function StaffRoute({ f7route }: { f7route: Router.Route }) {
  const props = useContext(Context)!;
  const routeView = pathView(f7route.path) || { page: "home" };
  const [workspace, setWorkspace] = useState(false);
  return (
    <Page
      className="bb-page bb-staff-page"
      onPageBeforeIn={(page) => {
        page.el.inert = false;
      }}
      onPageAfterIn={(page) => {
        document.title = `${viewTitle(routeView)} · BB Manager`;
        const heading = page.el.querySelector(
          ".bb-page-body h1",
        ) as HTMLElement | null;
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }}
      onPageBeforeOut={(page) => {
        page.el.inert = true;
      }}
    >
      <Navbar
        large
        largeTransparent
        title={viewTitle(routeView)}
        data-bb-app-surface
        className={
          routeView.page === "boyMarks" ? "bb-detail-navbar" : undefined
        }
      >
        {routeView.page === "boyMarks" && (
          <NavLeft>
            <Link back aria-label="Back to members">
              <ChevronLeft size={24} />
              Members
            </Link>
          </NavLeft>
        )}
        <NavRight>
          <NativeButton
            variant="plain"
            onClick={() => setWorkspace(true)}
            aria-label="Workspace and account"
          >
            {routeView.page === "boyMarks" ? (
              <MoreHorizontal size={24} aria-hidden="true" />
            ) : (
              <>
                <span>
                  {props.section === "company" ? "Company" : "Junior"}
                </span>
                <ChevronDown size={16} />
              </>
            )}
          </NativeButton>
        </NavRight>
      </Navbar>
      <PageBody>
        <div data-bb-app-surface>
          {props.banner}
          <h1 className="bb-sr-only">{viewTitle(routeView)}</h1>
          {allowedDestination(routeView, props.section, props.role) ? (
            props.renderContent(routeView)
          ) : (
            <p role="alert">This page is not available in this workspace.</p>
          )}
        </div>
      </PageBody>
      <TaskSheet
        open={workspace}
        onClose={() => setWorkspace(false)}
        title="Workspace"
      >
        <img
          className="bb-workspace-logo"
          src={
            props.section === "company"
              ? branding.companyLogo
              : branding.juniorLogo
          }
          alt={`${props.section === "company" ? "Company" : "Junior"} Section`}
        />
        <GroupedList title="Account">
          <SettingsRow title={props.user.email} detail={props.role} />
          <SettingsRow
            title="Account and passkeys"
            onClick={() => {
              setWorkspace(false);
              props.onNavigate({ page: "accountSettings" });
            }}
          />
          <SettingsRow
            title="Switch section"
            onClick={() => {
              setWorkspace(false);
              props.onSwitchSection();
            }}
          />
          <SettingsRow
            title="Sign out"
            destructive
            onClick={() => {
              setWorkspace(false);
              props.onSignOut();
            }}
          />
        </GroupedList>
        <GroupedList title="More">
          {staffDestinations
            .filter(
              (item) =>
                ["archives", "portalAccess"].includes(item.page) &&
                allowedDestination(
                  { page: item.page },
                  props.section,
                  props.role,
                ),
            )
            .map((item) => (
              <SettingsRow
                key={item.page}
                title={item.title}
                onClick={() => {
                  setWorkspace(false);
                  props.onNavigate({ page: item.page });
                }}
              />
            ))}
        </GroupedList>
      </TaskSheet>
    </Page>
  );
}
/** One Framework7 router owns both native page transitions and browser history. */
export default function StaffShell(props: StaffShellProps) {
  const latest = useRef(props);
  latest.current = props;
  const ref = useRef<React.ComponentRef<typeof NativeView>>(null);
  const routes = useMemo<Router.RouteParameters[]>(() => {
    const beforeLeave = ({
      resolve,
      reject,
      from,
      to,
      router,
      direction,
    }: Router.RouteCallbackCtx) => {
      // A browser pop already moved its cursor before Framework7 runs this guard.
      // Cancel restores that cursor; normal navigation and all URL writes stay F7-owned.
      const browserPopped =
        JSON.stringify(pathView(window.location.hash.replace(/^#!/, ""))) !==
        JSON.stringify(pathView(from.path));
      latest.current.guardNavigation(
        () => resolve(),
        () => {
          reject();
          if (browserPopped) {
            const fromIndex = router.history.lastIndexOf(from.url);
            const toIndex = router.history.lastIndexOf(to.url);
            const delta =
              fromIndex >= 0 && toIndex >= 0
                ? fromIndex - toIndex
                : direction === "backward"
                  ? 1
                  : -1;
            window.history.go(delta || 1);
          }
        },
      );
    };
    const beforeEnter = ({ to, resolve, reject }: Router.RouteCallbackCtx) => {
      const target = pathView(to.path);
      if (
        target &&
        allowedDestination(target, latest.current.section, latest.current.role)
      )
        resolve();
      else reject();
    };
    return [
      { path: "/", component: StaffRoute, beforeLeave, beforeEnter },
      ...staffDestinations.map((item) => ({
        path: `/${item.page}/`,
        component: StaffRoute,
        beforeLeave,
        beforeEnter,
      })),
      {
        path: "/members/:id/",
        component: StaffRoute,
        beforeLeave,
        beforeEnter,
      },
      // Stale bookmarks from another role or malformed URLs must never leave a blank View.
      { path: "(.*)", redirect: "/home/" },
    ];
  }, []);
  useEffect(() => {
    const router = ref.current?.f7View()?.router;
    if (
      router &&
      router.currentRoute.path &&
      JSON.stringify(pathView(router.currentRoute.path)) !==
        JSON.stringify(props.view)
    )
      router.navigate(viewPath(props.view));
  }, [props.view]);
  const destinations = staffDestinations.filter((item) =>
    allowedDestination({ page: item.page }, props.section, props.role),
  );
  const navItem = (item: (typeof staffDestinations)[number]) => {
    const Icon = icons[item.icon];
    const selected =
      props.view.page === item.page ||
      (props.view.page === "boyMarks" && item.page === "home");
    return (
      <button
        type="button"
        key={item.page}
        className={`bb-destination ${selected ? "is-selected" : ""}`}
        aria-current={selected ? "page" : undefined}
        onClick={() => props.onNavigate({ page: item.page })}
      >
        <Icon aria-hidden="true" size={23} />
        <span>
          {item.title === "Weekly Marks"
            ? "Marks"
            : item.title === "Dashboard"
              ? "Reports"
              : item.title}
        </span>
      </button>
    );
  };
  const initial =
    pathView(window.location.hash.replace(/^#!/, "")) || props.view;
  return (
    <Context.Provider value={props}>
      <div className="bb-staff-shell" data-section={props.section}>
        <a
          href="#staff-main"
          className="bb-skip-link external"
          onClick={(event) => {
            event.preventDefault();
            const main = document.querySelector<HTMLElement>(
              "#staff-main .page-current .bb-page-body",
            );
            if (main) {
              main.tabIndex = -1;
              main.focus();
            }
          }}
        >
          Skip to content
        </a>
        <aside
          className="bb-staff-sidebar"
          data-bb-app-surface
          aria-label="Staff navigation"
        >
          <img src={branding.bbLogo} alt="Boys’ Brigade" />
          <p className="bb-group-label">
            {props.section === "company" ? "Company" : "Junior"} Section
          </p>
          <nav>{destinations.map(navItem)}</nav>
          <NativeButton variant="plain" onClick={props.onSwitchSection}>
            Switch section
          </NativeButton>
          <NativeButton variant="plain" onClick={props.onSignOut}>
            <LogOut size={20} />
            Sign out
          </NativeButton>
        </aside>
        <NativeView
          ref={ref}
          id="staff-main"
          main
          className="bb-staff-view"
          url={
            allowedDestination(initial, props.section, props.role)
              ? viewPath(initial)
              : "/home/"
          }
          routes={routes}
          browserHistory
          browserHistorySeparator="#!"
          browserHistoryStoreHistory={false}
          iosSwipeBack={false}
          preloadPreviousPage={false}
          onViewInit={(native) => {
            if (native) {
              native.el.setAttribute("role", "main");
              const current = pathView(native.router.currentRoute.path);
              if (current) latest.current.onRouteChanged(current);
            }
            native?.router.on("routeChanged", (route: Router.Route) => {
              const view = pathView(route.path);
              if (view) latest.current.onRouteChanged(view);
            });
          }}
        />
        <Toolbar bottom tabbar className="bb-staff-tabs" data-bb-app-surface>
          <ToolbarPane>
            {destinations
              .filter((item) =>
                [
                  "home",
                  "weeklyMarks",
                  "dashboard",
                  "companyCalendar",
                  "settings",
                ].includes(item.page),
              )
              .map(navItem)}
          </ToolbarPane>
        </Toolbar>
      </div>
    </Context.Provider>
  );
}
