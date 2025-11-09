import React, { useMemo } from 'react';
import { Boy, Squad, Section, JuniorSquad } from '../types';

interface DashboardPageProps {
  boys: Boy[];
  activeSection: Section;
}

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

const DashboardPage: React.FC<DashboardPageProps> = ({ boys, activeSection }) => {
  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

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

  const allMonths = useMemo(() => {
    const allMonthStrings = new Set<string>();
    boys.forEach(boy => {
      boy.marks.forEach(mark => {
        allMonthStrings.add(mark.date.substring(0, 7)); // "YYYY-MM"
      });
    });
    return Array.from(allMonthStrings).sort((a, b) => b.localeCompare(a));
  }, [boys]);

  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce((total, mark) => total + (mark.score > 0 ? mark.score : 0), 0);
  };

  const getMarksForMonth = (boy: Boy, month: string) => {
    const total = boy.marks
      .filter(mark => mark.date.startsWith(month) && mark.score >= 0)
      .reduce((sum, mark) => sum + mark.score, 0);
      
    const hasMarksInMonth = boy.marks.some(mark => mark.date.startsWith(month));
    
    return hasMarksInMonth ? total.toString() : <span className="text-slate-400">-</span>;
  };
  
  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  };

  const sortedSquads = Object.keys(boysBySquad).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      
      {sortedSquads.map((squad) => (
        <div key={squad}>
          <h2 className="text-2xl font-semibold mb-4 text-slate-800">{`Squad ${squad}`}</h2>
          <div className="shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="sticky left-0 bg-slate-100 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6 z-10 w-48 min-w-[12rem]">Name</th>
                    {allMonths.map(month => (
                      <th key={month} scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900 w-24">{formatMonth(month)}</th>
                    ))}
                    <th scope="col" className="sticky right-0 bg-slate-100 px-3 py-3.5 text-center text-sm font-semibold text-slate-900 w-28 min-w-[7rem]">All Time Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {boysBySquad[squad].map(boy => (
                    <tr key={boy.id}>
                      <td className="sticky left-0 bg-white whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 z-10 w-48 min-w-[12rem]">
                        <div className={`${(SQUAD_COLORS as any)[boy.squad]}`}>
                          {boy.name}
                          {squadLeaders[squad] === boy.id && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>
                          )}
                        </div>
                      </td>
                      {allMonths.map(month => (
                        <td key={`${boy.id}-${month}`} className="whitespace-nowrap px-3 py-4 text-sm text-center text-slate-500">
                          {getMarksForMonth(boy, month)}
                        </td>
                      ))}
                      <td className="sticky right-0 bg-white whitespace-nowrap px-3 py-4 text-sm text-center font-semibold text-slate-900 w-28 min-w-[7rem]">
                        {calculateTotalMarks(boy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
      {boys.length === 0 && (
          <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-slate-900">No members yet!</h3>
              <p className="mt-1 text-sm text-slate-500">Add some boys on the Home page to see the dashboard.</p>
          </div>
      )}
    </div>
  );
};

export default DashboardPage;