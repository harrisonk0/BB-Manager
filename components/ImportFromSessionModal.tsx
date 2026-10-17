import { NameWithRank } from "./RankBadge";
import React, { useEffect, useMemo, useState } from "react";
import {
  Boy,
  JuniorYear,
  SchoolYear,
  Section,
  SectionSquad,
  ToastType,
} from "../types";
import {
  buildImportCandidates,
  describeYearChange,
  importArchivedMembers,
  type ArchivedMemberSnapshot,
  type ImportCandidate,
} from "../services/importFromSession";
import {
  fetchArchivedMemberSnapshots,
  listBbSessions,
  type BbSession,
} from "../services/sessions";
import {
  formatSchoolYear,
  schoolYearsForSection,
  squadDisplayName,
} from "../services/sectionSquads";
import Modal from "./Modal";
import {
  NativeButton,
  NativeField,
  NativeSwitch,
  LoadingState,
  EmptyState,
  InlineNotice,
} from "./ui";
import "./reporting/reporting.css";

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
  const isCompany = activeSection === "company";
  const years = schoolYearsForSection(activeSection);

  const [sessions, setSessions] = useState<BbSession[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [archivedMembers, setArchivedMembers] = useState<
    ArchivedMemberSnapshot[]
  >([]);
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
          (initialSessionId && rows.some((row) => row.id === initialSessionId)
            ? initialSessionId
            : null) ||
          rows[0]?.id ||
          "";
        setSessionId(preferred);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load past sessions.";
        if (!cancelled) {
          showToast(message, "error");
          setSessions([]);
          setSessionId("");
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
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load archived members.";
        if (!cancelled) {
          showToast(message, "error");
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
          candidate.plan.status === "returning" ||
          candidate.plan.status === "promote"
            ? candidate.plan.year
            : candidate.sourceYear;
        next[candidate.archivedMemberId] = {
          selected: existing
            ? existing.selected && candidate.eligible
            : candidate.eligible,
          squad: existing?.squad ?? candidate.suggestedSquad,
          year: existing?.year ?? plannedYear,
          isSquadLeader:
            existing?.isSquadLeader ?? candidate.suggestedIsSquadLeader,
        };
      }
      return next;
    });
  }, [candidates]);

  const selectedCount = candidates.filter(
    (candidate) =>
      drafts[candidate.archivedMemberId]?.selected && candidate.eligible,
  ).length;
  const eligibleCount = candidates.filter(
    (candidate) => candidate.eligible,
  ).length;

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
        next[candidate.archivedMemberId] = {
          ...next[candidate.archivedMemberId],
          selected,
        };
      }
      return next;
    });
  };

  const handleImport = async () => {
    const selections = candidates
      .filter(
        (candidate) =>
          candidate.eligible && drafts[candidate.archivedMemberId]?.selected,
      )
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
      showToast("Select at least one boy to import.", "info");
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
          "success",
        );
      }
      if (result.skipped.length > 0) {
        showToast(result.skipped[0], "error");
      }
      if (result.importedNames.length > 0) {
        onClose();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to import members.";
      showToast(message, "error");
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
        className="bb-import-candidate"
        aria-disabled={!candidate.eligible || undefined}
      >
        <div className="bb-import-candidate-title">
          <input
            id={`import-${candidate.archivedMemberId}`}
            type="checkbox"
            checked={draft.selected}
            disabled={disabled}
            onChange={(event) =>
              updateDraft(candidate.archivedMemberId, {
                selected: event.target.checked,
              })
            }
            aria-label={`Import ${candidate.name}`}
          />
          <div>
            <h3>
              <label htmlFor={`import-${candidate.archivedMemberId}`}>
                <NameWithRank
                  name={candidate.name}
                  memberRank={candidate.memberRank}
                />
              </label>
            </h3>
            <p>{describeYearChange(candidate)}</p>
            {candidate.ineligibleReason && <p>{candidate.ineligibleReason}</p>}
          </div>
        </div>
        {candidate.eligible &&
          candidate.nameConflict &&
          !candidate.alreadyImported && (
            <InlineNotice>
              A member with this name is already on the live roster.
            </InlineNotice>
          )}
        {candidate.eligible && (
          <div className="bb-report-grid-fields">
            <NativeField
              label="Year"
              htmlFor={`year-${candidate.archivedMemberId}`}
            >
              <select
                id={`year-${candidate.archivedMemberId}`}
                value={String(draft.year)}
                disabled={isImporting}
                onChange={(event) =>
                  updateDraft(candidate.archivedMemberId, {
                    year: (isCompany
                      ? parseInt(event.target.value, 10)
                      : event.target.value) as SchoolYear | JuniorYear,
                  })
                }
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {formatSchoolYear(activeSection, year)}
                  </option>
                ))}
              </select>
            </NativeField>
            <NativeField
              label="Squad"
              htmlFor={`squad-${candidate.archivedMemberId}`}
            >
              <select
                id={`squad-${candidate.archivedMemberId}`}
                value={draft.squad}
                disabled={isImporting}
                onChange={(event) =>
                  updateDraft(candidate.archivedMemberId, {
                    squad: parseInt(event.target.value, 10),
                  })
                }
              >
                {destinationSquads.map((squad) => (
                  <option key={squad.number} value={squad.number}>
                    {squadDisplayName(destinationSquads, squad.number)}
                  </option>
                ))}
              </select>
            </NativeField>
            <div className="bb-check-row">
              <span>Squad leader</span>
              <NativeSwitch
                label={`Squad leader: ${candidate.name}`}
                checked={draft.isSquadLeader}
                disabled={isImporting}
                onChange={(checked) =>
                  updateDraft(candidate.archivedMemberId, {
                    isSquadLeader: checked,
                  })
                }
              />
            </div>
          </div>
        )}
      </li>
    );
  };
  return (
    <Modal
      isOpen={isOpen}
      dismissible={!isImporting}
      onClose={isImporting ? () => undefined : onClose}
      title="Import from a past session"
      size="lg"
    >
      <div className="bb-reports">
        <p className="bb-report-intro">
          Returning members move up one school year. Junior P7 joins Company as
          Year 8; Year 14 has left. Marks stay in Past Sessions.
        </p>
        {isLoadingList ? (
          <LoadingState label="Loading past sessions…" />
        ) : sessions.length === 0 ? (
          <EmptyState title="No past sessions">
            Archived sessions will appear here.
          </EmptyState>
        ) : (
          <>
            <NativeField label="Past session" htmlFor="import-past-session">
              <select
                id="import-past-session"
                className="bb-report-select"
                value={sessionId}
                disabled={isImporting}
                onChange={(event) => setSessionId(event.target.value)}
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.label}
                  </option>
                ))}
              </select>
            </NativeField>
            {isLoadingMembers ? (
              <LoadingState label="Loading members…" />
            ) : candidates.length === 0 ? (
              <EmptyState title="No members to review">
                Choose another past session.
              </EmptyState>
            ) : (
              <>
                <div className="bb-report-toolbar">
                  <p className="bb-report-intro" role="status">
                    {eligibleCount} eligible · {selectedCount} selected
                  </p>
                  <div className="bb-report-actions">
                    <NativeButton
                      variant="plain"
                      onClick={() => setEligibleSelected(true)}
                      disabled={isImporting || eligibleCount === 0}
                    >
                      Select eligible
                    </NativeButton>
                    <NativeButton
                      variant="plain"
                      onClick={() => setEligibleSelected(false)}
                      disabled={isImporting}
                    >
                      Clear
                    </NativeButton>
                  </div>
                </div>
                <ul className="bb-import-candidates">
                  {candidates.map(renderCandidate)}
                </ul>
              </>
            )}
          </>
        )}
        <div className="bb-report-actions">
          <NativeButton
            variant="secondary"
            onClick={onClose}
            disabled={isImporting}
          >
            Cancel
          </NativeButton>
          <NativeButton
            onClick={() => void handleImport()}
            disabled={selectedCount === 0 || isLoadingMembers || isLoadingList}
            busy={isImporting}
          >
            {isImporting
              ? "Importing…"
              : `Import ${selectedCount} ${selectedCount === 1 ? "member" : "members"}`}
          </NativeButton>
        </div>
      </div>
    </Modal>
  );
};
export default ImportFromSessionModal;
