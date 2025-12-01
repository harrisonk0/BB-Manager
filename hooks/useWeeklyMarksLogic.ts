import { useState, useEffect } from 'react';
import { Boy, Section } from '../types';

type JuniorMarkState = { uniform: number | '', behaviour: number | '' };
type CompanyMarkState = number | string;

export const useWeeklyMarksLogic = (boys: Boy[], selectedDate: string, activeSection: Section) => {
  const [marks, setMarks] = useState<Record<string, CompanyMarkState | JuniorMarkState>>({});
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [markErrors, setMarkErrors] = useState<Record<string, { score?: string; uniform?: string; behaviour?: string }>>({});
  const [isDirty, setIsDirty] = useState(false);

  const isCompany = activeSection === 'company';

  useEffect(() => {
    if (!selectedDate) return;

    const newMarks: Record<string, CompanyMarkState | JuniorMarkState> = {};
    const newAttendance: Record<string, 'present' | 'absent'> = {};

    boys.forEach(boy => {
      if (boy.id) {
        const markForDate = boy.marks.find(m => m.date === selectedDate);
        if (markForDate) {
          if (markForDate.score < 0) {
            newAttendance[boy.id] = 'absent';
            newMarks[boy.id] = isCompany ? -1 : { uniform: -1, behaviour: -1 };
          } else {
            newAttendance[boy.id] = 'present';
            newMarks[boy.id] = isCompany
              ? markForDate.score
              : { uniform: markForDate.uniformScore ?? '', behaviour: markForDate.behaviourScore ?? '' };
          }
        } else {
          newAttendance[boy.id] = 'present';
          newMarks[boy.id] = isCompany ? '' : { uniform: '', behaviour: '' };
        }
      }
    });
    setMarks(newMarks);
    setAttendance(newAttendance);
    setIsDirty(false);
    setMarkErrors({});
  }, [selectedDate, boys, isCompany]);

  const updateMark = (boyId: string, val: CompanyMarkState | JuniorMarkState) => {
      setMarks(prev => ({ ...prev, [boyId]: val }));
      setIsDirty(true);
  };

  const updateAttendance = (boyId: string, status: 'present' | 'absent') => {
      setAttendance(prev => ({ ...prev, [boyId]: status }));
      setIsDirty(true);
  };

  const setError = (boyId: string, error: { score?: string; uniform?: string; behaviour?: string }) => {
      setMarkErrors(prev => ({ ...prev, [boyId]: { ...prev[boyId], ...error } }));
  };

  return { marks, attendance, markErrors, isDirty, setIsDirty, updateMark, updateAttendance, setError, setMarks, setAttendance, setMarkErrors };
};