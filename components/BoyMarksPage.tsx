import {
  NativeButton,
  NativeInput,
  GroupedList,
  InlineNotice,
  EmptyState,
  LoadingState,
  SaveAccessory,
} from "./ui";
import Modal from "./Modal";
import "./staff/staff.css";
import { NameWithRank } from "./RankBadge";
/**
 * @file BoyMarksPage.tsx
 * @description A detailed view showing the entire mark history for a single boy.
 * It allows for correcting past marks, changing attendance status for past dates,
 * and deleting incorrect mark entries.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Boy, Section, ToastType } from "../types";
import { TrashIcon } from "./Icons";
import { fetchBoyById, saveBoyMarks } from "../services/db";
import {
  areMarkListsEqual,
  normalizeEditableMarksForSave,
} from "./weeklyMarksSavePlan";

interface BoyMarksPageProps {
  boyId: string;
  refreshData: () => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
  onBack: () => void;
}

type EditableMark = {
  date: string;
  score: number | "";
  uniformScore?: number | "";
  behaviourScore?: number | "";
};

const BoyMarksPage: React.FC<BoyMarksPageProps> = ({
  boyId,
  refreshData,
  setHasUnsavedChanges,
  activeSection,
  showToast,
  onBack,
}) => {
  // --- STATE MANAGEMENT ---
  const [boy, setBoy] = useState<Boy | null>(null);
  const [editedMarks, setEditedMarks] = useState<EditableMark[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDate, setDeleteDate] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isCompany = activeSection === "company";

  /**
   * Fetches the specific boy's data from the database.
   */
  const fetchBoyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const boyData = await fetchBoyById(boyId, activeSection);
      if (boyData) {
        // Sort marks by date descending for display.
        boyData.marks.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setBoy(boyData);
        // Create a shallow copy of the marks for editing to avoid mutating the original state.
        setEditedMarks(boyData.marks.map((mark) => ({ ...mark })));
      } else {
        setError("Boy not found.");
      }
    } catch (err) {
      setError("Failed to load boy data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [boyId, activeSection]);

  // Fetch data when the component mounts or the ID changes.
  useEffect(() => {
    fetchBoyData();
  }, [fetchBoyData]);

  /**
   * EFFECT: Detects if there are any unsaved changes by comparing the original
   * marks with the `editedMarks` state. This is a crucial piece of logic for
   * managing the `isDirty` state.
   */
  useEffect(() => {
    if (boy) {
      // Create a canonical, sorted representation of the original marks to ensure consistent key order and data types for comparison.
      const editedMarksCanonical = normalizeEditableMarksForSave(
        editedMarks,
        activeSection,
      );

      setIsDirty(!areMarkListsEqual(boy.marks, editedMarksCanonical));
    } else {
      setIsDirty(false);
    }
  }, [boy, editedMarks, isCompany]);

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  useEffect(() => {
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

  // --- EVENT HANDLERS ---
  const handleMarkChange = (
    date: string,
    type: "score" | "uniform" | "behaviour",
    newScoreStr: string,
  ) => {
    const maxScore = type === "uniform" ? 10 : type === "behaviour" ? 5 : 10;
    const newScore = parseFloat(newScoreStr); // Preserve numeric storage and domain normalization.
    const invalid =
      newScoreStr !== "" &&
      (!Number.isFinite(newScore) ||
        newScore < 0 ||
        newScore > maxScore ||
        (newScoreStr.split(".")[1]?.length || 0) > 2);
    setFieldErrors((current) => ({
      ...current,
      [`${date}-${type}`]: invalid
        ? `Enter 0–${maxScore}, up to 2 decimal places.`
        : "",
    }));
    if (invalid) return;

    // Validate input before updating state.
    if (
      newScoreStr === "" ||
      (!isNaN(newScore) && newScore >= 0 && newScore <= maxScore)
    ) {
      setEditedMarks((currentMarks) =>
        currentMarks.map((mark) => {
          if (mark.date === date) {
            const updatedMark = { ...mark };
            if (type === "score")
              updatedMark.score = newScoreStr === "" ? "" : newScore;
            if (type === "uniform")
              updatedMark.uniformScore = newScoreStr === "" ? "" : newScore;
            if (type === "behaviour")
              updatedMark.behaviourScore = newScoreStr === "" ? "" : newScore;
            return updatedMark;
          }
          return mark;
        }),
      );
    }
  };

  const handleAttendanceToggle = (date: string) => {
    setFieldErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(date)),
      ),
    );
    setEditedMarks((currentMarks) =>
      currentMarks.map((mark) => {
        if (mark.date === date) {
          // FIX: Use Number() to correctly compare score which could be an empty string.
          const isPresent = Number(mark.score) >= 0;
          const newMark = { ...mark };
          if (isPresent) {
            // Toggling to absent
            newMark.score = -1;
          } else {
            // Toggling to present, clear the score fields.
            if (isCompany) {
              newMark.score = "";
            } else {
              newMark.score = 0; // Will be recalculated on save
              newMark.uniformScore = "";
              newMark.behaviourScore = "";
            }
          }
          return newMark;
        }
        return mark;
      }),
    );
  };

  const handleDeleteMark = (date: string) => {
    // This effectively removes the mark for this date from the boy's record.
    setEditedMarks((currentMarks) =>
      currentMarks.filter((mark) => mark.date !== date),
    );
  };

  const handleSaveChanges = async () => {
    if (!boy || !isDirty || isSaving) return;
    if (Object.values(fieldErrors).some(Boolean)) {
      document
        .querySelector<HTMLInputElement>(
          '.history-workflow input[aria-invalid="true"]',
        )
        ?.focus();
      return;
    }
    if (!boy.id) {
      setError("Boy ID is required.");
      return;
    }
    setIsSaving(true);
    setError(null);

    const nextMarks = normalizeEditableMarksForSave(editedMarks, activeSection);

    try {
      await saveBoyMarks(boy.id, activeSection, boy.marks, nextMarks);

      const savedBoy = await fetchBoyById(boy.id, activeSection);
      if (!savedBoy) {
        throw new Error("Failed to reload saved marks.");
      }

      savedBoy.marks.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setBoy(savedBoy);
      setEditedMarks(savedBoy.marks.map((mark) => ({ ...mark })));
      showToast("Changes saved successfully!", "success");
      refreshData(); // Refresh data in the main App component.
      setIsDirty(false);
    } catch (err) {
      showToast("Failed to save changes.", "error");
      setError("Failed to save changes. Please try again.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Memoized calculation of total marks and attendance percentage based on the `editedMarks` state.
   * This provides instant feedback to the user as they make changes.
   */
  const { totalMarks, attendancePercentage } = useMemo(() => {
    // Recalculate junior scores for accuracy during editing.
    const marksToConsider = editedMarks.map((m) => {
      if (isCompany || m.uniformScore === undefined) return m;
      const uniform =
        m.uniformScore === "" ? 0 : parseFloat(String(m.uniformScore));
      const behaviour =
        m.behaviourScore === "" ? 0 : parseFloat(String(m.behaviourScore));
      // FIX: Use Number() to correctly compare score which could be an empty string.
      return { ...m, score: Number(m.score) < 0 ? -1 : uniform + behaviour };
    });

    if (marksToConsider.length === 0) {
      return { totalMarks: 0, attendancePercentage: 0 };
    }
    const attendedMarks = marksToConsider.filter((m) => Number(m.score) >= 0);
    const attendedCount = attendedMarks.length;
    const percentage = Math.round(
      (attendedCount / marksToConsider.length) * 100,
    );
    const total = attendedMarks.reduce(
      (sum, mark) => sum + (Number(mark.score) || 0),
      0,
    );
    return { totalMarks: total, attendancePercentage: percentage };
  }, [editedMarks, isCompany]);

  if (loading) return <LoadingState label="Loading member history…" />;
  if (!boy)
    return (
      <div className="staff-form">
        <InlineNotice kind="error">
          {error || "Member data not available."}
        </InlineNotice>
        <NativeButton onClick={fetchBoyData}>Retry</NativeButton>
        <NativeButton variant="plain" onClick={onBack}>
          Back to members
        </NativeButton>
      </div>
    );
  return (
    <div className="staff-workflow history-workflow">
      <NativeButton variant="plain" onClick={onBack}>
        ‹ Back to members
      </NativeButton>
      <header className="staff-member-header">
        <h2 aria-label={`${boy.name}'s Marks`}>
          <NameWithRank name={boy.name} memberRank={boy.memberRank} />
        </h2>
        <p className="staff-context">
          Squad {boy.squad} · {isCompany ? `Year ${boy.year}` : boy.year}
          {boy.isSquadLeader ? " · Squad leader" : ""}
        </p>
        <div className="staff-history-stats">
          <div>
            <strong>{totalMarks}</strong>
            <span>Total marks</span>
          </div>
          <div>
            <strong>{attendancePercentage}%</strong>
            <span>Attendance</span>
          </div>
          <div>
            <strong>{editedMarks.length}</strong>
            <span>Meetings</span>
          </div>
        </div>
      </header>
      {error && (
        <InlineNotice kind="error">
          {error} Your changes remain on this screen.
        </InlineNotice>
      )}
      {!editedMarks.length && (
        <EmptyState title="No marks recorded">
          Weekly attendance and scores will appear here.
        </EmptyState>
      )}
      {!!editedMarks.length && (
        <GroupedList
          title="Meeting history"
          footer="Corrections are recorded only when you save. Deleting a meeting removes its attendance and scores."
        >
          {editedMarks.map((mark) => {
            const present = Number(mark.score) >= 0;
            const dateLabel = new Date(
              mark.date + "T00:00:00",
            ).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            return (
              <li className="staff-history-row" key={mark.date}>
                <div className="staff-history-date">
                  <strong>{dateLabel}</strong>
                  <NativeButton
                    variant="plain"
                    danger
                    disabled={isSaving}
                    onClick={() => setDeleteDate(mark.date)}
                    aria-label={`Delete mark for ${dateLabel}`}
                  >
                    <TrashIcon className="staff-icon" />
                  </NativeButton>
                </div>
                <div className="staff-score-controls">
                  <NativeButton
                    variant="secondary"
                    className={`staff-attendance staff-attendance--${present ? "present" : "absent"}`}
                    disabled={isSaving}
                    aria-pressed={present}
                    aria-label={`${present ? "Present" : "Absent"}, ${dateLabel}. Mark as ${present ? "absent" : "present"}`}
                    onClick={() => handleAttendanceToggle(mark.date)}
                  >
                    {present ? "Present" : "Absent"}
                  </NativeButton>
                  {isCompany ? (
                    <NativeInput
                      label="Score /10"
                      aria-label={`Score /10 for ${dateLabel}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="10"
                      step="0.01"
                      value={present ? (mark.score ?? "") : ""}
                      onChange={(e) =>
                        handleMarkChange(mark.date, "score", e.target.value)
                      }
                      error={fieldErrors[`${mark.date}-score`]}
                      disabled={!present || isSaving}
                    />
                  ) : mark.uniformScore !== undefined ? (
                    <>
                      <NativeInput
                        label="Uniform /10"
                        aria-label={`Uniform /10 for ${dateLabel}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="10"
                        step="0.01"
                        value={present ? (mark.uniformScore ?? "") : ""}
                        onChange={(e) =>
                          handleMarkChange(mark.date, "uniform", e.target.value)
                        }
                        error={fieldErrors[`${mark.date}-uniform`]}
                        disabled={!present || isSaving}
                      />
                      <NativeInput
                        label="Behaviour /5"
                        aria-label={`Behaviour /5 for ${dateLabel}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="5"
                        step="0.01"
                        value={present ? (mark.behaviourScore ?? "") : ""}
                        onChange={(e) =>
                          handleMarkChange(
                            mark.date,
                            "behaviour",
                            e.target.value,
                          )
                        }
                        error={fieldErrors[`${mark.date}-behaviour`]}
                        disabled={!present || isSaving}
                      />
                    </>
                  ) : (
                    <span className="staff-context">
                      {present
                        ? `Historical total: ${mark.score}`
                        : "Absent · No score"}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </GroupedList>
      )}
      <SaveAccessory
        dirty={isDirty}
        saving={isSaving}
        error={error || undefined}
        onSave={handleSaveChanges}
        label="Save Changes"
      />
      <Modal
        isOpen={!!deleteDate}
        dismissible={!isSaving}
        onClose={() => setDeleteDate(null)}
        title="Delete meeting record?"
      >
        <div className="staff-form">
          <p>
            Remove this meeting’s attendance and scores? Save your changes to
            confirm the removal.
          </p>
          <div className="staff-form-actions">
            <NativeButton
              variant="secondary"
              disabled={isSaving}
              onClick={() => setDeleteDate(null)}
            >
              Cancel
            </NativeButton>
            <NativeButton
              danger
              disabled={isSaving}
              onClick={() => {
                if (deleteDate) {
                  handleDeleteMark(deleteDate);
                  setFieldErrors((current) =>
                    Object.fromEntries(
                      Object.entries(current).filter(
                        ([key]) => !key.startsWith(deleteDate),
                      ),
                    ),
                  );
                }
                setDeleteDate(null);
              }}
            >
              Delete record
            </NativeButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default BoyMarksPage;
