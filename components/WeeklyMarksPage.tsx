import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Boy, Section, SectionSettings, ToastType } from '../types';
import { saveWeeklyMarksSnapshot } from '../services/db';
import { describeError, reportError } from '../services/observability';
import { SaveIcon, LockClosedIcon, LockOpenIcon, ClipboardDocumentListIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import DatePicker from './DatePicker'; // Import the new DatePicker component
import Modal from './Modal';
import { getDefaultMarksDate, getTodayString, addLocalDays } from './weeklyMarksDates';
import {
  CompanyMarkState,
  JuniorMarkState,
  AttendanceStatus,
  buildWeeklyMarksSnapshot,
} from './weeklyMarksSavePlan';
import { shouldConfirmWeeklyMarksDateChange } from './weeklyMarksDateChange';
import { squadDisplayName, squadTextClass, withSettingsSquads } from '../services/sectionSquads';

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
  if (current === 'present') return 'absent';
  if (current === 'absent') return undefined;
  return 'present';
};

const WeeklyMarksPage: React.FC<WeeklyMarksPageProps> = ({ boys, refreshData, setHasUnsavedChanges, activeSection, settings, showToast }) => {
  // --- STATE MANAGEMENT ---
  const [selectedDate, setSelectedDate] = useState('');
  const [marks, setMarks] = useState<Record<string, CompanyMarkState | JuniorMarkState>>({});
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [today, setToday] = useState(getTodayString);
  const [isLocked, setIsLocked] = useState(false); // Read-only state for past dates.
  const [markErrors, setMarkErrors] = useState<Record<string, { score?: string; uniform?: string; behaviour?: string }>>({});
  const [pendingDate, setPendingDate] = useState('');
  const [isDateChangeConfirmOpen, setIsDateChangeConfirmOpen] = useState(false);
  const isSavingRef = useRef(false);


  const isCompany = activeSection === 'company';
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
      setToday(currentToday => {
        const nextToday = getTodayString();
        return currentToday === nextToday ? currentToday : nextToday;
      });
    };

    refreshToday();
    window.addEventListener('focus', refreshToday);
    document.addEventListener('visibilitychange', refreshToday);
    const intervalId = window.setInterval(refreshToday, 60_000);

    return () => {
      window.removeEventListener('focus', refreshToday);
      document.removeEventListener('visibilitychange', refreshToday);
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
        } else {
          newAttendance[boy.id] = undefined;
          newMarks[boy.id] = isCompany ? '' : { uniform: '', behaviour: '' };
        }
      }
    });
    setMarks(newMarks);
    setAttendance(newAttendance);
    setMarkErrors({}); // Clear errors on date change.
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
  const validateAndSetMark = (boyId: string, type: 'score' | 'uniform' | 'behaviour', scoreStr: string, max: number) => {
    const numericScore = parseFloat(scoreStr);
    let error: string | undefined;

    if (scoreStr === '') {
      error = undefined; // No error for empty string
    } else if (isNaN(numericScore)) {
      error = 'Invalid number';
    } else if (numericScore < 0 || numericScore > max) {
      error = `Must be between 0 and ${max}`;
    } else if (scoreStr.includes('.') && scoreStr.split('.')[1].length > 2) {
      error = 'Max 2 decimal places';
    }

    setMarkErrors(prev => ({
      ...prev,
      [boyId]: { ...prev[boyId], [type]: error }
    }));

    setMarks(prev => {
      if (isCompany) {
        return { ...prev, [boyId]: scoreStr };
      }
      const currentMark = (prev[boyId] as JuniorMarkState) || { uniform: '', behaviour: '' };
      return { ...prev, [boyId]: { ...currentMark, [type]: scoreStr } };
    });
  };

  const handleCompanyMarkChange = (boyId: string, score: string) => {
    validateAndSetMark(boyId, 'score', score, 10);
  };

  const handleJuniorMarkChange = (boyId: string, type: 'uniform' | 'behaviour', score: string) => {
    const maxScore = type === 'uniform' ? 10 : 5;
    validateAndSetMark(boyId, type, score, maxScore);
  };

  const handleAttendanceToggle = (boyId: string) => {
    const newStatus = nextAttendanceStatus(attendance[boyId]);
    setAttendance(prev => ({ ...prev, [boyId]: newStatus }));

    if (newStatus === 'absent') {
      setMarks(prev => ({ ...prev, [boyId]: isCompany ? -1 : { uniform: -1, behaviour: -1 } }));
      setMarkErrors(prev => ({ ...prev, [boyId]: {} }));
      return;
    }

    if (newStatus === undefined) {
      setMarks(prev => ({ ...prev, [boyId]: isCompany ? '' : { uniform: '', behaviour: '' } }));
      setMarkErrors(prev => ({ ...prev, [boyId]: {} }));
      return;
    }

    const markForDate = boys.find(b => b.id === boyId)?.marks.find(m => m.date === selectedDate);
    const presentMark = (markForDate && markForDate.score >= 0);

    if (isCompany) {
      setMarks(prev => ({ ...prev, [boyId]: presentMark ? markForDate.score : '' }));
    } else {
      setMarks(prev => ({ ...prev, [boyId]: presentMark ? { uniform: markForDate.uniformScore ?? '', behaviour: markForDate.behaviourScore ?? '' } : { uniform: '', behaviour: '' } }));
    }
  };

  const handleClearAllMarks = () => {
    if (isLocked) {
      showToast('Unlock the page to edit past marks.', 'info');
      return;
    }
    const newMarks: Record<string, CompanyMarkState | JuniorMarkState> = {};
    const newAttendance: Record<string, AttendanceStatus> = {};

    boys.forEach(boy => {
      if (boy.id) {
        newAttendance[boy.id] = undefined;
        newMarks[boy.id] = isCompany ? '' : { uniform: '', behaviour: '' };
      }
    });
    setMarks(newMarks);
    setAttendance(newAttendance);
    setMarkErrors({});
    showToast('All marks cleared.', 'info');
  };

  const requestDateChange = (nextDate: string) => {
    if (!nextDate || nextDate === selectedDate) {
      return;
    }

    if (shouldConfirmWeeklyMarksDateChange({
      currentDate: selectedDate,
      nextDate,
      isDirty: hasPendingChanges,
    })) {
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
    setPendingDate('');
    setIsDateChangeConfirmOpen(false);
  };

  const cancelDateChange = () => {
    setPendingDate('');
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
    const hasErrors = Object.values(markErrors).some(boyErrors =>
      Object.values(boyErrors).some(error => error !== undefined)
    );

    if (hasErrors) {
      showToast('Please correct the errors before saving.', 'error');
      return;
    }

    if (!hasPendingChanges) {
      showToast('No changes to save.', 'info');
      return;
    }

    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
        await saveWeeklyMarksSnapshot(activeSection, selectedDate, pendingSnapshot);
        showToast('Marks saved successfully!', 'success');
        refreshData();
    } catch (error) {
        reportError(error, 'saveWeeklyMarks');
        showToast(describeError(error, 'Failed to save marks. Please try again.'), 'error');
    } finally {
        isSavingRef.current = false;
        setIsSaving(false);
    }
  };
  
  // --- MEMOIZED COMPUTATIONS for rendering ---
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

  /**
   * Memoized calculation of real-time attendance stats for each squad.
   * This provides immediate feedback as the user marks attendance.
   */
  const squadAttendanceStats = useMemo(() => {
    const stats: Record<string, { present: number; recorded: number; percentage: number | null }> = {};
    for (const squad in boysBySquad) {
      const squadBoys = boysBySquad[squad];
      const recorded = squadBoys.filter((boy) => boy.id && (attendance[boy.id] === 'present' || attendance[boy.id] === 'absent'));
      const present = recorded.filter((boy) => boy.id && attendance[boy.id] === 'present').length;
      stats[squad] = {
        present,
        recorded: recorded.length,
        percentage: recorded.length === 0 ? null : Math.round((present / recorded.length) * 100),
      };
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
      );
  }

  const isPastDate = selectedDate < today;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Weekly Marks</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePreviousWeek}
            className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentRing}`}
            aria-label="Previous week"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <DatePicker
            value={selectedDate}
            onChange={requestDateChange}
            accentRingClass={accentRing}
            ariaLabel="Select weekly marks date"
            // Removed disabled={isLocked} - DatePicker is now always enabled
          />
          <button
            onClick={handleNextWeek}
            className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentRing}`}
            aria-label="Next week"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <div className="flex space-x-2 ml-4"> {/* Added ml-4 for separation */}
            <button
              onClick={handleClearAllMarks}
              disabled={isLocked}
              className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Clear All Marks
            </button>
          </div>
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
      
      <div className="space-y-8">
        {sortedSquads.map((squad) => (
          <div key={squad}>
            <div className="flex justify-between items-baseline mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">{squadDisplayName(configuredSquads, Number(squad))}</h2>
              {squadAttendanceStats[squad] && (
                <div className="text-right">
                  <p className="font-semibold text-slate-600">
                    {squadAttendanceStats[squad].percentage === null
                      ? 'Attendance: Not recorded'
                      : `Attendance: ${squadAttendanceStats[squad].percentage}%`}
                  </p>
                  <p className="text-sm text-slate-500">
                    ({squadAttendanceStats[squad].present} / {squadAttendanceStats[squad].recorded} recorded)
                  </p>
                </div>
              )}
            </div>
            <div className="bg-white shadow-md rounded-lg">
              <ul className="divide-y divide-slate-200">
                {boysBySquad[squad].map((boy) => {
                    if (!boy.id) return null;
                    const status = attendance[boy.id];
                    const isPresent = status === 'present';
                    const isAbsent = status === 'absent';
                    const boyErrors = markErrors[boy.id] || {};
                    const attendanceLabel = isPresent ? 'Present' : isAbsent ? 'Absent' : 'Not recorded';
                    const attendanceNextLabel = isPresent
                      ? `Mark ${boy.name} as absent`
                      : isAbsent
                        ? `Clear attendance for ${boy.name}`
                        : `Mark ${boy.name} as present`;

                    return (
                      <li key={boy.id} className="p-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                        <div className="flex-1">
                          <span className={`text-lg font-medium ${squadTextClass(activeSection, boy.squad)}`}>
                            {boy.name}
                            {boy.isSquadLeader && (
                                <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>
                            )}
                          </span>
                          <p className="text-sm text-slate-500">{isCompany ? `Year ${boy.year}` : boy.year}</p>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <button
                            onClick={() => handleAttendanceToggle(boy.id!)}
                            disabled={isLocked}
                            className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors w-28 text-center ${
                                isPresent
                                ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                                : isAbsent
                                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-slate-400'
                            } disabled:opacity-70 disabled:cursor-not-allowed`}
                            aria-pressed={isPresent}
                            aria-label={attendanceNextLabel}
                          >
                            {attendanceLabel}
                          </button>
                          {isCompany ? (
                            <div className="flex flex-col items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.01"
                                  aria-label={`Score for ${boy.name}`}
                                  // FIX: Use Number() to correctly compare union type with number and fix TS errors. This also fixes a parser error with operator precedence.
                                  value={Number(marks[boy.id] as CompanyMarkState) < 0 ? '' : marks[boy.id] as CompanyMarkState ?? ''}
                                  onChange={e => handleCompanyMarkChange(boy.id!, e.target.value)}
                                  disabled={!isPresent || isLocked}
                                  className={`w-20 text-center px-2 py-1 bg-white border rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${boyErrors.score ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
                                  placeholder="0-10"
                                />
                                {boyErrors.score && <p className="text-red-500 text-xs mt-1">{boyErrors.score}</p>}
                            </div>
                          ) : (
                             <div className="flex items-center space-x-2">
                                <div className="flex flex-col items-center">
                                    <label htmlFor={`uniform-${boy.id}`} className="block text-xs text-center text-slate-500">Uniform</label>
                                    <input
                                      id={`uniform-${boy.id}`}
                                      type="number" min="0" max="10"
                                      step="0.01"
                                      // FIX: Use Number() to correctly compare union type with number and fix TS errors.
                                      value={Number((marks[boy.id] as JuniorMarkState)?.uniform) < 0 ? '' : (marks[boy.id] as JuniorMarkState)?.uniform ?? ''}
                                      onChange={e => handleJuniorMarkChange(boy.id!, 'uniform', e.target.value)}
                                      disabled={!isPresent || isLocked}
                                      className={`w-16 text-center px-2 py-1 bg-white border rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${boyErrors.uniform ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
                                      placeholder="/10"
                                    />
                                    {boyErrors.uniform && <p className="text-red-500 text-xs mt-1">{boyErrors.uniform}</p>}
                                </div>
                                <div className="flex flex-col items-center">
                                    <label htmlFor={`behaviour-${boy.id}`} className="block text-xs text-center text-slate-500">Behaviour</label>
                                    <input
                                      id={`behaviour-${boy.id}`}
                                      type="number" min="0" max="5"
                                      step="0.01"
                                      // FIX: Use Number() to correctly compare union type with number and fix TS errors.
                                      value={Number((marks[boy.id] as JuniorMarkState)?.behaviour) < 0 ? '' : (marks[boy.id] as JuniorMarkState)?.behaviour ?? ''}
                                      onChange={e => handleJuniorMarkChange(boy.id!, 'behaviour', e.target.value)}
                                      disabled={!isPresent || isLocked}
                                      className={`w-16 text-center px-2 py-1 bg-white border rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${boyErrors.behaviour ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
                                      placeholder="/5"
                                    />
                                    {boyErrors.behaviour && <p className="text-red-500 text-xs mt-1">{boyErrors.behaviour}</p>}
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

       {hasPendingChanges && (
          <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 mt-6 px-4 sm:px-6 lg:px-8 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-200/95 border-t border-slate-300 backdrop-blur">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveMarks}
                disabled={isSaving}
                className={`inline-flex items-center px-4 py-2 rounded-md text-white shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${accentBg}`}
              >
                {isSaving ? (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : <SaveIcon className="h-5 w-5 mr-2" />}
                {isSaving ? 'Saving…' : 'Save Marks'}
              </button>
            </div>
          </div>
      )}

      <Modal isOpen={isDateChangeConfirmOpen} onClose={cancelDateChange} title="Discard unsaved marks?">
        <div className="space-y-4">
          <p className="text-slate-600">
            Changing the date will discard the unsaved changes on this sheet. Continue?
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={cancelDateChange}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={confirmDateChange}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Change Date
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WeeklyMarksPage;
