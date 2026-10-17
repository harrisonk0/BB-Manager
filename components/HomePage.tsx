import {
  NativeButton,
  NativeSearch,
  NativeField,
  GroupedList,
  EmptyState,
} from "./ui";
import "./staff/staff.css";
import { NameWithRank } from "./RankBadge";
import React, { useState, useMemo, useEffect } from "react";
import {
  Boy,
  View,
  Section,
  ToastType,
  SortByType,
  SchoolYear,
  JuniorYear,
  SectionSettings,
} from "../types";
import Modal from "./Modal";
import BoyForm from "./BoyForm";
import ImportFromSessionModal from "./ImportFromSessionModal";
import { PencilIcon, PlusIcon, TrashIcon, FilterIcon } from "./Icons";
import { deleteBoyById } from "../services/db";
import { readRosterFilters, writeRosterFilters } from "../hooks/rosterFilters";
import {
  formatSchoolYear,
  rosterSquadNumbers,
  squadDisplayName,
  withSettingsSquads,
} from "../services/sectionSquads";

interface HomePageProps {
  /** The list of all boys for the active section. */
  boys: Boy[];
  /** Function to navigate to a different view. */
  setView: (view: View) => void;
  /** Callback to trigger a refresh of the boys data from the database. */
  refreshData: () => void;
  /** The currently active section. */
  activeSection: Section;
  /** Function to display a toast notification. */
  showToast: (message: string, type?: ToastType) => void;
  /** Section settings, including the configured squad list. */
  settings: SectionSettings | null;
}

