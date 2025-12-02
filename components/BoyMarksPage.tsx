"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBoyById, updateBoy } from '../services/db';
import { Boy, Mark, Section, ToastType } from '../types';
import { SaveIcon } from './Icons';
import { BoyMarksPageSkeleton } from './SkeletonLoaders';
import { Logger } from '../services/logger';
import { COMPANY_SQUAD_COLORS, JUNIOR_SQUAD_COLORS } from '../src/constants';
import BoyMarksRow from './BoyMarksRow';

interface BoyMarksPageProps {
  boyId: string;
  refreshData: () => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
  encryptionKey: CryptoKey | null;
}

const BoyMarksPage: React.FC<BoyMarksPageProps> = ({ boyId, refreshData, setHasUnsavedChanges, activeSection, showToast, encryptionKey }) => {
  const [boy, setBoy] = useState<Boy | null>(null);
  const [editedMarks, setEditedMarks] = useState<any[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

  const fetchBoyData = useCallback(async () => {
    if (!encryptionKey) return setLoading(false);
    setLoading(true);
    try {
      const boyData = await fetchBoyById(boyId, activeSection, encryptionKey);
      if (boyData) {
        boyData.marks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBoy(boyData);
        setEditedMarks(JSON.parse(JSON.stringify(boyData.marks)));
      }
    } catch (err) { Logger.error("Error loading boy data", err); } 
    finally { setLoading(false); }
  }, [boyId, activeSection, encryptionKey]);

  useEffect(() => { fetchBoyData(); }, [fetchBoyData]);

  useEffect(() => {
    if (boy) setIsDirty(JSON.stringify(boy.marks) !== JSON.stringify(editedMarks));
  }, [boy, editedMarks]);

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
    const h = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isDirty, setHasUnsavedChanges]);

  const handleMarkChange = (date: string, type: string, val: string) => {
    const num = parseFloat(val);
    setEditedMarks(curr => curr.map(m => {
        if (m.date !== date) return m;
        const up = { ...m };
        if (type === 'score') up.score = val === '' ? '' : num;
        if (type === 'uniform') up.uniformScore = val === '' ? '' : num;
        if (type === 'behaviour') up.behaviourScore = val === '' ? '' : num;
        return up;
    }));
  };

  const handleAttendanceToggle = (date: string) => {
    setEditedMarks(curr => curr.map(m => {
        if (m.date !== date) return m;
        const isPresent = Number(m.score) >= 0;
        return { ...m, score: isPresent ? -1 : (isCompany ? '' : 0), uniformScore: isPresent ? undefined : '', behaviourScore: isPresent ? undefined : '' };
    }));
  };

  const handleSave = async () => {
      if (!boy || !encryptionKey) return;
      const validMarks = editedMarks.map(m => ({
          date: m.date,
          score: Number(m.score) < 0 ? -1 : (isCompany ? (m.score === '' ? 0 : m.score) : (m.uniformScore || 0) + (m.behaviourScore || 0)),
          uniformScore: m.uniformScore === '' ? 0 : m.uniformScore,
          behaviourScore: m.behaviourScore === '' ? 0 : m.behaviourScore
      }));
      try {
          await updateBoy({ ...boy, marks: validMarks }, activeSection, encryptionKey);
          showToast('Saved', 'success'); refreshData(); setIsDirty(false); fetchBoyData();
      } catch (e) { showToast('Save failed', 'error'); }
  };

  // --- Memoized Stats ---
  const { totalMarks, attendancePercentage, totalMeetings } = useMemo(() => {
    if (!boy) return { totalMarks: 0, attendancePercentage: 0, totalMeetings: 0 };
    
    const presentMarks = boy.marks.filter(m => m.score >= 0);
    const totalMarks = presentMarks.reduce((sum, m) => sum + m.score, 0);
    const totalMeetings = boy.marks.length;
    const attendancePercentage = totalMeetings > 0 
        ? Math.round((presentMarks.length / totalMeetings) * 100) 
        : 0;

    return { totalMarks, attendancePercentage, totalMeetings };
  }, [boy]);
  // ----------------------

  if (loading) return <BoyMarksPageSkeleton />;
  if (!boy) return <div>Boy not found</div>;

  const accentColorClass = (SQUAD_COLORS as any)[boy.squad];

  return (
    <div className="pb-20">
      {/* Summary Header */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border-t-4" style={{ borderTopColor: accentColorClass.replace('text-', 'var(--tw-text-opacity, 1) ') }}>
        <div className="flex items-center justify-between">
            <h1 className={`text-3xl font-bold ${accentColorClass}`}>{boy.name}</h1>
            {boy.isSquadLeader && <span className="text-sm font-semibold bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full">Squad Leader</span>}
        </div>
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="border-r border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase">Squad</p>
                <p className="text-xl font-semibold text-slate-800 mt-1">{boy.squad}</p>
            </div>
            <div className="border-r border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase">Year</p>
                <p className="text-xl font-semibold text-slate-800 mt-1">{isCompany ? `Year ${boy.year}` : boy.year}</p>
            </div>
            <div className="border-r border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase">Total Marks</p>
                <p className="text-xl font-semibold text-slate-800 mt-1">{totalMarks}</p>
            </div>
            <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Attendance</p>
                <p className="text-xl font-semibold text-slate-800 mt-1">{attendancePercentage}%</p>
            </div>
        </div>
      </div>
      {/* End Summary Header */}

      <h2 className="text-2xl font-semibold text-slate-800 mb-4">Mark History ({totalMeetings} Meetings)</h2>
      
      <div className="bg-white shadow-md rounded-lg">
        <ul className="divide-y divide-slate-200">
            {editedMarks.map(mark => (
                <BoyMarksRow 
                    key={mark.date} 
                    mark={mark} 
                    isCompany={isCompany} 
                    formattedDate={new Date(mark.date).toLocaleDateString()} 
                    isPresent={Number(mark.score) >= 0} 
                    accentRing={isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} 
                    onAttendanceToggle={handleAttendanceToggle} 
                    onMarkChange={handleMarkChange} 
                    onDelete={d => setEditedMarks(curr => curr.filter(m => m.date !== d))} 
                />
            ))}
        </ul>
      </div>
      {isDirty && <button onClick={handleSave} className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow flex items-center justify-center z-30"><SaveIcon className="h-7 w-7"/></button>}
    </div>
  );
};

export default BoyMarksPage;