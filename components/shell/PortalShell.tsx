import React, { createContext, useContext, useState } from "react";
import {
  View,
  Page,
  Navbar,
  Toolbar,
  ToolbarPane,
  Link,
} from "framework7-react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  House,
  Settings,
} from "lucide-react";
import { PageBody } from "../ui";
import { branding } from "../branding";

export type PortalDestination = "home" | "calendar" | "squad" | "account";
const paths: Record<PortalDestination, string> = {
  home: "/portal/",
  calendar: "/portal/calendar/",
  squad: "/portal/squad/",
  account: "/portal/account/",
};
const titles: Record<PortalDestination, string> = {
  home: "My Company",
  calendar: "Calendar",
  squad: "My squad",
  account: "Account",
};
type Navigate = (page: PortalDestination) => void;
interface PortalShellProps {
  squadLeader: boolean;
  render: (page: PortalDestination, navigate: Navigate) => React.ReactNode;
}
const Content = createContext<
  (PortalShellProps & { setActive: (page: PortalDestination) => void }) | null
>(null);
function PortalRoute({
  f7route,
  f7router,
}: {
  f7route: { path: string };
  f7router: { navigate: (path: string) => void };
}) {
  const context = useContext(Content)!;
  const page =
    (Object.keys(paths) as PortalDestination[]).find(
      (key) => paths[key] === f7route.path,
    ) || "home";
  const tabs = [
    { id: "home" as const, Icon: House, label: "Home" },
    { id: "calendar" as const, Icon: CalendarDays, label: "Calendar" },
    ...(context.squadLeader
      ? [{ id: "squad" as const, Icon: ChartNoAxesCombined, label: "My squad" }]
      : []),
    { id: "account" as const, Icon: Settings, label: "Account" },
  ];
  return (
    <Page
      className="bb-page"
      onPageInit={() => context.setActive(page)}
      onPageAfterIn={(entry) => {
        context.setActive(page);
        document.title = `${titles[page]} · BB Manager`;
        const heading = entry.el.querySelector(
          ".bb-page-body h1",
        ) as HTMLElement | null;
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }}
      onPageBeforeIn={(entry) => {
        entry.el.inert = false;
      }}
      onPageBeforeOut={(entry) => {
        entry.el.inert = true;
      }}
    >
      <Navbar large largeTransparent title={titles[page]} data-bb-app-surface />
      <PageBody>
        <h1 className="bb-sr-only">{titles[page]}</h1>
        <div className="bb-portal-content" role="main" data-bb-app-surface>
          {context.render(page, (destination) =>
            f7router.navigate(paths[destination]),
          )}
        </div>
      </PageBody>
      <Toolbar bottom tabbar className="bb-portal-tabs" data-bb-app-surface>
        <ToolbarPane>
          {tabs.map(({ id, Icon, label }) => (
            <Link
              key={id}
              href={paths[id]}
              className={`tab-link ${page === id ? "tab-link-active" : ""}`}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </ToolbarPane>
      </Toolbar>
    </Page>
  );
}
const routes = [
  ...Object.values(paths).map((path) => ({ path, component: PortalRoute })),
  { path: "(.*)", redirect: paths.home },
];
/** The protected portal owns one real Framework7 router; root identity keys destroy its cached pages. */
export default function PortalShell(props: PortalShellProps) {
  const [active, setActive] = useState<PortalDestination>("home");
  const initial =
    typeof location !== "undefined" &&
    Object.values(paths).includes(location.hash.replace(/^#!/, ""))
      ? location.hash.replace(/^#!/, "")
      : paths.home;
  return (
    <Content.Provider value={{ ...props, setActive }}>
      <div className="bb-portal-shell">
        <a
          href="#portal-main"
          className="bb-portal-skip external"
          onClick={(event) => {
            event.preventDefault();
            const main = document.querySelector<HTMLElement>(
              '.bb-portal-shell .page-current [role="main"]',
            );
            if (main) {
              main.tabIndex = -1;
              main.focus({ preventScroll: true });
            }
          }}
        >
          Skip to content
        </a>
        <aside className="bb-portal-sidebar" data-bb-app-surface>
          <div className="bb-portal-sidebar-brand">
            <img src={branding.bbLogo} alt="The Boys’ Brigade" />
            <span>Company Section</span>
          </div>
          <nav aria-label="Company portal">
            {(Object.keys(paths) as PortalDestination[])
              .filter((key) => key !== "squad" || props.squadLeader)
              .map((key) => (
                <Link
                  key={key}
                  href={paths[key]}
                  aria-current={active === key ? "page" : undefined}
                >
                  {titles[key]}
                </Link>
              ))}
          </nav>
        </aside>
        <View
          id="portal-main"
          main
          url={initial}
          routes={routes}
          browserHistory
          browserHistorySeparator="#!"
          browserHistoryStoreHistory={false}
          browserHistoryAnimate
          browserHistoryInitialMatch
        />
      </div>
    </Content.Provider>
  );
}
