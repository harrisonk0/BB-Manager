/**
 * @file WeeklyMarksPage.tsx
 * @description This page allows officers to enter marks for all boys for a specific date.
 * It handles different marking schemes for Company and Junior sections and includes logic
 * for attendance. All changes for a given date are saved in a single batch operation.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Boy, Squad, Section, JuniorSquad, SectionSettings, ToastType } from '../types';
import { updateBoy, createAuditLog } from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { SaveIcon, LockClosedIcon, LockOpenIcon, ClipboardDocumentListIcon } from './Icons';

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

// Section-specific color mappings for squad names.
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

// Type definitions for the local state of marks, which can be partially entered.
type JuniorMarkState = { uniform: number | '', behaviour: number | '' };
type CompanyMarkState = number | string;

/**
 * Calculates the date of the nearest upcoming meeting day based on settings.
 * @param meetingDay The day of the week for meetings (0=Sun, 1=Mon...).
 * @returns A date string in 'YYYY-MM-DD' format.
 */
const getNearestMeetingDay = (meetingDay: number): string => {
  const today = new Date();
  const currentDay = today.getDay();
  let diff = meetingDay - currentDay;
  if (diff < 0) {
    diff += 7; // Ensure we always find the *next* meeting day, not a past one.
  }
  today.setDate(today.getDate() + diff);
  return today.toISOString().split('T')[0];
};

