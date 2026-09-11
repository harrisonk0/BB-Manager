import React, { useEffect, useMemo, useState } from 'react';
import { Boy, JuniorYear, SchoolYear, Section, SectionSquad, ToastType } from '../types';
import {
  buildImportCandidates,
  describeYearChange,
  importArchivedMembers,
  type ArchivedMemberSnapshot,
  type ImportCandidate,
} from '../services/importFromSession';
import { fetchArchivedMemberSnapshots, listBbSessions, type BbSession } from '../services/sessions';
import { formatSchoolYear, schoolYearsForSection, squadDisplayName } from '../services/sectionSquads';
import Modal from './Modal';

type DraftRow = {
  selected: boolean;
  squad: number;
  year: SchoolYear | JuniorYear;
  isSquadLeader: boolean;
};

interface ImportFromSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: Section;
  liveBoys: Boy[];
  destinationSquads: SectionSquad[];
  showToast: (message: string, type?: ToastType) => void;
  refreshData: () => void | Promise<void>;
  initialSessionId?: string | null;
}

const ImportFromSessionModal: React.FC<ImportFromSessionModalProps> = ({
  isOpen,
  onClose,
  activeSection,
  liveBoys,
  destinationSquads,
  showToast,
  refreshData,
  initialSessionId = null,
}) => {
  const isCompany = activeSection === 'company';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const years = schoolYearsForSection(activeSection);

  const [sessions, setSessions] = useState<BbSession[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [archivedMembers, setArchivedMembers] = useState<ArchivedMemberSnapshot[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const candidates = useMemo(
    () =>
      buildImportCandidates({
        activeSection,
        archivedMembers,
        liveBoys,
        destinationSquads,
      }),
    [activeSection, archivedMembers, destinationSquads, liveBoys],
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoadingList(true);

    const load = async () => {
      try {
        const rows = await listBbSessions();
        if (cancelled) return;
        setSessions(rows);
        const preferred =
          (initialSessionId && rows.some((row) => row.id === initialSessionId) ? initialSessionId : null) ||
          rows[0]?.id ||
          '';
        setSessionId(preferred);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load past sessions.';
        if (!cancelled) {
          showToast(message, 'error');
          setSessions([]);
          setSessionId('');
        }
      } finally {
        if (!cancelled) setIsLoadingList(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialSessionId, isOpen, showToast]);

  useEffect(() => {
    if (!isOpen || !sessionId) {
      setArchivedMembers([]);
      setDrafts({});
      return;
    }

    let cancelled = false;
    setIsLoadingMembers(true);

    const loadMembers = async () => {
      try {
        const rows = await fetchArchivedMemberSnapshots(sessionId);
        if (cancelled) return;
        setArchivedMembers(rows);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load archived members.';
        if (!cancelled) {
          showToast(message, 'error');
          setArchivedMembers([]);
        }
      } finally {
        if (!cancelled) setIsLoadingMembers(false);
      }
    };

    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [isOpen, sessionId, showToast]);

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, DraftRow> = {};
      for (const candidate of candidates) {
        const existing = current[candidate.archivedMemberId];
        const plannedYear =
          candidate.plan.status === 'returning' || candidate.plan.status === 'promote'
            ? candidate.plan.year
            : candidate.sourceYear;
        next[candidate.archivedMemberId] = {
          selected: existing ? existing.selected && candidate.eligible : candidate.eligible,
          squad: existing?.squad ?? candidate.suggestedSquad,
          year: existing?.year ?? plannedYear,
          isSquadLeader: existing?.isSquadLeader ?? candidate.suggestedIsSquadLeader,
        };
      }
      return next;
    });
  }, [candidates]);

  const selectedCount = candidates.filter((candidate) => drafts[candidate.archivedMemberId]?.selected && candidate.eligible).length;
  const eligibleCount = candidates.filter((candidate) => candidate.eligible).length;

  const updateDraft = (id: string, patch: Partial<DraftRow>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  const setEligibleSelected = (selected: boolean) => {
    setDrafts((current) => {
      const next = { ...current };
      for (const candidate of candidates) {
        if (!candidate.eligible || !next[candidate.archivedMemberId]) continue;
        next[candidate.archivedMemberId] = { ...next[candidate.archivedMemberId], selected };
      }
      return next;
    });
  };

  const handleImport = async () => {
    const selections = candidates
      .filter((candidate) => candidate.eligible && drafts[candidate.archivedMemberId]?.selected)
      .map((candidate) => {
        const draft = drafts[candidate.archivedMemberId];
        return {
          archivedMemberId: candidate.archivedMemberId,
          squad: draft.squad,
          year: draft.year,
          isSquadLeader: draft.isSquadLeader,
        };
      });

    if (selections.length === 0) {
      showToast('Select at least one boy to import.', 'info');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importArchivedMembers({
        activeSection,
        archivedMembers,
        selections,
      });
      await refreshData();
      if (result.importedNames.length > 0) {
        showToast(
          result.importedNames.length === 1
            ? `Imported ${result.importedNames[0]} into this year’s roster.`
            : `Imported ${result.importedNames.length} boys into this year’s roster.`,
          'success',
        );
      }
      if (result.skipped.length > 0) {
        showToast(result.skipped[0], 'error');
      }
      if (result.importedNames.length > 0) {
        onClose();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to import members.';
      showToast(message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const renderCandidate = (candidate: ImportCandidate) => {
    const draft = drafts[candidate.archivedMemberId];
    if (!draft) return null;
    const disabled = !candidate.eligible || isImporting;

    return (
      <li
        key={candidate.archivedMemberId}
        className={`rounded-md border px-3 py-3 ${candidate.eligible ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={draft.selected}
            disabled={disabled}
            onChange={(event) => updateDraft(candidate.archivedMemberId, { selected: event.target.checked })}
            aria-label={`Import ${candidate.name}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-slate-800">{candidate.name}</p>
              <p className="text-sm text-slate-500">{describeYearChange(candidate)}</p>
            </div>
            {candidate.ineligibleReason && (
              <p className="mt-1 text-sm text-slate-500">{candidate.ineligibleReason}</p>
            )}
            {candidate.eligible && candidate.nameConflict && !candidate.alreadyImported && (
              <p className="mt-1 text-sm text-amber-700">A boy with this name is already on the live roster.</p>
            )}
            {candidate.eligible && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-sm text-slate-600">
                  Year
                  <select
                    value={String(draft.year)}
                    disabled={isImporting}
                    onChange={(event) => {
                      const value = isCompany ? parseInt(event.target.value, 10) : event.target.value;
                      updateDraft(candidate.archivedMemberId, { year: value as SchoolYear | JuniorYear });
                    }}
                    className={`mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm ${accentRing}`}
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {formatSchoolYear(activeSection, year)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-600">
                  Squad
                  <select
                    value={draft.squad}
                    disabled={isImporting}
                    onChange={(event) =>
                      updateDraft(candidate.archivedMemberId, { squad: parseInt(event.target.value, 10) })
                    }
                    className={`mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm ${accentRing}`}
                  >
                    {destinationSquads.map((squad) => (
                      <option key={squad.number} value={squad.number}>
                        {squadDisplayName(destinationSquads, squad.number)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={draft.isSquadLeader}
                    disabled={isImporting}
                    onChange={(event) =>
                      updateDraft(candidate.archivedMemberId, { isSquadLeader: event.target.checked })
                    }
                  />
                  Squad leader
                </label>
              </div>
            )}
          </div>
        </label>
      </li>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={isImporting ? () => undefined : onClose} title="Import from a past session" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Returning boys come onto this year’s roster with school year moved on by one. Marks stay in Past Sessions.
          Junior P7 join Company as Year 8. Year 14 have left.
        </p>
        {isLoadingList ? (
          <p className="text-sm text-slate-500">Loading past sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">There are no archived sessions to import from yet.</p>
        ) : (
          <>
            <label className="block text-sm font-medium text-slate-700">
              Past session
              <select
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                disabled={isImporting}
                className={`mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm ${accentRing}`}
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.label}
                  </option>
                ))}
              </select>
            </label>
            {isLoadingMembers ? (
              <p className="text-sm text-slate-500">Loading members...</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-slate-500">That session has no members to review.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-slate-600">
                    {eligibleCount} can join this section
                    {selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                      onClick={() => setEligibleSelected(true)}
                      disabled={isImporting || eligibleCount === 0}
                    >
                      Select all who can join
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                      onClick={() => setEligibleSelected(false)}
                      disabled={isImporting}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {candidates.map(renderCandidate)}
                </ul>
              </>
            )}
          </>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleImport(); }}
            disabled={isImporting || selectedCount === 0}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${accentBg} hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isImporting ? 'Importing...' : selectedCount === 1 ? 'Import 1 boy' : `Import ${selectedCount} boys`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportFromSessionModal;
