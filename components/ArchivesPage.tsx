import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Boy, Section, SectionSettings, ToastType } from '../types';
import { ArchiveBoxIcon, ArrowDownTrayIcon, ChartBarIcon, ClipboardDocumentListIcon } from './Icons';
import { fetchArchivedBoys, listBbSessions, type BbSession } from '../services/sessions';
import ImportFromSessionModal from './ImportFromSessionModal';
import { withSettingsSquads } from '../services/sectionSquads';

const SessionReportModal = React.lazy(() => import('./SessionReportModal'));

interface ArchivesPageProps {
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
  liveBoys: Boy[];
  settings: SectionSettings | null;
  refreshData: () => void | Promise<void>;
}

const formatClosedAt = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const ArchivesPage: React.FC<ArchivesPageProps> = ({ activeSection, showToast, liveBoys, settings, refreshData }) => {
  const [sessions, setSessions] = useState<BbSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [archivedBoys, setArchivedBoys] = useState<Boy[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const isCompany = activeSection === 'company';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const sectionLabel = isCompany ? 'Company Section' : 'Junior Section';

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      setIsLoadingList(true);
      try {
        const rows = await listBbSessions();
        if (!cancelled) {
          setSessions(rows);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load past sessions.';
        if (!cancelled) {
          showToast(message, 'error');
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
  }, [showToast]);

  useEffect(() => {
    if (!selectedSessionId) {
      setArchivedBoys([]);
      return;
    }

    let cancelled = false;

    const loadArchivedBoys = async () => {
      setIsLoadingSession(true);
      try {
        const boys = await fetchArchivedBoys(selectedSessionId, activeSection);
        if (!cancelled) {
          setArchivedBoys(boys);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load archived members.';
        if (!cancelled) {
          showToast(message, 'error');
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
  }, [activeSection, selectedSessionId, showToast]);

  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    for (const boy of archivedBoys) {
      const squadKey = String(boy.squad);
      if (!grouped[squadKey]) grouped[squadKey] = [];
      grouped[squadKey].push(boy);
    }
    return grouped;
  }, [archivedBoys]);

  const squadKeys = Object.keys(boysBySquad).sort((left, right) => Number(left) - Number(right));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Past Sessions</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Closed BB years keep their members and marks here. The live Home and Weekly Marks pages stay empty until you add the new session&apos;s roster.
            Reports below use the currently selected {sectionLabel}.
          </p>
        </div>
        {selectedSession && (
          <button
            type="button"
            onClick={() => setSelectedSessionId(null)}
            className="self-start rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            Back to session list
          </button>
        )}
      </div>

      {isLoadingList ? (
        <div className="rounded-lg bg-white p-8 text-center text-slate-500 shadow-md">Loading past sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg bg-white px-6 py-16 text-center shadow-md">
          <ArchiveBoxIcon className="mx-auto h-16 w-16 text-slate-400" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">No archived sessions yet</h2>
          <p className="mt-2 text-slate-500">
            When a captain or admin starts a new BB session from Settings, the previous roster is stored here instead of being deleted.
          </p>
        </div>
      ) : !selectedSession ? (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setSelectedSessionId(session.id)}
              className="w-full rounded-lg bg-white p-6 text-left shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className={`text-xl font-semibold ${accentText}`}>{session.label}</h2>
                  <p className="mt-1 text-sm text-slate-500">Closed {formatClosedAt(session.closedAt)}</p>
                  {session.closedByEmail && (
                    <p className="text-sm text-slate-500">Closed by {session.closedByEmail}</p>
                  )}
                </div>
                <div className="text-sm text-slate-600 sm:text-right">
                  <p>{session.memberCount} members archived</p>
                  <p>{session.markCount} marks archived</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className={`text-xl font-semibold ${accentText}`}>{selectedSession.label}</h2>
            <p className="mt-2 text-slate-600">
              Closed {formatClosedAt(selectedSession.closedAt)}
              {selectedSession.closedByEmail ? ` by ${selectedSession.closedByEmail}` : ''}. Showing {sectionLabel} members from this archive.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                disabled={isLoadingSession || archivedBoys.length === 0}
                className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'}`}
              >
                <ChartBarIcon className="mr-2 h-5 w-5" />
                Generate Master PDF
              </button>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                disabled={isLoadingSession || archivedBoys.length === 0}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="mr-2 h-5 w-5" />
                Import into this year
              </button>
            </div>
          </div>

          {isLoadingSession ? (
            <div className="rounded-lg bg-white p-8 text-center text-slate-500 shadow-md">Loading archived members...</div>
          ) : archivedBoys.length === 0 ? (
            <div className="rounded-lg bg-white px-6 py-12 text-center shadow-md">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No {sectionLabel} members in this archive</h3>
              <p className="mt-2 text-slate-500">Switch section from the user menu if this session was recorded on the other side.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {squadKeys.map((squad) => (
                <div key={squad} className="rounded-lg bg-white p-6 shadow-md">
                  <h3 className="text-lg font-semibold text-slate-800">Squad {squad}</h3>
                  <ul className="mt-4 space-y-2">
                    {boysBySquad[squad].map((boy) => (
                      <li key={boy.id} className="flex items-center justify-between text-sm text-slate-700">
                        <span>{boy.name}{boy.isSquadLeader ? ' (Leader)' : ''}</span>
                        <span className="text-slate-500">{boy.marks.length} marks</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSession && (
        <Suspense fallback={null}>
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
