import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import HomePage from "./components/HomePage";
import WeeklyMarksPage from "./components/WeeklyMarksPage";
import BoyMarksPage from "./components/BoyMarksPage";
import StaffShell from "./components/shell/StaffShell";
import { pathView, allowedDestination } from "./components/shell/navigation";
import { NativeButton, InlineNotice, LoadingState } from "./components/ui";
import LoginPage from "./components/LoginPage";
const PortalHomePage = lazy(() => import("./components/PortalHomePage"));
import PortalSetupPage from "./components/PortalSetupPage";
const CompanyCalendarPage = lazy(
  () => import("./components/CompanyCalendarPage"),
);
const PortalAccessPage = lazy(() => import("./components/PortalAccessPage"));
import { captureSetupLink } from "./services/portal";
const DashboardPage = lazy(() => import("./components/DashboardPage"));
import SettingsPage from "./components/SettingsPage";
const ArchivesPage = lazy(() => import("./components/ArchivesPage"));
import SectionSelectPage from "./components/SectionSelectPage";
import AccountSettingsPage from "./components/AccountSettingsPage";
import PasskeyEnrollmentGate from "./components/PasskeyEnrollmentGate";
import Toast from "./components/Toast";
import { View, BoyMarksPageView } from "./types";
import { branding } from "./components/branding";
import Modal from "./components/Modal";
import { clearStoredSection } from "@/hooks/sectionStorage";

import { useToastNotifications } from "@/hooks/useToastNotifications";
import { useAuthAndRole } from "@/hooks/useAuthAndRole";
import { useSectionManagement } from "@/hooks/useSectionManagement";
import { useAppData } from "@/hooks/useAppData";
import { useUnsavedChangesProtection } from "@/hooks/useUnsavedChangesProtection";
import {
  listPasskeys,
  retireRememberedPasswordAfterPasskey,
} from "@/services/supabaseAuth";
import { browserSupportsPasskeys } from "@/services/passkeyErrors";
import {
  hasRememberedPassword,
  isPasskeyEnrollmentRequired,
  resolvePasskeyGateDecision,
  setPasskeyMigrationNotice,
} from "@/services/passkeyMigration";

const PASSKEY_NUDGE_STORAGE_KEY = "bb-passkey-nudge-dismissed";

type PasskeyGateStatus = "ready" | "checking" | "required" | "error";

