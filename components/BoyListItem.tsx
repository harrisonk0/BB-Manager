import React from 'react';
import { Boy, Squad, JuniorSquad } from '../types';
import { COMPANY_SQUAD_COLORS, JUNIOR_SQUAD_COLORS } from '../src/constants';
import { ChartBarIcon, PencilIcon, TrashIcon } from './Icons';

interface BoyListItemProps {
  boy: Boy;
  isCompany: boolean;
  onView: (id: string) => void;
  onEdit: (boy: Boy) => void;
  onDelete: (boy: Boy) => void;
}

const BoyListItem: React.FC<BoyListItemProps> = ({ boy, isCompany, onView, onEdit, onDelete }) => {
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;
  const totalMarks = boy.marks.reduce((sum, m) => sum + (m.score > 0 ? m.score : 0), 0);
  const attendance = boy.marks.length > 0 
    ? Math.round((boy.marks.filter(m => m.score >= 0).length / boy.marks.length) * 100) 
    : 0;

  return (
    <li className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
      <div className="flex-1">
        <p className={`text-lg font-medium ${(SQUAD_COLORS as any)[boy.squad]}`}>
            {boy.name}
            {boy.isSquadLeader && <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
          <span>{isCompany ? `Year ${boy.year}` : boy.year}</span>
          <span>&bull; Total: {totalMarks}</span>
          <span>&bull; Att: {attendance}%</span>
        </div>
      </div>
      <div className="flex space-x-2">
        <button onClick={() => onView(boy.id!)} className="p-3 text-slate-500 rounded-full hover:bg-slate-100"><ChartBarIcon /></button>
        <button onClick={() => onEdit(boy)} className="p-3 text-slate-500 rounded-full hover:bg-slate-100"><PencilIcon /></button>
        <button onClick={() => onDelete(boy)} className="p-3 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-100"><TrashIcon /></button>
      </div>
    </li>
  );
};

export default React.memo(BoyListItem);