const HomePage: React.FC<HomePageProps> = ({
  boys,
  setView,
  refreshData,
  activeSection,
  showToast,
  settings,
}) => {
  // --- STATE MANAGEMENT ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boyToEdit, setBoyToEdit] = useState<Boy | null>(null);
  const [boyToDelete, setBoyToDelete] = useState<Boy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditorBusy, setIsEditorBusy] = useState(false);
  const [isEditorDirty, setIsEditorDirty] = useState(false);

  const initialFilters = readRosterFilters(activeSection);
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortByType>(initialFilters.sortBy);
  const [filterSquad, setFilterSquad] = useState<string>(
    initialFilters.filterSquad,
  );
  const [filterYear, setFilterYear] = useState<string>(
    initialFilters.filterYear,
  );

  const isCompany = activeSection === "company";
  const configuredSquads = useMemo(
    () => withSettingsSquads(settings, activeSection),
    [settings, activeSection],
  );

  useEffect(() => {
    const stored = readRosterFilters(activeSection);
    setSearchQuery(stored.searchQuery);
    setSortBy(stored.sortBy);
    setFilterSquad(stored.filterSquad);
    setFilterYear(stored.filterYear);
  }, [activeSection]);

  useEffect(() => {
    writeRosterFilters(activeSection, {
      searchQuery,
      sortBy,
      filterSquad,
      filterYear,
    });
  }, [activeSection, searchQuery, sortBy, filterSquad, filterYear]);

  // --- UTILITY FUNCTIONS ---
  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce(
      (total, mark) => total + (mark.score > 0 ? mark.score : 0),
      0,
    );
  };

  const calculateAttendancePercentage = (boy: Boy) => {
    if (boy.marks.length === 0) return 0;
    const attendedCount = boy.marks.filter((m) => m.score >= 0).length;
    return Math.round((attendedCount / boy.marks.length) * 100);
  };

  // --- MEMOIZED COMPUTATIONS ---
  const { uniqueYears, uniqueSquads } = useMemo(() => {
    const years = new Set<SchoolYear | JuniorYear>();
    boys.forEach((boy) => {
      years.add(boy.year);
    });
    const sortedYears = Array.from(years).sort((a, b) =>
      String(b).localeCompare(String(a), undefined, { numeric: true }),
    );
    return {
      uniqueYears: sortedYears,
      uniqueSquads: rosterSquadNumbers(configuredSquads, boys),
    };
  }, [boys, configuredSquads]);

  /**
   * Memoized filtering of boys. This is a key performance optimization.
   */
  const filteredBoys = useMemo(() => {
    return boys
      .filter(
        (boy) => filterSquad === "all" || String(boy.squad) === filterSquad,
      )
      .filter((boy) => filterYear === "all" || String(boy.year) === filterYear)
      .filter(
        (boy) =>
          !searchQuery.trim() ||
          boy.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
      );
  }, [boys, searchQuery, filterSquad, filterYear]);

  /**
   * Memoized grouping and sorting of boys by squad. Sorting is now handled within each squad.
   */
  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    filteredBoys.forEach((boy) => {
      if (!grouped[boy.squad]) {
        grouped[boy.squad] = [];
      }
      grouped[boy.squad].push(boy);
    });

    // Sort members within each squad based on the selected sort criteria
    for (const squad in grouped) {
      grouped[squad].sort((a, b) => {
        switch (sortBy) {
          case "marks":
            return (
              calculateTotalMarks(b) - calculateTotalMarks(a) ||
              a.name.localeCompare(b.name)
            );
          case "attendance":
            return (
              calculateAttendancePercentage(b) -
                calculateAttendancePercentage(a) || a.name.localeCompare(b.name)
            );
          case "name": // Default sort
          default:
            // Sort by School Year (descending), then by Name (ascending)
            const yearCompare = String(b.year).localeCompare(
              String(a.year),
              undefined,
              { numeric: true },
            );
            if (yearCompare !== 0) return yearCompare;
            return a.name.localeCompare(b.name);
        }
      });
    }

    return grouped;
  }, [filteredBoys, sortBy]);

  const squadStats = useMemo(() => {
    const stats: Record<string, { totalMarks: number; avgAttendance: number }> =
      {};

    Object.keys(boysBySquad).forEach((squad) => {
      const squadBoys = boysBySquad[squad];
      stats[squad] = {
        totalMarks: squadBoys.reduce(
          (total, boy) => total + calculateTotalMarks(boy),
          0,
        ),
        avgAttendance: (() => {
          const totalPossibleAttendances = squadBoys.reduce(
            (acc, boy) => acc + boy.marks.length,
            0,
          );
          if (totalPossibleAttendances === 0) return 0;
          const totalActualAttendances = squadBoys.reduce(
            (acc, boy) => acc + boy.marks.filter((m) => m.score >= 0).length,
            0,
          );
          return Math.round(
            (totalActualAttendances / totalPossibleAttendances) * 100,
          );
        })(),
      };
    });

    return stats;
  }, [boysBySquad]);

  // --- EVENT HANDLERS ---
  const handleAddBoy = () => {
    setBoyToEdit(null); // Ensure form is in 'add' mode
    setIsFormModalOpen(true);
  };

  const handleEditBoy = (boy: Boy) => {
    setBoyToEdit(boy);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setIsEditorBusy(false);
    setIsEditorDirty(false);
    setBoyToEdit(null);
  };

  const handleOpenDeleteModal = (boy: Boy) => {
    setBoyToDelete(boy);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setBoyToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteBoy = async () => {
    if (!boyToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteBoyById(boyToDelete.id!, activeSection);

      showToast(`'${boyToDelete.name}' was deleted.`, "success");
      refreshData();
      handleCloseDeleteModal();
    } catch (error) {
      console.error("Failed to delete boy:", error);
      showToast("Failed to delete member.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  /** Callback for the BoyForm, triggers a data refresh after saving. */
  const handleSave = (isNew: boolean, name: string) => {
    handleCloseFormModal();
    const message = isNew
      ? `Added '${name}' successfully.`
      : `Updated '${name}' successfully.`;
    showToast(message, "success");
    refreshData();
  };

  // --- RENDER LOGIC ---
  const hasActiveFilters =
    filterSquad !== "all" || filterYear !== "all" || searchQuery !== "";
  const hasNonDefaultSortOrFilter =
    filterSquad !== "all" || filterYear !== "all" || sortBy !== "name";
  const sortedSquads = (
    hasActiveFilters
      ? Object.keys(boysBySquad).map(Number)
      : rosterSquadNumbers(configuredSquads, filteredBoys)
  ).sort((a, b) => a - b);

  return (
    <div className="staff-workflow roster-workflow">
      <div className="staff-roster-heading">
        <p className="staff-context">
          {boys.length} members · {isCompany ? "Company" : "Junior"} section
        </p>
        <div className="staff-roster-tools">
          <details className="staff-roster-menu">
            <summary aria-label="More roster actions">
              <span aria-hidden="true">•••</span>
            </summary>
            <div className="staff-inline-menu">
              <NativeButton
                variant="plain"
                onClick={(event) => {
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                  setIsImportModalOpen(true);
                }}
              >
                Import from a past session
              </NativeButton>
            </div>
          </details>
          <NativeButton
            className="staff-compact-action"
            onClick={handleAddBoy}
            aria-label="Add Boy"
          >
            <PlusIcon className="staff-icon" />
          </NativeButton>
        </div>
      </div>
      <div className="staff-roster-search">
        <NativeSearch
          label="Search members"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search members"
        />
        <NativeButton
          className="staff-compact-action"
          variant="secondary"
          onClick={() => setIsFilterModalOpen(true)}
          aria-label="Open sort and filter options"
          aria-pressed={hasNonDefaultSortOrFilter}
        >
          <FilterIcon className="staff-icon" />
          {hasNonDefaultSortOrFilter && (
            <span className="staff-filter-dot" aria-hidden="true">
              •
            </span>
          )}
        </NativeButton>
      </div>
      {boys.length === 0 && (
        <EmptyState
          title="Your roster is empty"
          action={
            <NativeButton onClick={handleAddBoy}>
              Add your first member
            </NativeButton>
          }
        >
          Add a member, or use Import to bring back members from a past session.
          School year advances by one on import.
        </EmptyState>
      )}
      {boys.length > 0 && filteredBoys.length === 0 && (
        <EmptyState
          title="No members found"
          action={
            <NativeButton
              variant="plain"
              onClick={() => {
                setSearchQuery("");
                setFilterSquad("all");
                setFilterYear("all");
              }}
            >
              Clear filters
            </NativeButton>
          }
        >
          Try another name, squad or school year.
        </EmptyState>
      )}
      <div className="staff-roster-groups">
        {sortedSquads.map((squad) => {
          const members = boysBySquad[squad] || [];
          if (hasActiveFilters && !members.length) return null;
          return (
            <GroupedList
              key={squad}
              title={squadDisplayName(configuredSquads, squad)}
              footer={`${squadStats[squad]?.totalMarks ?? 0} marks · ${squadStats[squad]?.avgAttendance ?? 0}% attendance`}
            >
              {!members.length && (
                <li className="staff-empty-row">
                  No members in this squad yet.
                </li>
              )}
              {members.map((boy) => (
                <li key={boy.id} className="staff-member-row">
                  <button
                    type="button"
                    className="staff-member-main"
                    onClick={() =>
                      setView({ page: "boyMarks", boyId: boy.id! })
                    }
                    aria-label={`View marks for ${boy.name}`}
                  >
                    <span className="staff-avatar" aria-hidden="true">
                      {boy.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span className="staff-member-copy">
                      <span className="staff-member-name">
                        <NameWithRank
                          name={boy.name}
                          memberRank={boy.memberRank}
                        />
                        {boy.isSquadLeader && (
                          <span className="staff-leader">Leader</span>
                        )}
                      </span>
                      <span className="staff-context">
                        {formatSchoolYear(activeSection, boy.year)} ·{" "}
                        {calculateTotalMarks(boy)} marks ·{" "}
                        {calculateAttendancePercentage(boy)}%
                      </span>
                    </span>
                    <span className="staff-disclosure" aria-hidden="true">
                      ›
                    </span>
                  </button>
                  <details className="staff-member-menu">
                    <summary aria-label={`Actions for ${boy.name}`}>
                      <span aria-hidden="true">•••</span>
                    </summary>
                    <div className="staff-inline-menu">
                      <NativeButton
                        variant="plain"
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          handleEditBoy(boy);
                        }}
                        aria-label={`Edit ${boy.name}`}
                      >
                        <PencilIcon className="staff-icon" /> Edit member
                      </NativeButton>
                      <NativeButton
                        variant="plain"
                        danger
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          handleOpenDeleteModal(boy);
                        }}
                        aria-label={`Delete ${boy.name}`}
                      >
                        <TrashIcon className="staff-icon" /> Delete member
                      </NativeButton>
                    </div>
                  </details>
                </li>
              ))}
            </GroupedList>
          );
        })}
      </div>
      <Modal
        isOpen={isFormModalOpen}
        dismissible={!isEditorBusy && !isEditorDirty}
        onClose={handleCloseFormModal}
        title={boyToEdit ? "Edit member" : "Add member"}
      >
        {isFormModalOpen && (
          <BoyForm
            onBusyChange={setIsEditorBusy}
            onDirtyChange={setIsEditorDirty}
            boyToEdit={boyToEdit}
            onSave={handleSave}
            onClose={handleCloseFormModal}
            activeSection={activeSection}
            squads={configuredSquads}
          />
        )}
      </Modal>
      <Modal
        isOpen={isDeleteModalOpen}
        dismissible={!isDeleting}
        onClose={() => {
          if (!isDeleting) handleCloseDeleteModal();
        }}
        title="Delete member?"
      >
        {boyToDelete && (
          <div className="staff-form">
            <p>
              Delete{" "}
              <strong>
                <NameWithRank
                  name={boyToDelete.name}
                  memberRank={boyToDelete.memberRank}
                />
              </strong>{" "}
              and their records? This cannot be undone directly.
            </p>
            <div className="staff-form-actions">
              <NativeButton
                variant="secondary"
                disabled={isDeleting}
                onClick={handleCloseDeleteModal}
              >
                Cancel
              </NativeButton>
              <NativeButton danger busy={isDeleting} onClick={handleDeleteBoy}>
                Delete
              </NativeButton>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Sort & filter"
      >
        <div className="staff-form">
          <NativeField label="Sort by" htmlFor="sort-by">
            <select
              className="bb-input"
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByType)}
            >
              <option value="name">Year, then name (A–Z)</option>
              <option value="marks">Total marks (high–low)</option>
              <option value="attendance">Attendance (high–low)</option>
            </select>
          </NativeField>
          <NativeField label="Squad" htmlFor="filter-squad">
            <select
              className="bb-input"
              id="filter-squad"
              value={filterSquad}
              onChange={(e) => setFilterSquad(e.target.value)}
            >
              <option value="all">All squads</option>
              {uniqueSquads.map((s) => (
                <option key={s} value={s}>
                  {squadDisplayName(configuredSquads, s)}
                </option>
              ))}
            </select>
          </NativeField>
          <NativeField label="School year" htmlFor="filter-year">
            <select
              className="bb-input"
              id="filter-year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">All years</option>
              {uniqueYears.map((y) => (
                <option key={y} value={y}>
                  {formatSchoolYear(activeSection, y)}
                </option>
              ))}
            </select>
          </NativeField>
          <NativeButton onClick={() => setIsFilterModalOpen(false)}>
            Done
          </NativeButton>
        </div>
      </Modal>
      <ImportFromSessionModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeSection={activeSection}
        liveBoys={boys}
        destinationSquads={configuredSquads}
        showToast={showToast}
        refreshData={refreshData}
      />
    </div>
  );
};
export default HomePage;
