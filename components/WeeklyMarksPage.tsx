"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Boy, Section, SectionSettings, ToastType } from '../types';
import { updateBoy, createAuditLog } from '../services/db';
import { SaveIcon, LockClosedIcon, LockOpenIcon, ClipboardDocumentListIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import DatePicker from './DatePicker'; 
import { CompanyMarkInput, JuniorMarkInput } from './MarkInputs';
import { useSquads } from '../hooks/useSquads';
import { useWeeklyMarksLogic } from '../hooks/useWeeklyMarksLogic';
import { COMPANY_SQUAD_COLORS, JUNIOR_SQUAD_COLORS } from '../src/constants';

interface WeeklyMarksPageProps {
  boys: Boy[];
  refreshData: () => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
  activeSection: Section;
  settings: SectionSettings | null;
  showToast: (message: string, type?: ToastType) => void;
  encryptionKey: CryptoKey | null;
}

const getNearestMeetingDay = (meetingDay: number): string => {
  const today = new Date();
  const currentDay = today.getDay();
  let diff = meetingDay - currentDay;
  if (diff < 0) diff += 7;
  today.setDate(today.getDate() + diff);
  return today.toISOString().split('T')[0];
};

const WeeklyMarksPage: React.FC<WeeklyMarksPageProps> = ({ boys, refreshData, setHasUnsavedChanges, activeSection, settings, showToast, encryptionKey }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

  const { boysBySquad, sortedSquads } = useSquads(boys);
  const { marks, attendance, markErrors, isDirty, setIsDirty, updateMark, updateAttendance, setError, setMarks, setAttendance, setMarkErrors } = useWeeklyMarksLogic(boys, selectedDate, activeSection);

  useEffect(() => {
    if (settings && !selectedDate) setSelectedDate(getNearestMeetingDay(settings.meetingDay));
  }, [settings, selectedDate]);
  
  useEffect(() => {
    if (!selectedDate) return;
    const todayString = new Date().toISOString().split('T')[0];
    setIsLocked(selectedDate < todayString);
  }, [selectedDate]);

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { if (isDirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); setHasUnsavedChanges(false); };
  }, [isDirty, setHasUnsavedChanges]);

  // Validation Logic
  const validateAndSetMark = (boyId: string, type: 'score' | 'uniform' | 'behaviour', scoreStr: string, max: number) => {
    const numericScore = parseFloat(scoreStr);
    let error: string | undefined;

    if (scoreStr === '') error = undefined;
    else if (isNaN(numericScore)) error = 'Invalid number';
    else if (numericScore < 0 || numericScore > max) error = `Must be between 0 and ${max}`;
    else if (scoreStr.includes('.') && scoreStr.split('.')[1].length > 2) error = 'Max 2 decimal places';

    setError(boyId, { [type]: error });

    if (!error) {
        if (isCompany) updateMark(boyId, scoreStr);
        else {
            const currentMark = (marks[boyId] as any) || { uniform: '', behaviour: '' };
            updateMark(boyId, { ...currentMark, [type]: scoreStr });
        }
    }
  };

  const handleAttendanceToggle = (boyId: string) => {
    const newStatus = attendance[boyId] === 'present' ? 'absent' : 'present';
    updateAttendance(boyId, newStatus);

    if (newStatus === 'absent') {
      updateMark(boyId, isCompany ? -1 : { uniform: -1, behaviour: -1 });
      setMarkErrors(prev => ({ ...prev, [boyId]: {} }));
    } else {
      const markForDate = boys.find(b => b.id === boyId)?.marks.find(m => m.date === selectedDate);
      const presentMark = (markForDate && markForDate.score >= 0);
      if(isCompany) updateMark(boyId, presentMark ? markForDate.score : '');
      else updateMark(boyId, presentMark ? { uniform: markForDate.uniformScore ?? '', behaviour: markForDate.behaviourScore ?? '' } : { uniform: '', behaviour: '' });
    }
  };

  const handleSaveMarks = async () => {
    const hasErrors = Object.values(markErrors).some(boyErrors => Object.values(boyErrors).some(error => error !== undefined));
    if (hasErrors) return showToast('Please correct the errors before saving.', 'error');
    if (!encryptionKey) return showToast('Encryption key missing.', 'error');

    setIsSaving(true);
    const changedBoysOldData: Boy[] = [];
    const updates: Promise<any>[] = [];

    boys.forEach(boy => {
        if (!boy.id) return;
        const markIndex = boy.marks.findIndex(m => m.date === selectedDate);
        let updatedMarks = [...boy.marks];
        let hasChanged = false;
        
        const attendanceStatus = attendance[boy.id];
        let finalMark: any = { date: selectedDate, score: -1 };

        if (attendanceStatus === 'present') {
            if (isCompany) {
                const score = parseFloat(String(marks[boy.id]));
                finalMark = { date: selectedDate, score: isNaN(score) ? 0 : score };
            } else {
                const m = marks[boy.id] as any;
                const u = parseFloat(String(m.uniform || 0));
                const b = parseFloat(String(m.behaviour || 0));
                finalMark = { date: selectedDate, score: u + b, uniformScore: u, behaviourScore: b };
            }
        }

        if (markIndex > -1) {
            if (JSON.stringify(updatedMarks[markIndex]) !== JSON.stringify(finalMark)) { // simplified comparison
                updatedMarks[markIndex] = finalMark;
                hasChanged = true;
            }
        } else {
            updatedMarks.push(finalMark);
            hasChanged = true;
        }
        
        if (hasChanged) {
            changedBoysOldData.push(JSON.parse(JSON.stringify(boy)));
            updates.push(updateBoy({ ...boy, marks: updatedMarks }, activeSection, encryptionKey, false));
        }
    });

    try {
        if (changedBoysOldData.length > 0) {
            await createAuditLog({ actionType: 'UPDATE_BOY', description: `Updated marks for ${selectedDate}.`, revertData: { boysData: changedBoysOldData } }, activeSection, encryptionKey);
        }
        await Promise.all(updates);
        showToast('Marks saved successfully!', 'success');
        refreshData();
        setIsDirty(false);
    } catch(error) { showToast('Failed to save marks.', 'error'); } 
    finally { setIsSaving(false); }
  };

  const handleDateChange = (offset: number) => {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + offset);
      setSelectedDate(d.toISOString().split('T')[0]);
      setIsDirty(true);
  };

  // Stats Logic
  const squadAttendanceStats = useMemo(() => {
    const stats: Record<string, any> = {};
    for (const squad in boysBySquad) {
      const squadBoys = boysBySquad[squad];
      if (squadBoys.length === 0) { stats[squad] = { present: 0, total: 0, percentage: 0 }; continue; }
      const present = squadBoys.filter(boy => boy.id && attendance[boy.id] === 'present').length;
      stats[squad] = { present, total: squadBoys.length, percentage: Math.round((present / squadBoys.length) * 100) };
    }
    return stats;
  }, [boysBySquad, attendance]);

  if (!settings) return <div className="text-center p-8">Loading settings...</div>;
  if (boys.length === 0) return <div className="text-center p-16"><ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-slate-400"/><h3 className="mt-4 text-xl font-semibold">No Members</h3></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Weekly Marks</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => handleDateChange(-7)} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon className="h-5 w-5" /></button>
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
          <button onClick={() => handleDateChange(7)} className="p-2 rounded-full hover:bg-slate-100"><ChevronRightIcon className="h-5 w-5" /></button>
          {selectedDate < new Date().toISOString().split('T')[0] && <button onClick={() => setIsLocked(!isLocked)} className="p-2 rounded-full hover:bg-slate-100">{isLocked ? <LockClosedIcon className="h-5 w-5" /> : <LockOpenIcon className="h-5 w-5" />}</button>}
        </div>
      </div>
      
      <div className="space-y-8 pb-20">
        {sortedSquads.map((squad) => (
          <div key={squad}>
            <div className="flex justify-between items-baseline mb-4">
              <h2 className="text-2xl font-semibold text-slate-800">{`Squad ${squad}`}</h2>
              {squadAttendanceStats[squad] && <div className="text-right text-slate-500 text-sm">Attendance: {squadAttendanceStats[squad].percentage}% ({squadAttendanceStats[squad].present}/{squadAttendanceStats[squad].total})</div>}
            </div>
            <div className="bg-white shadow-md rounded-lg">
              <ul className="divide-y divide-slate-200">
                {boysBySquad[squad].map((boy) => {
                    if (!boy.id) return null;
                    const isPresent = attendance[boy.id] === 'present';
                    return (
                      <li key={boy.id} className="p-4 flex justify-between items-center">
                        <div className="flex-1">
                          <span className={`text-lg font-medium ${(SQUAD_COLORS as any)[boy.squad]}`}>{boy.name}</span>
                          {boy.isSquadLeader && <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>}
                        </div>
                        <div className="flex items-center space-x-4">
                          <button onClick={() => handleAttendanceToggle(boy.id!)} disabled={isLocked} className={`px-3 py-1 rounded text-white w-20 ${isPresent ? 'bg-green-600' : 'bg-red-600'} disabled:opacity-50`}>{isPresent ? 'Present' : 'Absent'}</button>
                          {isCompany ? (
                            <CompanyMarkInput boyId={boy.id} score={marks[boy.id] as any} error={markErrors[boy.id]?.score} isPresent={isPresent} isLocked={isLocked} accentRing="focus:ring-blue-500" onChange={(v) => validateAndSetMark(boy.id!, 'score', v, 10)} />
                          ) : (
                            <JuniorMarkInput boyId={boy.id} uniform={(marks[boy.id] as any).uniform} behaviour={(marks[boy.id] as any).behaviour} uniformError={markErrors[boy.id]?.uniform} behaviourError={markErrors[boy.id]?.behaviour} isPresent={isPresent} isLocked={isLocked} accentRing="focus:ring-blue-500" onUniformChange={(v) => validateAndSetMark(boy.id!, 'uniform', v, 10)} onBehaviourChange={(v) => validateAndSetMark(boy.id!, 'behaviour', v, 5)} />
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
       {isDirty && <button onClick={handleSaveMarks} disabled={isSaving} className="fixed bottom-6 right-6 z-10 w-14 h-14 rounded-full text-white bg-blue-600 shadow-lg flex items-center justify-center">{isSaving ? '...' : <SaveIcon className="h-7 w-7" />}</button>}
    </div>
  );
};

export default WeeklyMarksPage;