const WeeklyMarksPage: React.FC<WeeklyMarksPageProps> = ({ boys, refreshData, setHasUnsavedChanges, activeSection, settings, showToast }) => {
  // --- STATE MANAGEMENT ---
  const [selectedDate, setSelectedDate] = useState('');
  const [marks, setMarks] = useState<Record<string, CompanyMarkState | JuniorMarkState>>({});
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // Tracks if there are unsaved changes.
  const [isLocked, setIsLocked] = useState(false); // Read-only state for past dates.

  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

  /**
   * EFFECT: Sets the initial date for the marks page based on the user's settings.
   */
  useEffect(() => {
    if (settings && !selectedDate) {
      setSelectedDate(getNearestMeetingDay(settings.meetingDay));
    }
  }, [settings, selectedDate]);
  
  /**
   * EFFECT: Automatically locks the page if the selected date is in the past.
   */
  useEffect(() => {
    if (!selectedDate) return;
    const todayString = new Date().toISOString().split('T')[0];
    setIsLocked(selectedDate < todayString);
  }, [selectedDate]);

  /**
   * EFFECT: Populates the marks and attendance state based on the selected date and boys data.
   * This runs whenever the date changes, pulling existing marks for that day or setting defaults.
   */
  useEffect(() => {
    if (!selectedDate) return;

    const newMarks: Record<string, CompanyMarkState | JuniorMarkState> = {};
    const newAttendance: Record<string, 'present' | 'absent'> = {};

    boys.forEach(boy => {
      if (boy.id) {
        const markForDate = boy.marks.find(m => m.date === selectedDate);
        if (markForDate) {
          if (markForDate.score < 0) { // Boy was marked absent.
            newAttendance[boy.id] = 'absent';
            newMarks[boy.id] = isCompany ? -1 : { uniform: -1, behaviour: -1 };
          } else { // Boy was present, load their existing scores.
            newAttendance[boy.id] = 'present';
            newMarks[boy.id] = isCompany
              ? markForDate.score
              : { uniform: markForDate.uniformScore ?? '', behaviour: markForDate.behaviourScore ?? '' };
          }
        } else { // No mark exists for this date, default to present with empty scores.
          newAttendance[boy.id] = 'present';
          newMarks[boy.id] = isCompany ? '' : { uniform: '', behaviour: '' };
        }
      }
    });
    setMarks(newMarks);
    setAttendance(newAttendance);
    setIsDirty(false); // Reset dirty state on date change.
  }, [selectedDate, boys, isCompany]);

  /**
   * EFFECT: Manages the 'beforeunload' event to warn users about unsaved changes.
   * Also communicates the dirty state to the parent App component.
   */
  useEffect(() => {
    setHasUnsavedChanges(isDirty);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = ''; // Required by browsers to show the confirmation prompt.
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setHasUnsavedChanges(false);
    };
  }, [isDirty, setHasUnsavedChanges]);
  
  // --- EVENT HANDLERS ---
  const handleCompanyMarkChange = (boyId: string, score: string) => {
    const numericScore = parseFloat(score); // Use parseFloat
    // Basic validation for Company section marks.
    if (score === '' || (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 10)) {
      setMarks(prev => ({ ...prev, [boyId]: score }));
      setIsDirty(true);
    }
  };

  const handleJuniorMarkChange = (boyId: string, type: 'uniform' | 'behaviour', score: string) => {
    const maxScore = type === 'uniform' ? 10 : 5;
    const numericScore = parseFloat(score); // Use parseFloat
    // Basic validation for Junior section marks.
    if (score === '' || (!isNaN(numericScore) && numericScore >= 0 && numericScore <= maxScore)) {
      // FIX: Ensure the object created always has both uniform and behaviour properties to match JuniorMarkState type.
      setMarks(prev => {
        const currentMark = (prev[boyId] as JuniorMarkState) || { uniform: '', behaviour: '' };
        return { ...prev, [boyId]: { ...currentMark, [type]: score } };
      });
      setIsDirty(true);
    }
  };

  const handleAttendanceToggle = (boyId: string) => {
    const newStatus = attendance[boyId] === 'present' ? 'absent' : 'present';
    setAttendance(prev => ({ ...prev, [boyId]: newStatus }));

    if (newStatus === 'absent') {
      // If absent, set score to -1.
      setMarks(prev => ({ ...prev, [boyId]: isCompany ? -1 : { uniform: -1, behaviour: -1 } }));
    } else {
      // If toggled back to present, restore their previous mark for this date if it exists, otherwise clear it.
      const markForDate = boys.find(b => b.id === boyId)?.marks.find(m => m.date === selectedDate);
      const presentMark = (markForDate && markForDate.score >= 0);
      
      if(isCompany) {
        setMarks(prev => ({ ...prev, [boyId]: presentMark ? markForDate.score : '' }));
      } else {
        setMarks(prev => ({ ...prev, [boyId]: presentMark ? { uniform: markForDate.uniformScore ?? '', behaviour: markForDate.behaviourScore ?? '' } : { uniform: '', behaviour: '' } }));
      }
    }
    setIsDirty(true);
  };

  /**
   * Core save logic. This function processes all local state changes, determines which boys
   * need updating, bundles these updates into a single transaction, and creates a single audit log entry.
   */
  const handleSaveMarks = async () => {
    setIsSaving(true);
    
    const changedBoysOldData: Boy[] = [];
    // Map over all boys to create an array of update promises.
    const updates = boys.map(boy => {
        if (!boy.id) return Promise.resolve(null);
        
        const markIndex = boy.marks.findIndex(m => m.date === selectedDate);
        let updatedMarks = [...boy.marks];
        let hasChanged = false;
        
        const attendanceStatus = attendance[boy.id];

        if (attendanceStatus === 'absent') {
            const finalScore = -1;
            if (markIndex > -1) { // A mark for this date already exists
                if (updatedMarks[markIndex].score !== finalScore) { // It has changed
                    updatedMarks[markIndex] = { date: selectedDate, score: finalScore };
                    hasChanged = true;
                }
            } else { // No mark existed, so it's a new entry
                updatedMarks.push({ date: selectedDate, score: finalScore });
                hasChanged = true;
            }
        } else { // 'present'
            if (isCompany) {
                const newScoreRaw = marks[boy.id] as CompanyMarkState;
                const newScore = typeof newScoreRaw === 'string' ? parseFloat(newScoreRaw) : newScoreRaw; // Use parseFloat
                // Default empty strings to 0.
                const finalScore = (newScoreRaw !== '' && !isNaN(newScore as number)) ? newScore : 0;

                if (markIndex > -1) {
                    if (updatedMarks[markIndex].score !== finalScore || updatedMarks[markIndex].uniformScore !== undefined) {
                        updatedMarks[markIndex] = { date: selectedDate, score: finalScore as number };
                        hasChanged = true;
                    }
                } else {
                    updatedMarks.push({ date: selectedDate, score: finalScore as number });
                    hasChanged = true;
                }
            } else { // Junior Section
                const newScores = marks[boy.id] as JuniorMarkState;
                const uniformScore = newScores.uniform === '' ? 0 : parseFloat(String(newScores.uniform));
                const behaviourScore = newScores.behaviour === '' ? 0 : parseFloat(String(newScores.behaviour));
                const finalScore = uniformScore + behaviourScore;
                
                if (markIndex > -1) {
                    const oldMark = updatedMarks[markIndex];
                    if (oldMark.score !== finalScore || oldMark.uniformScore !== uniformScore || oldMark.behaviourScore !== behaviourScore) {
                        updatedMarks[markIndex] = { date: selectedDate, score: finalScore, uniformScore, behaviourScore };
                        hasChanged = true;
                    }
                } else {
                    updatedMarks.push({ date: selectedDate, score: finalScore, uniformScore, behaviourScore });
                    hasChanged = true;
                }
            }
        }
        
        // If this boy's marks have changed, add them to the update list.
        if (hasChanged) {
            changedBoysOldData.push(JSON.parse(JSON.stringify(boy))); // Deep copy for revert data.
            return updateBoy({ ...boy, marks: updatedMarks }, activeSection);
        }
        return Promise.resolve(null);
    });

    try {
        // If any boys were changed, create a single, comprehensive audit log entry.
        if (changedBoysOldData.length > 0) {
            const auth = getAuthInstance();
            const userEmail = auth.currentUser?.email || 'Unknown User';
            await createAuditLog({
                userEmail,
                actionType: 'UPDATE_BOY',
                description: `Updated weekly marks for ${selectedDate} for ${changedBoysOldData.length} boys.`,
                revertData: { boysData: changedBoysOldData }, // Save all old boy objects for potential revert.
            }, activeSection);
        }
        await Promise.all(updates);
        showToast('Marks saved successfully!', 'success');
        refreshData();
        setIsDirty(false);
    } catch(error) {
        console.error("Failed to save marks", error);
        showToast('Failed to save marks. Please try again.', 'error');
    } finally {
        setIsSaving(false);
    }
  };
  
  // --- MEMOIZED COMPUTATIONS for rendering ---
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    boys.forEach(boy => {
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
            if (typeof yearA === 'string' && typeof yearB === 'string') {
                return yearB.localeCompare(yearA);
            }
            if (typeof yearA === 'number' && typeof yearB === 'number') {
                return yearB - yearA;
            }
            return a.name.localeCompare(b.name);
        });
    }
    return grouped;
  }, [boys]);

  const squadLeaders = useMemo(() => {
    const leaders: Record<string, string | undefined> = {};
    Object.keys(boysBySquad).forEach(squad => {
        const squadBoys = boysBySquad[squad];
        if (squadBoys.length === 0) return;
        let leader = squadBoys.find(b => b.isSquadLeader);
        if (!leader) {
            leader = squadBoys[0];
        }
        if (leader) {
            leaders[squad] = leader.id;
        }
    });
    return leaders;
  }, [boysBySquad]);
  
  /**
   * Memoized calculation of real-time attendance stats for each squad.
   * This provides immediate feedback as the user marks attendance.
   */
  const squadAttendanceStats = useMemo(() => {
    const stats: Record<string, { present: number; total: number; percentage: number }> = {};
    for (const squad in boysBySquad) {
      const squadBoys = boysBySquad[squad];
      const total = squadBoys.length;
      if (total === 0) {
        stats[squad] = { present: 0, total: 0, percentage: 0 };
        continue;;
      }
      const present = squadBoys.filter(boy => boy.id && attendance[boy.id] === 'present').length;
      const percentage = Math.round((present / total) * 100);
      stats[squad] = { present, total, percentage };
    }
    return stats;
  }, [boysBySquad, attendance]);

  // --- RENDER LOGIC ---
  const sortedSquads = Object.keys(boysBySquad).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue focus:ring-company-blue disabled:bg-company-blue' : 'bg-junior-blue focus:ring-junior-blue disabled:bg-junior-blue';
  
  if (!settings) {
    return <div className="text-center p-8">Loading settings...</div>;
  }
  
  const accentTextColor = isCompany ? 'text-company-blue' : 'text-junior-blue';

  if (boys.length === 0) {
      return (
          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 lg:p-10">
              <div className="space-y-6">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Weekly Marks</h1>
                  <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md mt-8">
                      <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-slate-400" />
                      <h3 className="mt-4 text-xl font-semibold text-slate-900">No Members to Mark</h3>
                      <p className="mt-2 text-md text-slate-500">
                          You can't record marks until you've added members to your section.
                      </p>
                      <p className="mt-4 text-md text-slate-500">
                          Go to the <strong className={accentTextColor}>Home</strong> page to build your roster.
                      </p>
                  </div>
              </div>
          </div>
      );
  }

  const isPastDate = selectedDate < today;

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 lg:p-10">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Weekly Marks</h1>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className={`px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none ${accentRing}`}
            />
            {isPastDate && (
              <button
                onClick={() => setIsLocked(prev => !prev)}
                className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentRing}`}
                title={isLocked ? 'Unlock to edit past marks' : 'Lock page'}
                aria-label={isLocked ? 'Unlock to edit past marks' : 'Lock page'}
              >
                {isLocked ? <LockClosedIcon className="h-5 w-5" /> : <LockOpenIcon className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-8 pb-20">
          {sortedSquads.map((squad) => (
            <div key={squad}>
              <div className="flex justify-between items-baseline mb-4">
                <h2 className="text-2xl font-semibold text-slate-800">{`Squad ${squad}`}</h2>
                {squadAttendanceStats[squad] && (
                  <div className="text-right">
                    <p className="font-semibold text-slate-600">
                      Attendance: {squadAttendanceStats[squad].percentage}%
                    </p>
                    <p className="text-sm text-slate-500">
                      ({squadAttendanceStats[squad].present} / {squadAttendanceStats[squad].total} present)
                    </p>
                  </div>
                )}
              </div>
              <div className="bg-white shadow-md rounded-lg">
                <ul className="divide-y divide-slate-200">
                  {boysBySquad[squad].map((boy) => {
                      if (!boy.id) return null;
                      const isPresent = attendance[boy.id] === 'present';
                      return (
                        <li key={boy.id} className="p-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                          <div className="flex-1">
                            <span className={`text-lg font-medium ${(SQUAD_COLORS as any)[boy.squad]}`}>
                              {boy.name}
                              {squadLeaders[squad] === boy.id && (
                                  <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>
                              )}
                            </span>
                            <p className="text-sm text-slate-500">{isCompany ? `Year ${boy.year}` : boy.year}</p>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-4">
                            <button
                              onClick={() => handleAttendanceToggle(boy.id!)}
                              disabled={isLocked}
                              className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors w-20 text-center ${
                                  isPresent
                                  ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                                  : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                              } disabled:opacity-70 disabled:cursor-not-allowed`}
                              aria-pressed={!isPresent}
                              aria-label={`Mark ${boy.name} as ${isPresent ? 'absent' : 'present'}`}
                            >
                              {isPresent ? 'Present' : 'Absent'}
                            </button>
                            {isCompany ? (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                /* Added step for decimals */
                                step="0.01"
                                // FIX: Use Number() to correctly compare union type with number and fix TS errors. This also fixes a parser error with operator precedence.
                                value={Number(marks[boy.id] as CompanyMarkState) < 0 ? '' : marks[boy.id] as CompanyMarkState ?? ''}
                                onChange={e => handleCompanyMarkChange(boy.id!, e.target.value)}
                                disabled={!isPresent || isLocked}
                                className={`w-20 text-center px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${accentRing}`}
                                placeholder="0-10"
                              />
                            ) : (
                               <div className="flex items-center space-x-2">
                                  <div>
                                      <label htmlFor={`uniform-${boy.id}`} className="block text-xs text-center text-slate-500">Uniform</label>
                                      <input
                                        id={`uniform-${boy.id}`}
                                        type="number" min="0" max="10"
                                        /* Added step for decimals */
                                        step="0.01"
                                        // FIX: Use Number() to correctly compare union type with number and fix TS errors.
                                        value={Number((marks[boy.id] as JuniorMarkState)?.uniform) < 0 ? '' : (marks[boy.id] as JuniorMarkState)?.uniform ?? ''}
                                        onChange={e => handleJuniorMarkChange(boy.id!, 'uniform', e.target.value)}
                                        disabled={!isPresent || isLocked}
                                        className={`w-16 text-center px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${accentRing}`}
                                        placeholder="/10"
                                      />
                                  </div>
                                  <div>
                                      <label htmlFor={`behaviour-${boy.id}`} className="block text-xs text-center text-slate-500">Behaviour</label>
                                      <input
                                        id={`behaviour-${boy.id}`}
                                        type="number" min="0" max="5"
                                        /* Added step for decimals */
                                        step="0.01"
                                        // FIX: Use Number() to correctly compare union type with number and fix TS errors.
                                        value={Number((marks[boy.id] as JuniorMarkState)?.behaviour) < 0 ? '' : (marks[boy.id] as JuniorMarkState)?.behaviour ?? ''}
                                        onChange={e => handleJuniorMarkChange(boy.id!, 'behaviour', e.target.value)}
                                        disabled={!isPresent || isLocked}
                                        className={`w-16 text-center px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${accentRing}`}
                                        placeholder="/5"
                                      />
                                  </div>
                               </div>
                            )}
                          </div>
                        </li>
                      );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>

         {/* Floating Action Button for saving */}
         {isDirty && (
            <button
              onClick={handleSaveMarks}
              disabled={isSaving}
              className={`fixed bottom-6 right-6 z-10 w-14 h-14 rounded-full text-white shadow-lg hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 ${accentBg}`}
              aria-label="Save Marks"
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
    </div>
  );
};

export default WeeklyMarksPage;