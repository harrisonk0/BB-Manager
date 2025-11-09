import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Boy, Squad, Section, JuniorSquad } from '../types';
import { updateBoy, createAuditLog } from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { SaveIcon } from './Icons';

interface WeeklyMarksPageProps {
  boys: Boy[];
  refreshData: () => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
  activeSection: Section;
}

const COMPANY_SQUAD_COLORS: Record<Squad, string> = {
  1: 'text-red-600 dark:text-red-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-yellow-600 dark:text-yellow-400',
};

const JUNIOR_SQUAD_COLORS: Record<JuniorSquad, string> = {
  'Red': 'text-red-600 dark:text-red-400',
  'Green': 'text-green-600 dark:text-green-400',
  'Blue': 'text-blue-600 dark:text-blue-400',
  'Yellow': 'text-yellow-600 dark:text-yellow-400',
};

const getNearestFriday = (): string => {
  const today = new Date();
  const day = today.getDay();
  const diffToFriday = 5 - day;
  today.setDate(today.getDate() + diffToFriday);
  return today.toISOString().split('T')[0];
};

const WeeklyMarksPage: React.FC<WeeklyMarksPageProps> = ({ boys, refreshData, setHasUnsavedChanges, activeSection }) => {
  const [selectedDate, setSelectedDate] = useState(getNearestFriday());
  const [marks, setMarks] = useState<Record<string, number | string>>({});
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

  useEffect(() => {
    const newMarks: Record<string, number | string> = {};
    const newAttendance: Record<string, 'present' | 'absent'> = {};

    boys.forEach(boy => {
        if (boy.id) {
            const markForDate = boy.marks.find(m => m.date === selectedDate);
            if (markForDate) {
                if (markForDate.score < 0) { // Absent is stored as -1
                    newAttendance[boy.id] = 'absent';
                    newMarks[boy.id] = -1;
                } else {
                    newAttendance[boy.id] = 'present';
                    newMarks[boy.id] = markForDate.score;
                }
            } else {
                newAttendance[boy.id] = 'present';
                newMarks[boy.id] = '';
            }
        }
    });
    setMarks(newMarks);
    setAttendance(newAttendance);
    setIsDirty(false);
  }, [selectedDate, boys]);

  useEffect(() => {
    setHasUnsavedChanges(isDirty);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = ''; // Required for modern browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setHasUnsavedChanges(false);
    };
  }, [isDirty, setHasUnsavedChanges]);

  const handleMarkChange = (boyId: string, score: string) => {
    const numericScore = parseInt(score, 10);
    if (score === '' || (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 10)) {
        setMarks(prev => ({ ...prev, [boyId]: score }));
        setIsDirty(true);
    }
  };
  
  const handleAttendanceToggle = (boyId: string) => {
    const newStatus = attendance[boyId] === 'present' ? 'absent' : 'present';
    setAttendance(prev => ({ ...prev, [boyId]: newStatus }));
    
    if (newStatus === 'absent') {
        setMarks(prev => ({ ...prev, [boyId]: -1 }));
    } else {
        const markForDate = boys.find(b => b.id === boyId)?.marks.find(m => m.date === selectedDate);
        setMarks(prev => ({ ...prev, [boyId]: (markForDate && markForDate.score >= 0) ? markForDate.score : '' }));
    }
    setIsDirty(true);
  };

  const handleSaveMarks = async () => {
    setIsSaving(true);
    
    const changedBoysOldData: Boy[] = [];
    const updates = boys.map(boy => {
        if (!boy.id) return Promise.resolve(null);
        
        const attendanceStatus = attendance[boy.id];
        const newScoreRaw = marks[boy.id];
        
        const markIndex = boy.marks.findIndex(m => m.date === selectedDate);
        let updatedMarks = [...boy.marks];
        let hasChanged = false;

        if (attendanceStatus === 'absent') {
            const finalScore = -1;
            if (markIndex > -1) {
                if (updatedMarks[markIndex].score !== finalScore) {
                    updatedMarks[markIndex].score = finalScore;
                    hasChanged = true;
                }
            } else {
                updatedMarks.push({ date: selectedDate, score: finalScore });
                hasChanged = true;
            }
        } else { // 'present'
            const newScore = typeof newScoreRaw === 'string' ? parseInt(newScoreRaw, 10) : newScoreRaw;
            const defaultScore = isCompany ? (newScoreRaw !== '' && !isNaN(newScore as number) ? newScore : 0) : 1; // 1 for present in Junior, 0 default for Company
            const finalScore = defaultScore as number;

            if (markIndex > -1) {
                if (updatedMarks[markIndex].score !== finalScore) {
                    updatedMarks[markIndex].score = finalScore;
                    hasChanged = true;
                }
            } else {
                updatedMarks.push({ date: selectedDate, score: finalScore });
                hasChanged = true;
            }
        }
        
        if (hasChanged) {
            changedBoysOldData.push(JSON.parse(JSON.stringify(boy))); // Deep copy
            return updateBoy({ ...boy, marks: updatedMarks }, activeSection);
        }
        return Promise.resolve(null);
    });

    try {
        if (changedBoysOldData.length > 0) {
            const auth = getAuthInstance();
            const userEmail = auth.currentUser?.email || 'Unknown User';
            await createAuditLog({
                userEmail,
                actionType: 'UPDATE_BOY',
                description: `Updated weekly marks for ${selectedDate} for ${changedBoysOldData.length} boys.`,
                revertData: { boysData: changedBoysOldData },
            }, activeSection);
        }
        await Promise.all(updates);
        refreshData();
        setIsDirty(false);
    } catch(error) {
        console.error("Failed to save marks", error);
    } finally {
        setIsSaving(false);
    }
  };

  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    boys.forEach(boy => {
      if (!grouped[boy.squad]) {
        grouped[boy.squad] = [];
      }
      grouped[boy.squad].push(boy);
    });
    
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

  const sortedSquads = Object.keys(boysBySquad).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Weekly Marks</h1>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-bb-blue focus:border-bb-blue"
          />
        </div>
      </div>
      
      <div className="space-y-8 pb-20">
        {sortedSquads.map((squad) => (
          <div key={squad}>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{isCompany ? `Squad ${squad}` : squad}</h2>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {boysBySquad[squad].map((boy) => {
                    if (!boy.id) return null;
                    const isPresent = attendance[boy.id] === 'present';
                    return (
                      <li key={boy.id} className="p-4 flex justify-between items-center">
                        <div>
                          <span className={`text-lg font-medium ${(SQUAD_COLORS as any)[boy.squad]}`}>
                            {boy.name}
                            {squadLeaders[boy.squad] === boy.id && (
                                <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>
                            )}
                          </span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{isCompany ? `Year ${boy.year}` : boy.year}</p>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <button
                            onClick={() => handleAttendanceToggle(boy.id!)}
                            className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors w-20 text-center ${
                                isPresent
                                ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                                : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                            }`}
                            aria-pressed={!isPresent}
                            aria-label={`Mark ${boy.name} as ${isPresent ? 'absent' : 'present'}`}
                          >
                            {isPresent ? 'Present' : 'Absent'}
                          </button>
                          {isCompany && (
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={marks[boy.id] < 0 ? '' : marks[boy.id] ?? ''}
                              onChange={e => handleMarkChange(boy.id!, e.target.value)}
                              disabled={!isPresent}
                              className="w-20 text-center px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-bb-blue focus:border-bb-blue disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed"
                              placeholder="0-10"
                            />
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

       {isDirty && (
          <button
            onClick={handleSaveMarks}
            disabled={isSaving}
            className="fixed bottom-6 right-6 z-10 w-14 h-14 rounded-full bg-bb-blue text-white shadow-lg hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bb-blue disabled:bg-bb-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
  );
};

export default WeeklyMarksPage;
