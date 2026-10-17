import {
  NativeButton,
  GroupedList,
  EmptyState,
  LoadingState,
  SaveAccessory,
  InlineNotice,
} from "./ui";
import "./staff/staff.css";
import { MarksEntryRow } from "./staff/MarksEntryRow";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { Boy, Section, SectionSettings, ToastType } from "../types";
import { saveWeeklyMarksSnapshot } from "../services/db";
import { describeError, reportError } from "../services/observability";
import {
  LockClosedIcon,
  LockOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./Icons";
import DatePicker from "./DatePicker"; // Import the new DatePicker component
import Modal from "./Modal";
import {
  getDefaultMarksDate,
  getTodayString,
  addLocalDays,
} from "./weeklyMarksDates";
import {
  CompanyMarkState,
  JuniorMarkState,
  AttendanceStatus,
  buildWeeklyMarksSnapshot,
} from "./weeklyMarksSavePlan";
import { shouldConfirmWeeklyMarksDateChange } from "./weeklyMarksDateChange";
import {
  squadDisplayName,
  withSettingsSquads,
} from "../services/sectionSquads";

interface WeeklyMarksPageProps {
  boys: Boy[];
  refreshData: () => void;
  /** A callback to inform the main App component if there are unsaved changes. */
  setHasUnsavedChanges: (dirty: boolean) => void;
  activeSection: Section;
  settings: SectionSettings | null;
  /** Function to display a toast notification. */
  showToast: (message: string, type?: ToastType) => void;
}

const nextAttendanceStatus = (current: AttendanceStatus): AttendanceStatus => {
  if (current === "present") return "absent";
  if (current === "absent") return undefined;
  return "present";
};

const WeeklyMarksPage: React.FC<WeeklyMarksPageProps> = ({
  boys,
  refreshData,
  setHasUnsavedChanges,
  activeSection,
  settings,
  showToast,
}) => {
  // --- STATE MANAGEMENT ---
  const [selectedDate, setSelectedDate] = useState("");
  const [marks, setMarks] = useState<
    Record<string, CompanyMarkState | JuniorMarkState>
  >({});
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [today, setToday] = useState(getTodayString);
  const [isLocked, setIsLocked] = useState(false); // Read-only state for past dates.
  const [markErrors, setMarkErrors] = useState<
    Record<string, { score?: string; uniform?: string; behaviour?: string }>
  >({});
  const [pendingDate, setPendingDate] = useState("");
  const [isDateChangeConfirmOpen, setIsDateChangeConfirmOpen] = useState(false);
  const isSavingRef = useRef(false);

  const isCompany = activeSection === "company";
  const configuredSquads = withSettingsSquads(settings, activeSection);

  /**
   * EFFECT: Sets the initial date for the marks page based on the user's settings.
   */
  useEffect(() => {
    if (settings && !selectedDate) {
      setSelectedDate(getDefaultMarksDate(settings.meetingDay));
    }
  }, [settings, selectedDate]);

  useEffect(() => {
    const refreshToday = () => {
      setToday((currentToday) => {
        const nextToday = getTodayString();
        return currentToday === nextToday ? currentToday : nextToday;
      });
    };

    refreshToday();
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshToday);
    const intervalId = window.setInterval(refreshToday, 60_000);

    return () => {
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", refreshToday);
      window.clearInterval(intervalId);
    };
  }, []);

  /**
   * EFFECT: Automatically locks the page if the selected date is in the past.
   */
  useEffect(() => {
    if (!selectedDate) return;
    setIsLocked(selectedDate < today);
  }, [selectedDate, today]);

  /**
   * EFFECT: Populates the marks and attendance state based on the selected date and boys data.
   * This runs whenever the date changes, pulling existing marks for that day or setting defaults.
   */
  useEffect(() => {
    if (!selectedDate) return;

    const newMarks: Record<string, CompanyMarkState | JuniorMarkState> = {};
    const newAttendance: Record<string, AttendanceStatus> = {};

    boys.forEach((boy) => {
      if (boy.id) {
        const markForDate = boy.marks.find((m) => m.date === selectedDate);
        if (markForDate) {
          if (markForDate.score < 0) {
            // Boy was marked absent.
            newAttendance[boy.id] = "absent";
            newMarks[boy.id] = isCompany ? -1 : { uniform: -1, behaviour: -1 };
          } else {
            // Boy was present, load their existing scores.
            newAttendance[boy.id] = "present";
            newMarks[boy.id] = isCompany
              ? markForDate.score
              : {
                  uniform: markForDate.uniformScore ?? "",
                  behaviour: markForDate.behaviourScore ?? "",
                };
          }
        } else {
          newAttendance[boy.id] = undefined;
          newMarks[boy.id] = isCompany ? "" : { uniform: "", behaviour: "" };
        }
      }
    });
    setMarks(newMarks);
    setAttendance(newAttendance);
    setMarkErrors({}); // Clear errors on date change.
    setSaveError("");
  }, [selectedDate, boys, isCompany]);

  const pendingSnapshot = useMemo(
    () =>
      selectedDate
        ? buildWeeklyMarksSnapshot({
            boys,
            selectedDate,
            attendance,
            marks,
            activeSection,
          })
        : [],
    [boys, selectedDate, attendance, marks, activeSection],
  );

  const hasPendingChanges = pendingSnapshot.length > 0;

  useEffect(() => {
    setHasUnsavedChanges(hasPendingChanges);
  }, [hasPendingChanges, setHasUnsavedChanges]);

  useEffect(() => {
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

  // --- EVENT HANDLERS ---
  const validateAndSetMark = (
    boyId: string,
    type: "score" | "uniform" | "behaviour",
    scoreStr: string,
    max: number,
  ) => {
    const numericScore = parseFloat(scoreStr);
    let error: string | undefined;

    if (scoreStr === "") {
      error = undefined; // No error for empty string
    } else if (isNaN(numericScore)) {
      error = "Invalid number";
    } else if (numericScore < 0 || numericScore > max) {
      error = `Must be between 0 and ${max}`;
    } else if (scoreStr.includes(".") && scoreStr.split(".")[1].length > 2) {
      error = "Max 2 decimal places";
    }

    setMarkErrors((prev) => ({
      ...prev,
      [boyId]: { ...prev[boyId], [type]: error },
    }));

    setMarks((prev) => {
      if (isCompany) {
        return { ...prev, [boyId]: scoreStr };
      }
      const currentMark = (prev[boyId] as JuniorMarkState) || {
        uniform: "",
        behaviour: "",
      };
      return { ...prev, [boyId]: { ...currentMark, [type]: scoreStr } };
    });
  };

  const handleCompanyMarkChange = (boyId: string, score: string) => {
    validateAndSetMark(boyId, "score", score, 10);
  };

  const handleJuniorMarkChange = (
    boyId: string,
    type: "uniform" | "behaviour",
    score: string,
  ) => {
    const maxScore = type === "uniform" ? 10 : 5;
    validateAndSetMark(boyId, type, score, maxScore);
  };

  const handleAttendanceToggle = (boyId: string) => {
    const newStatus = nextAttendanceStatus(attendance[boyId]);
    setAttendance((prev) => ({ ...prev, [boyId]: newStatus }));

    if (newStatus === "absent") {
      setMarks((prev) => ({
        ...prev,
        [boyId]: isCompany ? -1 : { uniform: -1, behaviour: -1 },
      }));
      setMarkErrors((prev) => ({ ...prev, [boyId]: {} }));
      return;
    }

    if (newStatus === undefined) {
      setMarks((prev) => ({
        ...prev,
        [boyId]: isCompany ? "" : { uniform: "", behaviour: "" },
      }));
      setMarkErrors((prev) => ({ ...prev, [boyId]: {} }));
      return;
    }

    const markForDate = boys
      .find((b) => b.id === boyId)
      ?.marks.find((m) => m.date === selectedDate);
    const presentMark = markForDate && markForDate.score >= 0;

    if (isCompany) {
      setMarks((prev) => ({
        ...prev,
        [boyId]: presentMark ? markForDate.score : "",
      }));
    } else {
      setMarks((prev) => ({
        ...prev,
        [boyId]: presentMark
          ? {
              uniform: markForDate.uniformScore ?? "",
              behaviour: markForDate.behaviourScore ?? "",
            }
          : { uniform: "", behaviour: "" },
      }));
    }
  };

  const handleClearAllMarks = () => {
    if (isLocked) {
      showToast("Unlock the page to edit past marks.", "info");
      return;
    }
    const newMarks: Record<string, CompanyMarkState | JuniorMarkState> = {};
    const newAttendance: Record<string, AttendanceStatus> = {};

    boys.forEach((boy) => {
      if (boy.id) {
        newAttendance[boy.id] = undefined;
        newMarks[boy.id] = isCompany ? "" : { uniform: "", behaviour: "" };
      }
    });
    setMarks(newMarks);
    setAttendance(newAttendance);
    setMarkErrors({});
    showToast("All marks cleared.", "info");
  };

  const requestDateChange = (nextDate: string) => {
    if (isSavingRef.current || !nextDate || nextDate === selectedDate) {
      return;
    }

    if (
      shouldConfirmWeeklyMarksDateChange({
        currentDate: selectedDate,
        nextDate,
        isDirty: hasPendingChanges,
      })
    ) {
      setPendingDate(nextDate);
      setIsDateChangeConfirmOpen(true);
      return;
    }

    setSelectedDate(nextDate);
  };

  const confirmDateChange = () => {
    if (pendingDate) {
      setSelectedDate(pendingDate);
    }
    setPendingDate("");
    setIsDateChangeConfirmOpen(false);
  };

  const cancelDateChange = () => {
    setPendingDate("");
    setIsDateChangeConfirmOpen(false);
  };

  const handlePreviousWeek = () => {
    requestDateChange(addLocalDays(selectedDate, -7));
  };

  const handleNextWeek = () => {
    requestDateChange(addLocalDays(selectedDate, 7));
  };

  const handleSaveMarks = async () => {
    // Check for any active errors before saving
    const hasErrors = Object.values(markErrors).some((boyErrors) =>
      Object.values(boyErrors).some((error) => error !== undefined),
    );

    if (hasErrors) {
      showToast("Please correct the errors before saving.", "error");
      document
        .querySelector<HTMLInputElement>(
          '.marks-workflow input[aria-invalid="true"]',
        )
        ?.focus();
      return;
    }

    if (!hasPendingChanges) {
      showToast("No changes to save.", "info");
      return;
    }

    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError("");

    try {
      await saveWeeklyMarksSnapshot(
        activeSection,
        selectedDate,
        pendingSnapshot,
      );
      showToast("Marks saved successfully!", "success");
      refreshData();
    } catch (error) {
      setSaveError(
        describeError(error, "Failed to save marks. Please try again."),
      );
      reportError(error, "saveWeeklyMarks");
      showToast(
        describeError(error, "Failed to save marks. Please try again."),
        "error",
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // Stable row callbacks dispatch only to handlers from the latest committed render.
  // They deliberately do not capture attendance/date in a permanently memoized closure.
  const rowHandlers = useRef({
    handleAttendanceToggle,
    handleCompanyMarkChange,
    handleJuniorMarkChange,
  });
  useLayoutEffect(() => {
    rowHandlers.current = {
      handleAttendanceToggle,
      handleCompanyMarkChange,
      handleJuniorMarkChange,
    };
  });
  const onRowAttendance = useCallback(
    (id: string) => rowHandlers.current.handleAttendanceToggle(id),
    [],
  );
  const onRowScore = useCallback(
    (id: string, type: "score" | "uniform" | "behaviour", value: string) => {
      if (type === "score")
        rowHandlers.current.handleCompanyMarkChange(id, value);
      else rowHandlers.current.handleJuniorMarkChange(id, type, value);
    },
    [],
  );

  // --- MEMOIZED COMPUTATIONS for rendering ---
  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    boys.forEach((boy) => {
      if (!grouped[boy.squad]) {
        grouped[boy.squad] = [];
      }
      grouped[boy.squad].push(boy);
    });

    // Sort boys within squads for consistent display order.
    for (const squad of Object.keys(grouped)) {
      grouped[squad].sort((a, b) => {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        if (typeof yearA === "string" && typeof yearB === "string") {
          return yearB.localeCompare(yearA);
        }
        if (typeof yearA === "number" && typeof yearB === "number") {
          return yearB - yearA;
        }
        return a.name.localeCompare(b.name);
      });
    }
    return grouped;
  }, [boys]);

  /**
   * Memoized calculation of real-time attendance stats for each squad.
   * This provides immediate feedback as the user marks attendance.
   */
  const squadAttendanceStats = useMemo(() => {
    const stats: Record<
      string,
      { present: number; recorded: number; percentage: number | null }
    > = {};
    for (const squad in boysBySquad) {
      const squadBoys = boysBySquad[squad];
      const recorded = squadBoys.filter(
        (boy) =>
          boy.id &&
          (attendance[boy.id] === "present" || attendance[boy.id] === "absent"),
      );
      const present = recorded.filter(
        (boy) => boy.id && attendance[boy.id] === "present",
      ).length;
      stats[squad] = {
        present,
        recorded: recorded.length,
        percentage:
          recorded.length === 0
            ? null
            : Math.round((present / recorded.length) * 100),
      };
    }
    return stats;
  }, [boysBySquad, attendance]);

  // --- RENDER LOGIC ---
  const sortedSquads = Object.keys(boysBySquad).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  if (!settings) return <LoadingState label="Loading meeting settings…" />;
  if (!boys.length)
    return (
      <EmptyState title="No members to mark">
        Add members on the Members page before recording attendance.
      </EmptyState>
    );
  const isPastDate = selectedDate < today;
  return (
    <div className="staff-workflow marks-workflow">
      <div className="staff-meeting-picker">
        <NativeButton
          variant="plain"
          onClick={handlePreviousWeek}
          disabled={isSaving || !selectedDate}
          aria-label="Previous week"
        >
          <ChevronLeftIcon className="staff-icon" />
        </NativeButton>
        <DatePicker
          value={selectedDate}
          onChange={requestDateChange}
          disabled={isSaving}
          ariaLabel="Select weekly marks date"
        />
        <NativeButton
          variant="plain"
          onClick={handleNextWeek}
          disabled={isSaving || !selectedDate}
          aria-label="Next week"
        >
          <ChevronRightIcon className="staff-icon" />
        </NativeButton>
      </div>
      <div className="staff-task-toolbar">
        <p className="staff-context">
          Tap attendance to cycle Present, Absent and Not recorded.
        </p>
        <div className="staff-actions">
          {isPastDate && (
            <NativeButton
              variant="secondary"
              disabled={isSaving}
              onClick={() => setIsLocked((prev) => !prev)}
              aria-label={isLocked ? "Unlock to edit past marks" : "Lock page"}
            >
              {isLocked ? (
                <LockClosedIcon className="staff-icon" />
              ) : (
                <LockOpenIcon className="staff-icon" />
              )}
              {isLocked ? "Unlock" : "Lock"}
            </NativeButton>
          )}
          <NativeButton
            variant="plain"
            danger
            disabled={isLocked || isSaving}
            onClick={() => setIsClearConfirmOpen(true)}
          >
            Clear All Marks
          </NativeButton>
        </div>
      </div>
      {isLocked && (
        <InlineNotice>
          Past meeting · Locked to prevent accidental edits. Unlock to make a
          correction.
        </InlineNotice>
      )}
      {sortedSquads.map((squad) => (
        <GroupedList
          key={squad}
          title={squadDisplayName(configuredSquads, Number(squad))}
          footer={
            squadAttendanceStats[squad].percentage === null
              ? "Attendance not recorded"
              : `${squadAttendanceStats[squad].present} / ${squadAttendanceStats[squad].recorded} recorded · ${squadAttendanceStats[squad].percentage}% present`
          }
        >
          {boysBySquad[squad].map((boy) =>
            boy.id ? (
              <MarksEntryRow
                key={boy.id}
                boy={boy}
                status={attendance[boy.id]}
                mark={marks[boy.id]}
                errors={markErrors[boy.id]}
                isCompany={isCompany}
                isLocked={isLocked}
                isSaving={isSaving}
                onAttendance={onRowAttendance}
                onScore={onRowScore}
              />
            ) : null,
          )}
        </GroupedList>
      ))}
      <SaveAccessory
        dirty={hasPendingChanges}
        saving={isSaving}
        error={saveError || undefined}
        onSave={handleSaveMarks}
        label="Save Marks"
      />
      <Modal
        isOpen={isDateChangeConfirmOpen}
        onClose={cancelDateChange}
        title="Discard unsaved marks?"
      >
        <div className="staff-form">
          <p>Changing the date discards unsaved changes on this sheet.</p>
          <div className="staff-form-actions">
            <NativeButton variant="secondary" onClick={cancelDateChange}>
              Stay
            </NativeButton>
            <NativeButton danger onClick={confirmDateChange}>
              Change Date
            </NativeButton>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        title="Clear this meeting?"
      >
        <div className="staff-form">
          <p>
            Reset attendance and scores for every member on this date. The
            changes are only recorded when you save.
          </p>
          <div className="staff-form-actions">
            <NativeButton
              variant="secondary"
              onClick={() => setIsClearConfirmOpen(false)}
            >
              Cancel
            </NativeButton>
            <NativeButton
              danger
              onClick={() => {
                handleClearAllMarks();
                setIsClearConfirmOpen(false);
              }}
            >
              Clear All Marks
            </NativeButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default WeeklyMarksPage;
