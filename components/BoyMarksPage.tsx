/**
 * @file BoyMarksPage.tsx
 * @description A detailed view showing the entire mark history for a single boy.
 * It allows for correcting past marks, changing attendance status for past dates,
 * and deleting incorrect mark entries.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBoyById, updateBoy, createAuditLog } from '../services/db';
import { Boy, Mark, Squad, Section, JuniorSquad, ToastType } from '../types';
import { TrashIcon, SaveIcon } from './Icons';
import { BoyMarksPageSkeleton } from './SkeletonLoaders';

interface BoyMarksPageProps {
  boyId: string;
  refreshData: () => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
}

// Section-specific color mappings.
const COMPANY_SQUAD_COLORS: Record<Squad, string> = {
  1: 'text-red-600',
  2: 'text-green-600',
  3: 'text-yellow-600',
};

const JUNIOR_SQUAD_COLORS: Record<JuniorSquad, string> = {
  1: 'text-red-600',
  2: 'text-green-600',
  3: 'text-blue-600',
  4: 'text-yellow-600',
};

/**
 * A local type for managing marks in the component's state.
 * It allows scores to be an empty string ('') during editing, which is
 * different from the main `Mark` type where `score` is always a number.
 */
// FIX: Redefined type to allow score to be number or empty string, avoiding incorrect type intersection with the original Mark type.
type EditableMark = {
  date: string;
  score: number | '';
  uniformScore?: number | '';
  behaviourScore?: number | '';
};

