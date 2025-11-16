/**
 * @file DashboardPage.tsx
 * @description Displays a summary dashboard of member performance.
 * It shows a table of all members with their total marks broken down by month,
 * providing a high-level overview for reporting and comparison.
 */

import React, { useMemo } from 'react';
import { Boy, Squad, Section, JuniorSquad, Mark } from '../types';
import { StarIcon, ChartBarIcon } from './Icons';
import BarChart from './BarChart';


interface DashboardPageProps {
  boys: Boy[];
  activeSection: Section;
}

// Section-specific color mappings.
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

const SQUAD_CHART_COLORS: Record<string, string> = {
    '1': '#ef4444', // red-500
    '2': '#22c55e', // green-500
    '3': '#eab308', // yellow-500
    '4': '#3b82f6', // blue-500
}

const DashboardPage: React.FC<DashboardPageProps> = ({ boys, activeSection }) => {
  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

  if (boys.length === 0) {
    const accentTextColor = isCompany ? 'text-company-blue' : 'text-junior-blue';
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md mt-8">
                <ChartBarIcon className="mx-auto h-16 w-16 text-slate-400" />
                <h3 className="mt-4 text-xl font-semibold text-slate-900">No Data to Display</h3>
                <p className="mt-2 text-md text-slate-500">
                The dashboard will show member leaderboards, squad performance, and attendance trends once you've added members and recorded some marks.
                </p>
                <p className="mt-4 text-md text-slate-500">
                    Go to the <strong className={accentTextColor}>Home</strong> page to add your first member.
                </p>
            </div>
        </div>
    );
  }

  // --- UTILITY FUNCTIONS ---
  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce((total, mark) => total + (mark.score > 0 ? mark.score : 0), 0);
  };
  
  // --- MEMOIZED COMPUTATIONS ---
  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    boys.forEach(boy => {
      if (!grouped[boy.squad]) grouped[boy.squad] = [];
      grouped[boy.squad].push(boy);
    });
    return grouped;
  }, [boys]);

  const allMonths = useMemo(() => {
    const allMonthStrings = new Set<string>();
    boys.forEach(boy => {
      boy.marks.forEach(mark => allMonthStrings.add(mark.date.substring(0, 7)));
    });
    return Array.from(allMonthStrings).sort((a, b) => b.localeCompare(a));
  }, [boys]);

  const leaderboard = useMemo(() => {
    return [...boys]
        .map(boy => ({ ...boy, totalMarks: calculateTotalMarks(boy) }))
        .sort((a, b) => b.totalMarks - a.totalMarks)
        .slice(0, 5);
  }, [boys]);

  const squadMarksData = useMemo(() => {
    return Object.keys(boysBySquad)
        .map(squad => ({
            label: `Squad ${squad}`,
            value: boysBySquad[squad].reduce((total, boy) => total + calculateTotalMarks(boy), 0),
            color: SQUAD_CHART_COLORS[squad] || '#64748b' // slate-500
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [boysBySquad]);

  const heatmapData = useMemo(() => {
    const allDates = Array.from(new Set(boys.flatMap(b => b.marks.map(m => m.date)))).sort();
    const sortedSquads = Object.keys(boysBySquad).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

    if (allDates.length === 0 || sortedSquads.length === 0) {
        return { dates: [], squads: [], matrix: {} };
    }

    const matrix: Record<string, Record<string, number | undefined>> = {};

    sortedSquads.forEach((squad: string) => {
        matrix[squad] = {};
        const squadBoys = boysBySquad[squad];
        allDates.forEach((date: string) => {
            // Find all marks for the boys in this squad on this specific date.
            const marksForDate: Mark[] = squadBoys
                .map(b => b.marks.find(m => m.date === date))
                .filter((mark): mark is Mark => !!mark); // Filter out undefined and ensure correct type.
            
            const totalForDate = marksForDate.length;

            if (totalForDate === 0) {
                // If no one in the squad has a mark for this date, there's no data.
                matrix[squad][date] = undefined;
            } else {
                // Of those with a mark, count how many were present.
                const attended = marksForDate.filter(m => m.score >= 0).length;
                matrix[squad][date] = Math.round((attended / totalForDate) * 100);
            }
        });
    });

    return {
        dates: allDates,
        squads: sortedSquads,
        matrix: matrix
    };
  }, [boys, boysBySquad]);

  const getHeatmapColor = (percentage: number | undefined) => {
    if (percentage === undefined || isNaN(percentage)) {
        return { backgroundColor: '#f1f5f9' }; // slate-100 for N/A
    }
    const hue = (percentage / 100) * 120; // 0 (red) to 120 (green)
    return { backgroundColor: `hsl(${hue}, 80%, 88%)` }; // Using HSL for a color scale
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
      
      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
            <StarIcon className="h-6 w-6 mr-2 text-yellow-500" /> Top 5 Members
          </h2>
          {leaderboard.length > 0 ? (
            <ol className="space-y-3">
              {leaderboard.map((boy, index) => (
                <li key={boy.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`w-6 text-center font-bold text-lg ${index < 3 ? 'text-slate-800' : 'text-slate-500'}`}>{index + 1}</span>
                    <span className={`ml-3 font-medium ${(SQUAD_COLORS as any)[boy.squad]}`}>{boy.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{boy.totalMarks}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-slate-500 text-center py-4">No marks recorded yet.</p>}
        </div>

        {/* Squad Marks Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Squad Performance (Total Marks)</h2>
          {squadMarksData.some(d => d.value > 0) ? <BarChart data={squadMarksData} /> : <p className="text-slate-500 text-center py-4">No marks recorded yet.</p>}
        </div>
      </div>

      {heatmapData.dates.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
               <h2 className="text-xl font-semibold text-slate-800 mb-4">Squad Attendance Trend</h2>
               <div className="overflow-x-auto">
                 <table className="min-w-full border-separate border-spacing-px">
                    <thead>
                        <tr>
                            <th scope="col" className="py-2 px-3 text-left text-sm font-semibold text-slate-900 sticky left-0 bg-white/75 backdrop-blur-sm z-10">Squad</th>
                             {heatmapData.dates.map(date => (
                                <th key={date} scope="col" className="p-2 text-sm font-semibold text-slate-600 w-20">
                                    {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {heatmapData.squads.map(squad => (
                            <tr key={squad}>
                                <td className="py-2 px-3 font-medium text-slate-800 sticky left-0 bg-white/75 backdrop-blur-sm z-10">Squad {squad}</td>
                                {heatmapData.dates.map(date => {
                                    const percentage = heatmapData.matrix[squad]?.[date];
                                    return (
                                        <td 
                                          key={date} 
                                          className="text-center rounded-md" 
                                          style={getHeatmapColor(percentage)}
                                          title={`Squad ${squad} on ${date}: ${percentage !== undefined ? percentage + '%' : 'No data'}`}
                                        >
                                            <div className="py-2 px-1 text-sm font-semibold text-slate-700">
                                                {percentage !== undefined ? `${percentage}%` : <span className="text-slate-400">N/A</span>}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                 </table>
               </div>
          </div>
      )}

      {/* Marks Breakdown Table */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Marks Breakdown by Month</h2>
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
                {sortedSquads.flatMap(squad => boysBySquad[squad].map(boy => (
                  <tr key={boy.id}>
                    <td className="sticky left-0 bg-white whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 z-10 w-48 min-w-[12rem]">
                      <div className={`${(SQUAD_COLORS as any)[boy.squad]}`}>{boy.name}</div>
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
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;