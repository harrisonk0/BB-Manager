import React from 'react';
import { CompanyMarkInput, JuniorMarkInput } from './MarkInputs';
import { TrashIcon } from './Icons';

interface BoyMarksRowProps {
  mark: any;
  isCompany: boolean;
  formattedDate: string;
  isPresent: boolean;
  accentRing: string;
  onAttendanceToggle: (date: string) => void;
  onMarkChange: (date: string, type: 'score' | 'uniform' | 'behaviour', val: string) => void;
  onDelete: (date: string) => void;
}

const BoyMarksRow: React.FC<BoyMarksRowProps> = ({ mark, isCompany, formattedDate, isPresent, accentRing, onAttendanceToggle, onMarkChange, onDelete }) => {
  return (
    <li className="p-4 grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
      <div className="sm:col-span-1"><span className="font-medium text-slate-800">{formattedDate}</span></div>
      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
        <button onClick={() => onAttendanceToggle(mark.date)} className={`px-3 py-1 rounded text-white ${isPresent ? 'bg-green-600' : 'bg-red-600'}`}>
          {isPresent ? 'Present' : 'Absent'}
        </button>
        {isCompany ? (
          <CompanyMarkInput boyId="edit" score={mark.score} isPresent={isPresent} isLocked={false} accentRing={accentRing} onChange={v => onMarkChange(mark.date, 'score', v)} />
        ) : (
          <JuniorMarkInput 
            boyId="edit" 
            uniform={mark.uniformScore} behaviour={mark.behaviourScore} 
            isPresent={isPresent} isLocked={false} accentRing={accentRing} 
            onUniformChange={v => onMarkChange(mark.date, 'uniform', v)} 
            onBehaviourChange={v => onMarkChange(mark.date, 'behaviour', v)} 
          />
        )}
        <button onClick={() => onDelete(mark.date)} className="p-2 text-slate-500 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>
      </div>
    </li>
  );
};

export default BoyMarksRow;