const App: React.FC<{ initialSetup?: ReturnType<typeof captureSetupLink> }> = ({
  initialSetup = null,
}) => {
  const {
    currentUser,
    userRole,
    noRoleError,
    authLoading,
    passwordRecovery,
    performSignOut,
    completePasswordRecovery,
    setUserRole,
  } = useAuthAndRole();

  const [portalSetup, setPortalSetup] = useState(initialSetup);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [view, setView] = useState<View>(
    () => pathView(window.location.hash.replace(/^#!/, "")) || { page: "home" },
  );
  const [showPasskeyNudge, setShowPasskeyNudge] = useState(false);
  const [passkeyGate, setPasskeyGate] = useState<PasskeyGateStatus>(() =>
    isPasskeyEnrollmentRequired() ? "checking" : "ready",
  );
  const [passkeyGateRetry, setPasskeyGateRetry] = useState(0);
  const [passkeyGateIdentity, setPasskeyGateIdentity] = useState<string | null>(
    null,
  );
  const {
    activeSection,
    setActiveSection,
    handleSelectSection,
    performSwitchSection,
  } = useSectionManagement(setView);
  const { toasts, showToast, removeToast } = useToastNotifications(
    `${currentUser?.id || "public"}:${userRole || ""}:${activeSection || ""}`,
  );
  const { boys, settings, dataLoading, dataError, refreshData, setSettings } =
    useAppData(
      userRole && userRole !== "boy" ? activeSection : null,
      showToast,
      userRole && userRole !== "boy" ? currentUser : null,
    );
  const {
    setView: navigateWithProtection,
    confirmModalType,
    confirmAction,
    cancelAction,
    guardNavigation,
    handleSwitchSection: handleSwitchSectionWithProtection,
    handleSignOut: handleSignOutWithProtection,
  } = useUnsavedChangesProtection(
    view,
    setView,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    performSwitchSection,
    performSignOut,
  );

  const staffRouteAllowed =
    !activeSection ||
    !userRole ||
    userRole === "boy" ||
    allowedDestination(view, activeSection, userRole);
  useEffect(() => {
    if (!staffRouteAllowed) {
      // Validate incoming role/section URLs before mounting the protected router.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search + "#!/home/",
      );
      setView({ page: "home" });
    }
  }, [staffRouteAllowed]);
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [currentUser?.id, userRole, activeSection]);
  const previousPrincipal = useRef<string | null>(null);
  useEffect(() => {
    if (
      previousPrincipal.current &&
      previousPrincipal.current !== currentUser?.id
    ) {
      // Security-boundary sanitation only: mounted Framework7 remains the history owner.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      setView({ page: "home" });
    }
    previousPrincipal.current = currentUser?.id || null;
  }, [currentUser?.id]);

  useEffect(() => {
    if (noRoleError) {
      setActiveSection(null);
      setUserRole(null);
      clearStoredSection();
    }
  }, [noRoleError, setActiveSection, setUserRole]);

  useEffect(() => {
    if (!currentUser || passwordRecovery) {
      if (!currentUser) {
        setPasskeyGateIdentity(null);
        setPasskeyGate(isPasskeyEnrollmentRequired() ? "checking" : "ready");
      }
      return;
    }
    if (!userRole || userRole === "boy" || portalSetup) {
      setPasskeyGate("ready");
      return;
    }
    if (!isPasskeyEnrollmentRequired()) {
      setPasskeyGate("ready");
      return;
    }

    let cancelled = false;
    setPasskeyGate("checking");
    setPasskeyGateIdentity(currentUser.id);

    void (async () => {
      try {
        const passkeys = await listPasskeys();
        if (cancelled) {
          return;
        }
        const decision = resolvePasskeyGateDecision({
          enrollmentRequired: true,
          passkeyCount: passkeys.length,
          hasRememberedPassword: hasRememberedPassword(),
        });
        if (decision.action === "sign-out-for-password-login") {
          setPasskeyMigrationNotice();
          await performSignOut();
          return;
        }
        if (decision.action === "require-enrollment") {
          setPasskeyGate("required");
          return;
        }
        const result = await retireRememberedPasswordAfterPasskey();
        if (cancelled) {
          return;
        }
        if (!result.retired && hasRememberedPassword()) {
          setPasskeyGate("required");
          return;
        }
        if (!result.retired && result.error) {
          showToast(
            `Could not turn off password sign-in: ${result.error}`,
            "error",
          );
        }
        setPasskeyGate("ready");
      } catch {
        if (!cancelled) {
          setPasskeyGate("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    userRole,
    portalSetup,
    passwordRecovery,
    passkeyGateRetry,
    performSignOut,
    showToast,
  ]);

  useEffect(() => {
    if (
      !currentUser ||
      userRole === "boy" ||
      portalSetup ||
      passwordRecovery ||
      isPasskeyEnrollmentRequired() ||
      !browserSupportsPasskeys()
    ) {
      setShowPasskeyNudge(false);
      return;
    }
    if (sessionStorage.getItem(PASSKEY_NUDGE_STORAGE_KEY) === "1") {
      setShowPasskeyNudge(false);
      return;
    }

    let cancelled = false;
    void listPasskeys()
      .then((passkeys) => {
        if (!cancelled) {
          setShowPasskeyNudge(passkeys.length === 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowPasskeyNudge(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, userRole, portalSetup, passwordRecovery]);

  const renderMainContent = (routeView: View = view) => {
    if (!activeSection) return null;

    switch (routeView.page) {
      case "home":
        return (
          <HomePage
            boys={boys}
            setView={navigateWithProtection}
            refreshData={refreshData}
            activeSection={activeSection}
            showToast={showToast}
            settings={settings}
          />
        );
      case "companyCalendar":
        return activeSection === "company" ? (
          <CompanyCalendarPage showToast={showToast} />
        ) : null;
      case "portalAccess":
        return activeSection === "company" ? (
          <PortalAccessPage boys={boys} showToast={showToast} />
        ) : null;
      case "weeklyMarks":
        return (
          <WeeklyMarksPage
            boys={boys}
            refreshData={refreshData}
            setHasUnsavedChanges={setHasUnsavedChanges}
            activeSection={activeSection}
            settings={settings}
            showToast={showToast}
          />
        );
      case "dashboard":
        return (
          <DashboardPage
            boys={boys}
            activeSection={activeSection}
            settings={settings}
          />
        );
      case "archives":
        return (
          <ArchivesPage
            activeSection={activeSection}
            showToast={showToast}
            liveBoys={boys}
            settings={settings}
            refreshData={refreshData}
          />
        );
      case "settings":
        return (
          <SettingsPage
            activeSection={activeSection}
            currentSettings={settings}
            onSettingsSaved={setSettings}
            showToast={showToast}
            userRole={userRole}
            onNavigateToAccountSettings={() =>
              navigateWithProtection({ page: "accountSettings" })
            }
            refreshData={refreshData}
            onNavigateToArchives={() =>
              navigateWithProtection({ page: "archives" })
            }
            boys={boys}
          />
        );
      case "accountSettings":
        return (
          <AccountSettingsPage
            showToast={showToast}
            activeSection={activeSection}
          />
        );
      case "boyMarks": {
        const boyMarksView = routeView as BoyMarksPageView;
        return (
          <BoyMarksPage
            boyId={boyMarksView.boyId}
            refreshData={refreshData}
            setHasUnsavedChanges={setHasUnsavedChanges}
            activeSection={activeSection}
            showToast={showToast}
            onBack={() => navigateWithProtection({ page: "home" })}
          />
        );
      }
      default:
        return (
          <HomePage
            boys={boys}
            setView={navigateWithProtection}
            refreshData={refreshData}
            activeSection={activeSection}
            showToast={showToast}
            settings={settings}
          />
        );
    }
  };

  const renderApp = () => {
    if (portalSetup)
      return (
        <PortalSetupPage
          setup={portalSetup}
          onComplete={() => setPortalSetup(null)}
        />
      );
    if (authLoading) {
      return (
        <div className="bb-auth-page">
          <LoadingState label="Loading your workspace…" />
        </div>
      );
    }

    if (!currentUser) {
      return <LoginPage />;
    }

    if (!userRole && !noRoleError)
      return (
        <div className="bb-auth-page">
          <LoadingState label="Checking account access…" />
        </div>
      );

    if (userRole === "boy")
      return (
        <Suspense fallback={<LoadingState label="Opening your Company…" />}>
          <PortalHomePage
            key={`${currentUser.id}:boy`}
            onSignOut={() => void performSignOut()}
            showToast={showToast}
          />
        </Suspense>
      );

    if (passwordRecovery) {
      return (
        <AccountSettingsPage
          showToast={showToast}
          activeSection={activeSection ?? "company"}
          recoveryMode
          onRecoveryComplete={completePasswordRecovery}
        />
      );
    }

    if (noRoleError)
      return (
        <main className="bb-auth-page">
          <div className="bb-auth-content">
            <img
              src={branding.bbLogo}
              alt="The Boys’ Brigade"
              className="bb-auth-brand"
            />
            <h1 className="bb-auth-heading">Access denied</h1>
            <InlineNotice kind="error">{noRoleError}</InlineNotice>
            <p className="bb-secondary">
              Please ensure your email address is registered with an
              administrator.
            </p>
            <NativeButton onClick={() => void performSignOut()}>
              Return to Login
            </NativeButton>
          </div>
        </main>
      );

    if (
      passkeyGate === "checking" ||
      (isPasskeyEnrollmentRequired() && passkeyGateIdentity !== currentUser.id)
    ) {
      return (
        <div className="bb-auth-page">
          <LoadingState label="Loading your workspace…" />
        </div>
      );
    }

    if (passkeyGate === "error")
      return (
        <main className="bb-auth-page">
          <div className="bb-auth-content">
            <img
              src={branding.bbLogo}
              alt="The Boys’ Brigade"
              className="bb-auth-brand"
            />
            <h1 className="bb-auth-heading">Could not check passkeys</h1>
            <InlineNotice kind="error">
              The live site could not confirm whether this account has a passkey
              yet.
            </InlineNotice>
            <div className="bb-auth-actions">
              <NativeButton
                onClick={() => setPasskeyGateRetry((count) => count + 1)}
              >
                Try again
              </NativeButton>
              <NativeButton
                variant="secondary"
                onClick={() => void performSignOut()}
              >
                Sign out
              </NativeButton>
            </div>
          </div>
        </main>
      );

    if (passkeyGate === "required") {
      return (
        <PasskeyEnrollmentGate
          onComplete={() => setPasskeyGate("ready")}
          onSignOut={() => {
            void performSignOut();
          }}
        />
      );
    }

    if (currentUser && dataLoading) {
      return (
        <div className="bb-auth-page">
          <LoadingState label="Loading your workspace…" />
        </div>
      );
    }

    if (!activeSection) {
      return (
        <SectionSelectPage
          onSelectSection={handleSelectSection}
          onSignOut={handleSignOutWithProtection}
        />
      );
    }

    if (dataError) {
      return (
        <div className="bb-auth-page">
          <div className="bb-auth-content">
            <InlineNotice kind="error">{dataError}</InlineNotice>
            <NativeButton onClick={() => void refreshData()}>
              Try again
            </NativeButton>
            <NativeButton variant="plain" onClick={handleSignOutWithProtection}>
              Sign out
            </NativeButton>
          </div>
        </div>
      );
    }

    if (!staffRouteAllowed)
      return <LoadingState label="Opening your workspace…" />;

    return (
      <StaffShell
        key={`${currentUser.id}:${userRole}:${activeSection}`}
        view={view}
        section={activeSection}
        role={userRole}
        user={currentUser}
        onNavigate={navigateWithProtection}
        onRouteChanged={setView}
        guardNavigation={guardNavigation}
        onSwitchSection={handleSwitchSectionWithProtection}
        onSignOut={handleSignOutWithProtection}
        renderContent={(route) => (
          <Suspense fallback={<LoadingState label="Opening page…" />}>
            {renderMainContent(route)}
          </Suspense>
        )}
        banner={
          showPasskeyNudge ? (
            <InlineNotice title="Sign in with a passkey">
              <p>
                Add a passkey in Account Settings to sign in without a password.
              </p>
              <NativeButton
                variant="plain"
                onClick={() => {
                  sessionStorage.setItem(PASSKEY_NUDGE_STORAGE_KEY, "1");
                  setShowPasskeyNudge(false);
                  navigateWithProtection({ page: "accountSettings" });
                }}
              >
                Open Account Settings
              </NativeButton>
              <NativeButton
                variant="plain"
                onClick={() => {
                  sessionStorage.setItem(PASSKEY_NUDGE_STORAGE_KEY, "1");
                  setShowPasskeyNudge(false);
                }}
              >
                Dismiss
              </NativeButton>
            </InlineNotice>
          ) : undefined
        }
      />
    );
  };

  return (
    <div className="bb-app-root" data-section={activeSection || "company"}>
      <div className="bb-toast-region">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </div>

      {renderApp()}

      <Modal
        isOpen={!!confirmModalType}
        onClose={cancelAction}
        title="Unsaved Changes"
      >
        <p>You have unsaved changes. Leave this page and discard them?</p>
        <div className="bb-auth-actions">
          <NativeButton variant="secondary" onClick={cancelAction}>
            Stay
          </NativeButton>
          <NativeButton danger onClick={confirmAction}>
            Leave
          </NativeButton>
        </div>
      </Modal>
    </div>
  );
};

export default App;