const BoyMarksPage: React.FC<BoyMarksPageProps> = ({ boyId, refreshData, setHasUnsavedChanges, activeSection, showToast }) => {
  // --- STATE MANAGEMENT ---
  const [boy, setBoy] = useState<Boy | null>(null);
  const [editedMarks, setEditedMarks] = useState<EditableMark[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

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
        boyData.marks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBoy(boyData);
        // Create a deep copy of the marks for editing to avoid mutating the original state.
        setEditedMarks(JSON.parse(JSON.stringify(boyData.marks)));
      } else {
        setError('Boy not found.');
      }
    } catch (err) {
      setError('Failed to load boy data.');
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
      const originalMarksCanonical = [...boy.marks]
        .map(m => {
            const cleanMark: any = { date: m.date, score: m.score };
            if (m.uniformScore !== undefined) cleanMark.uniformScore = m.uniformScore;
            if (m.behaviourScore !== undefined) cleanMark.behaviourScore = m.behaviourScore;
            return cleanMark;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      // Create a canonical, sorted representation of the edited marks.
      // Empty string inputs are converted to 0, which mirrors the save logic.
      const editedMarksCanonical = [...editedMarks]
        .map(editableMark => {
            if (isCompany || editableMark.uniformScore === undefined) {
                // An empty string for a score is treated as 0 for comparison.
                const score = editableMark.score === '' ? 0 : parseFloat(editableMark.score as string); // Use parseFloat
                return { date: editableMark.date, score };
            }
            // For Juniors, recalculate the total score from uniform and behaviour.
            const uniformScore = editableMark.uniformScore === '' ? 0 : parseFloat(editableMark.uniformScore as string); // Use parseFloat
            const behaviourScore = editableMark.behaviourScore === '' ? 0 : parseFloat(editableMark.behaviourScore as string); // Use parseFloat
            const totalScore = Number(editableMark.score) < 0 ? -1 : uniformScore + behaviourScore; // Preserve absent status.
            return { date: editableMark.date, score: totalScore, uniformScore, behaviourScore };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Compare the stringified versions to check for differences.
      setIsDirty(JSON.stringify(originalMarksCanonical) !== JSON.stringify(editedMarksCanonical));
    } else {
        setIsDirty(false);
    }
  }, [boy, editedMarks, isCompany]);
  
  /**
   * EFFECT: Manages the 'beforeunload' event to warn users about unsaved changes.
   */
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setHasUnsavedChanges(false);
    };
  }, [isDirty, setHasUnsavedChanges]);
  
  // --- EVENT HANDLERS ---
  const handleMarkChange = (date: string, type: 'score' | 'uniform' | 'behaviour', newScoreStr: string) => {
    const maxScore = type === 'uniform' ? 10 : (type === 'behaviour' ? 5 : 10);
    const newScore = parseFloat(newScoreStr); // Use parseFloat
    
    // Validate input before updating state.
    if (newScoreStr === '' || (!isNaN(newScore) && newScore >= 0 && newScore <= maxScore)) {
      setEditedMarks(currentMarks =>
        currentMarks.map(mark => {
          if (mark.date === date) {
            const updatedMark = { ...mark };
            if (type === 'score') updatedMark.score = newScoreStr === '' ? '' : newScore;
            if (type === 'uniform') updatedMark.uniformScore = newScoreStr === '' ? '' : newScore;
            if (type === 'behaviour') updatedMark.behaviourScore = newScoreStr === '' ? '' : newScore;
            return updatedMark;
          }
          return mark;
        })
      );
    }
  };

  const handleAttendanceToggle = (date: string) => {
    setEditedMarks(currentMarks =>
      currentMarks.map(mark => {
        if (mark.date === date) {
          // FIX: Use Number() to correctly compare score which could be an empty string.
          const isPresent = Number(mark.score) >= 0;
          const newMark = { ...mark };
          if(isPresent) { // Toggling to absent
              newMark.score = -1;
          } else { // Toggling to present, clear the score fields.
              if(isCompany) {
                  newMark.score = '';
              } else {
                  newMark.score = 0; // Will be recalculated on save
                  newMark.uniformScore = '';
                  newMark.behaviourScore = '';
              }
          }
          return newMark;
        }
        return mark;
      })
    );
  };

  const handleDeleteMark = (date: string) => {
    // This effectively removes the mark for this date from the boy's record.
    setEditedMarks(currentMarks => currentMarks.filter(mark => mark.date !== date));
  };

  const handleSaveChanges = async () => {
    if (!boy || !isDirty) return;
    setIsSaving(true);
    setError(null);

    // Convert the local `EditableMark[]` state back into the strict `Mark[]` type for saving.
    const validMarks: Mark[] = editedMarks
      .map(editableMark => {
        if(isCompany || editableMark.uniformScore === undefined) {
             // An empty string for a score should be saved as 0.
             const score = editableMark.score === '' ? 0 : parseFloat(editableMark.score as string); // Use parseFloat
             return { date: editableMark.date, score };
        }
        // For Juniors, recalculate the total score from uniform and behaviour.
        const uniformScore = editableMark.uniformScore === '' ? 0 : parseFloat(editableMark.uniformScore as string); // Use parseFloat
        const behaviourScore = editableMark.behaviourScore === '' ? 0 : parseFloat(editableMark.behaviourScore as string); // Use parseFloat
        const totalScore = Number(editableMark.score) < 0 ? -1 : uniformScore + behaviourScore; // Preserve absent status.
        return { date: editableMark.date, score: totalScore, uniformScore, behaviourScore };
      });

    const updatedBoyData = { ...boy, marks: validMarks };

    try {
      // Create an audit log entry for the change.
      await createAuditLog({
        // userEmail handled by db.ts
        actionType: 'UPDATE_BOY',
        description: `Updated marks for ${boy.name}.`,
        revertData: { boyData: JSON.parse(JSON.stringify(boy)) }, // Save old data for revert.
      }, activeSection);

      await updateBoy(updatedBoyData, activeSection);
      // Update local state to match the saved data.
      updatedBoyData.marks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBoy(updatedBoyData);
      setEditedMarks(JSON.parse(JSON.stringify(updatedBoyData.marks)));
      showToast('Changes saved successfully!', 'success');
      refreshData(); // Refresh data in the main App component.
      setIsDirty(false);
    } catch (err) {
      showToast('Failed to save changes.', 'error');
      setError('Failed to save changes. Please try again.');
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
     const marksToConsider = editedMarks
      .map(m => {
          if (isCompany || m.uniformScore === undefined) return m;
          const uniform = m.uniformScore === '' ? 0 : parseFloat(m.uniformScore as string); // Use parseFloat
          const behaviour = m.behaviourScore === '' ? 0 : parseFloat(m.behaviourScore as string); // Use parseFloat
          // FIX: Use Number() to correctly compare score which could be an empty string.
          return { ...m, score: Number(m.score) < 0 ? -1 : uniform + behaviour };
      });

    if (marksToConsider.length === 0) {
      return { totalMarks: 0, attendancePercentage: 0 };
    }
    const attendedMarks = marksToConsider.filter(m => Number(m.score) >= 0);
    const attendedCount = attendedMarks.length;
    const percentage = Math.round((attendedCount / marksToConsider.length) * 100);
    const total = attendedMarks.reduce((sum, mark) => sum + (Number(mark.score) || 0), 0);
    return { totalMarks: total, attendancePercentage: percentage };
  }, [editedMarks, isCompany]);
  
  // --- RENDER LOGIC ---
  if (loading) return <BoyMarksPageSkeleton />;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!boy) return <div className="text-center p-8">Boy data not available.</div>;
  
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue focus:ring-company-blue disabled:bg-company-blue' : 'bg-junior-blue focus:ring-junior-blue disabled:bg-junior-blue';

  return (
    <div className="pb-20">
      <div className="mb-6 pb-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${(SQUAD_COLORS as any)[boy.squad]}`}>{boy.name}'s Marks</h1>
          <p className="mt-1 text-lg text-slate-600">
            {`Squad ${boy.squad}`}
            <span className="mx-2 text-slate-300">&bull;</span>
            {isCompany ? `Year ${boy.year}` : boy.year}
            {boy.isSquadLeader && (
              <>
                <span className="mx-2 text-slate-300">&bull;</span>
                <span className="text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full align-middle">Leader</span>
              </>
            )}
          </p>
           <p className="mt-2 text-md text-slate-500">
            Total Marks: <span className="font-semibold text-slate-700">{totalMarks}</span>
            <span className="mx-2 text-slate-300">&bull;</span>
            Attendance: <span className="font-semibold text-slate-700">{attendancePercentage}%</span>
           </p>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg">
        {editedMarks.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No marks recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {editedMarks.map((mark) => {
              const isPresent = Number(mark.score) >= 0;
              const formattedDate = new Date(mark.date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

              return (
              <li key={mark.date} className="p-4 grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                <div className="sm:col-span-1">
                    <span className="font-medium text-slate-800">{formattedDate}</span>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
                  <button
                    onClick={() => handleAttendanceToggle(mark.date)}
                    className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors w-20 text-center ${
                        isPresent
                        ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                        : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                    }`}
                    aria-pressed={!isPresent}
                    aria-label={`Mark for ${formattedDate} as ${isPresent ? 'absent' : 'present'}`}
                  >
                    {isPresent ? 'Present' : 'Absent'}
                  </button>
                  
                  {isCompany ? (
                    <input
                      type="number" min="0" max="10"
                      step="0.01"
                      value={Number(mark.score) < 0 ? '' : mark.score ?? ''}
                      onChange={(e) => handleMarkChange(mark.date, 'score', e.target.value)}
                      disabled={!isPresent}
                      className={`w-20 text-center px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${accentRing}`}
                      placeholder="0-10"
                      aria-label={`Score for ${formattedDate}`}
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                        {/* Show separate inputs for Juniors if uniform/behaviour scores exist, otherwise show total. */}
                        {mark.uniformScore !== undefined ? (
                            <>
                                <input
                                  type="number" min="0" max="10"
                                  step="0.01"
                                  value={Number(mark.score) < 0 ? '' : mark.uniformScore ?? ''}
                                  onChange={(e) => handleMarkChange(mark.date, 'uniform', e.target.value)}
                                  disabled={!isPresent}
                                  className={`w-20 text-center px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${accentRing}`}
                                  placeholder="Uniform"
                                  aria-label={`Uniform score for ${formattedDate}`}
                                />
                                <input
                                  type="number" min="0" max="5"
                                  step="0.01"
                                  value={Number(mark.score) < 0 ? '' : mark.behaviourScore ?? ''}
                                  onChange={(e) => handleMarkChange(mark.date, 'behaviour', e.target.value)}
                                  disabled={!isPresent}
                                  className={`w-20 text-center px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${accentRing}`}
                                  placeholder="Behaviour"
                                  aria-label={`Behaviour score for ${formattedDate}`}
                                />
                            </>
                        ) : (
                            <span className="w-44 text-center text-sm text-slate-500">Total: {mark.score}</span>
                        )}
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteMark(mark.date)}
                    className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-100"
                    aria-label={`Delete mark for ${formattedDate}`}
                  >
                    <TrashIcon className="h-5 w-5"/>
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
      
       {/* Floating Action Button for saving changes */}
       {isDirty && (
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`fixed bottom-6 right-6 z-10 w-14 h-14 rounded-full text-white shadow-lg hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 ${accentBg}`}
            aria-label="Save Changes"
          >
            {isSaving ? (
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : <SaveIcon className="h-7 w-7" />}
          </button>
       )}
    </div>
  );
};

export default BoyMarksPage;