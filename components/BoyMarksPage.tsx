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

  if (loading) return <BoyMarksPageSkeleton />;
  if (!boy) return <div>Boy not found</div>;

  return (
    <div className="pb-20">
      <h1 className={`text-3xl font-bold ${(SQUAD_COLORS as any)[boy.squad]}`}>{boy.name}'s Marks</h1>
      <div className="bg-white shadow-md rounded-lg mt-6">
        <ul className="divide-y divide-slate-200">
            {editedMarks.map(mark => (
                <BoyMarksRow 
                    key={mark.date} 
                    mark={mark} 
                    isCompany={isCompany} 
                    formattedDate={new Date(mark.date).toLocaleDateString()} 
                    isPresent={Number(mark.score) >= 0} 
                    accentRing={isCompany ? 'focus:ring-blue-500' : 'focus:ring-red-500'} 
                    onAttendanceToggle={handleAttendanceToggle} 
                    onMarkChange={handleMarkChange} 
                    onDelete={d => setEditedMarks(curr => curr.filter(m => m.date !== d))} 
                />
            ))}
        </ul>
      </div>
      {isDirty && <button onClick={handleSave} className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow flex items-center justify-center"><SaveIcon className="h-7 w-7"/></button>}
    </div>
  );
};

export default BoyMarksPage;