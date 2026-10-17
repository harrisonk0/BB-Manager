import { NameWithRank } from "./RankBadge";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Boy, Section, SectionSettings, ToastType } from "../types";
import {
  NativeButton,
  EmptyState,
  LoadingState,
  GroupedList,
  SettingsRow,
  InlineNotice,
} from "./ui";
import "./reporting/reporting.css";
import {
  fetchArchivedBoys,
  listBbSessions,
  type BbSession,
} from "../services/sessions";
import ImportFromSessionModal from "./ImportFromSessionModal";
import { withSettingsSquads } from "../services/sectionSquads";

const SessionReportModal = React.lazy(() => import("./SessionReportModal"));

interface ArchivesPageProps {
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
  liveBoys: Boy[];
  settings: SectionSettings | null;
  refreshData: () => void | Promise<void>;
}

const formatClosedAt = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const ArchivesPage: React.FC<ArchivesPageProps> = ({
  activeSection,
  showToast,
  liveBoys,
  settings,
  refreshData,
}) => {
  const [sessions, setSessions] = useState<BbSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [archivedBoys, setArchivedBoys] = useState<Boy[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [listRetry, setListRetry] = useState(0);
  const [detailRetry, setDetailRetry] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const isCompany = activeSection === "company";
  const sectionLabel = isCompany ? "Company Section" : "Junior Section";

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      setIsLoadingList(true);
      setListError(null);
      try {
        const rows = await listBbSessions();
        if (!cancelled) {
          setSessions(rows);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load past sessions.";
        if (!cancelled) {
          setListError(message);
          showToast(message, "error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [showToast, listRetry]);

  useEffect(() => {
    if (!selectedSessionId) {
      setArchivedBoys([]);
      setDetailError(null);
      return;
    }

    let cancelled = false;

    const loadArchivedBoys = async () => {
      setIsLoadingSession(true);
      setDetailError(null);
      try {
        const boys = await fetchArchivedBoys(selectedSessionId, activeSection);
        if (!cancelled) {
          setArchivedBoys(boys);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load archived members.";
        if (!cancelled) {
          setDetailError(message);
          showToast(message, "error");
          setArchivedBoys([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSession(false);
        }
      }
    };

    void loadArchivedBoys();

    return () => {
      cancelled = true;
    };
  }, [activeSection, selectedSessionId, showToast, detailRetry]);

  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    for (const boy of archivedBoys) {
      const squadKey = String(boy.squad);
      if (!grouped[squadKey]) grouped[squadKey] = [];
      grouped[squadKey].push(boy);
    }
    return grouped;
  }, [archivedBoys]);

  const squadKeys = Object.keys(boysBySquad).sort(
    (left, right) => Number(left) - Number(right),
  );

  return (
    <div className="bb-reports">
      <div className="bb-report-toolbar">
        <p className="bb-report-intro">
          Read-only records for previous BB years. Showing {sectionLabel}.
        </p>
        {selectedSession && (
          <NativeButton
            variant="plain"
            onClick={() => setSelectedSessionId(null)}
          >
            Back to sessions
          </NativeButton>
        )}
      </div>
      {isLoadingList ? (
        <LoadingState label="Loading past sessions…" />
      ) : listError ? (
        <InlineNotice kind="error" title="Past sessions could not load">
          <p>{listError}</p>
          <NativeButton
            variant="secondary"
            onClick={() => setListRetry((value) => value + 1)}
          >
            Retry past sessions
          </NativeButton>
        </InlineNotice>
      ) : sessions.length === 0 ? (
        <EmptyState title="No past sessions yet">
          When a captain or administrator starts a new session, the closed
          roster and marks remain here.
        </EmptyState>
      ) : !selectedSession ? (
        <GroupedList
          title="Past sessions"
          footer="Session totals include both Company and Junior."
        >
          {sessions.map((session) => (
            <SettingsRow
              key={session.id}
              title={session.label}
              detail={
                <>
                  {formatClosedAt(session.closedAt)}
                  {session.closedByEmail ? ` · ${session.closedByEmail}` : ""}
                  <br />
                  {session.memberCount} members · {session.markCount} marks
                </>
              }
              onClick={() => setSelectedSessionId(session.id)}
            />
          ))}
        </GroupedList>
      ) : (
        <>
          <section className="bb-report-section">
            <h2>{selectedSession.label}</h2>
            <p className="bb-report-intro">
              Closed {formatClosedAt(selectedSession.closedAt)}
              {selectedSession.closedByEmail
                ? ` by ${selectedSession.closedByEmail}`
                : ""}
              . Showing {sectionLabel}.
            </p>
            <div className="bb-report-actions">
              <NativeButton
                onClick={() => setIsReportModalOpen(true)}
                disabled={
                  isLoadingSession || !!detailError || archivedBoys.length === 0
                }
              >
                Generate Master PDF
              </NativeButton>
              <NativeButton
                variant="secondary"
                onClick={() => setIsImportModalOpen(true)}
                disabled={
                  isLoadingSession || !!detailError || archivedBoys.length === 0
                }
              >
                Import into this year
              </NativeButton>
            </div>
          </section>
          {isLoadingSession ? (
            <LoadingState label="Loading archived members…" />
          ) : detailError ? (
            <InlineNotice kind="error" title="Archived members could not load">
              <p>{detailError}</p>
              <NativeButton
                variant="secondary"
                onClick={() => setDetailRetry((value) => value + 1)}
              >
                Retry archived members
              </NativeButton>
            </InlineNotice>
          ) : archivedBoys.length === 0 ? (
            <EmptyState title={`No ${sectionLabel} members in this archive`}>
              Try switching section to view the other roster.
            </EmptyState>
          ) : (
            <div className="bb-report-two">
              {squadKeys.map((squad) => (
                <section key={squad} className="bb-report-section">
                  <h2>Squad {squad}</h2>
                  <ul className="bb-report-roster">
                    {boysBySquad[squad].map((boy) => (
                      <li key={boy.id}>
                        <span className="bb-member-name">
                          <NameWithRank
                            name={boy.name}
                            memberRank={boy.memberRank}
                          />
                          {boy.isSquadLeader && (
                            <span className="bb-secondary"> · Leader</span>
                          )}
                        </span>
                        <span className="bb-report-value">
                          {boy.marks.length} marks
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
      {selectedSession && (
        <Suspense fallback={<LoadingState label="Loading report tools…" />}>
          <SessionReportModal
            boys={archivedBoys}
            activeSection={activeSection}
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            sessionLabel={selectedSession.label}
          />
        </Suspense>
      )}

      <ImportFromSessionModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeSection={activeSection}
        liveBoys={liveBoys}
        destinationSquads={withSettingsSquads(settings, activeSection)}
        showToast={showToast}
        refreshData={refreshData}
        initialSessionId={selectedSessionId}
      />
    </div>
  );
};

export default ArchivesPage;
