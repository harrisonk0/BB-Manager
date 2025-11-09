import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBoyById, updateBoy, createAuditLog } from '../services/db';
import { Boy, Mark, Squad } from '../types';
import { TrashIcon, SaveIcon } from './Icons';
import { getAuthInstance } from '../services/firebase';
import { BoyMarksPageSkeleton } from './SkeletonLoaders';

interface BoyMarksPageProps {
  boyId: string;
  refreshData: () => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
}

const SQUAD_COLORS: Record<Squad, string> = {
  1: 'text-red-600 dark:text-red-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-yellow-600 dark:text-yellow-400',
};

type EditableMark = Omit<Mark, 'score'> & { score: number | '' };

const BoyMarksPage: React.FC<BoyMarksPageProps> = ({ boyId, refreshData, setHasUnsavedChanges }) => {
  const [boy, setBoy] = useState<Boy | null>(null);
  const [editedMarks, setEditedMarks] = useState<EditableMark[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const boyData = await fetchBoyById(boyId);
      if (boyData) {
        boyData.marks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBoy(boyData);
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
  }, [boyId]);

  useEffect(() => {
    fetchBoyData();
  }, [fetchBoyData]);

  useEffect(() => {
    if (boy) {
      const originalMarksSorted = [...boy.marks].sort((a, b) => a.date.localeCompare(b.date));
      const editedMarksSorted = [...editedMarks]
        .filter(m => m.score !== '')
        .map(m => ({ ...m, score: Number(m.score) }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setIsDirty(JSON.stringify(originalMarksSorted) !== JSON.stringify(editedMarksSorted));
    } else {
        setIsDirty(false);
    }
  }, [boy, editedMarks]);
  
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

  const handleScoreChange = (date: string, newScoreStr: string) => {
    const newScore = parseInt(newScoreStr, 10);
    if (newScoreStr === '' || (!isNaN(newScore) && newScore >= 0 && newScore <= 10)) {
      setEditedMarks(currentMarks =>
        currentMarks.map(mark =>
          mark.date === date ? { ...mark, score: newScoreStr === '' ? '' : newScore } : mark
        )
      );
    }
  };

  const handleAttendanceToggle = (date: string) => {
    setEditedMarks(currentMarks =>
      currentMarks.map(mark => {
        if (mark.date === date) {
          const newScore = mark.score < 0 ? '' : -1;
          return { ...mark, score: newScore };
        }
        return mark;
      })
    );
  };

  const handleDeleteMark = (date: string) => {
    setEditedMarks(currentMarks => currentMarks.filter(mark => mark.date !== date));
  };

  const handleSaveChanges = async () => {
    if (!boy || !isDirty) return;
    setIsSaving(true);
    setError(null);

    const validMarks: Mark[] = editedMarks
      .filter(mark => mark.score !== '' && mark.score !== null)
      .map(mark => ({ ...mark, score: Number(mark.score) }));

    const updatedBoyData = { ...boy, marks: validMarks };

    try {
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      
      await createAuditLog({
        userEmail,
        actionType: 'UPDATE_BOY',
        description: `Updated marks for ${boy.name}.`,
        revertData: { boyData: JSON.parse(JSON.stringify(boy)) },
      });

      await updateBoy(updatedBoyData);
      updatedBoyData.marks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBoy(updatedBoyData);
      setEditedMarks(JSON.parse(JSON.stringify(updatedBoyData.marks)));
      refreshData();
      setIsDirty(false);
    } catch (err) {
      setError('Failed to save changes. Please try again.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const { totalMarks, attendancePercentage } = useMemo(() => {
    if (editedMarks.length === 0) {
      return { totalMarks: 0, attendancePercentage: 0 };
    }

    const attendedMarks = editedMarks.filter(m => Number(m.score) >= 0);
    const attendedCount = attendedMarks.length;
    const percentage = Math.round((attendedCount / editedMarks.length) * 100);
    const total = attendedMarks.reduce((sum, mark) => sum + (Number(mark.score) || 0), 0);
    return { totalMarks: total, attendancePercentage: percentage };
  }, [editedMarks]);

  if (loading) return <BoyMarksPageSkeleton />;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  if (!boy) return <div className="text-center p-8">Boy data not available.</div>;

  return (
    <div className="pb-20">
      <div className="mb-6 pb-4 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${SQUAD_COLORS[boy.squad]}`}>{boy.name}'s Marks</h1>
          <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
            Squad {boy.squad}
            {boy.year ? ` • Year ${boy.year}` : ''}
            {boy.isSquadLeader && (
              <>
                <span className="mx-1">&bull;</span>
                <span className="text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full align-middle">Leader</span>
              </>
            )}
          </p>
           <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
            Total Marks: {totalMarks}
            <span className="mx-1">&bull;</span>
            Attendance: {attendancePercentage}%
           </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
        {editedMarks.length === 0 ? (
          <p className="p-6 text-center text-gray-500 dark:text-gray-400">No marks recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {editedMarks.map((mark) => {
              const isPresent = mark.score >= 0;
              const formattedDate = new Date(mark.date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

              return (
              <li key={mark.date} className="p-4 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                <span className="font-medium text-gray-800 dark:text-gray-200">{formattedDate}</span>
                <div className="flex items-center space-x-2 sm:space-x-4">
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
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={mark.score < 0 ? '' : mark.score ?? ''}
                    onChange={(e) => handleScoreChange(mark.date, e.target.value)}
                    disabled={!isPresent}
                    className="w-20 text-center px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-bb-blue focus:border-bb-blue disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="0-10"
                    aria-label={`Score for ${formattedDate}`}
                  />
                  <button
                    onClick={() => handleDeleteMark(mark.date)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label={`Delete mark for ${formattedDate}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
      
       {isDirty && (
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="fixed bottom-6 right-6 z-10 w-14 h-14 rounded-full bg-bb-blue text-white shadow-lg hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bb-blue disabled:bg-bb-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
