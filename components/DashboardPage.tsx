import React, { useMemo } from 'react';
import { Boy, Squad } from '../types';

interface DashboardPageProps {
  boys: Boy[];
}

const SQUAD_COLORS: Record<Squad, string> = {
  1: 'text-red-600 dark:text-red-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-yellow-600 dark:text-yellow-400',
};

const DashboardPage: React.FC<DashboardPageProps> = ({ boys }) => {
  const boysBySquad = useMemo(() => {
    const grouped: Record<Squad, Boy[]> = { 1: [], 2: [], 3: [] };
    boys.forEach(boy => {
      if (grouped[boy.squad]) {
        grouped[boy.squad].push(boy);
      }
    });

    for (const squadNum of Object.keys(grouped)) {
        const key = squadNum as unknown as Squad;
        grouped[key].sort((a, b) => {
            const yearA = a.year || 0;
            const yearB = b.year || 0;
            if (yearA !== yearB) {
                return yearB - yearA;
            }
            return a.name.localeCompare(b.name);
        });
    }

    return grouped;
  }, [boys]);

  const squadLeaders = useMemo(() => {
    const leaders: Record<string, string | undefined> = {};
    (Object.keys(boysBySquad) as unknown as Squad[]).forEach(squadNum => {
        const squadBoys = boysBySquad[squadNum];
        if (squadBoys.length === 0) return;

        let leader = squadBoys.find(b => b.isSquadLeader);
        if (!leader) {
            leader = squadBoys[0];
        }
        if (leader) {
            leaders[squadNum] = leader.id;
        }
    });
    return leaders;
  }, [boysBySquad]);

  const allWeeks = useMemo(() => {
    const allDates = new Set<string>();
    boys.forEach(boy => {
      boy.marks.forEach(mark => {
        allDates.add(mark.date);
      });
    });
    // Sort all dates, most recent first
    return Array.from(allDates).sort((a, b) => b.localeCompare(a));
  }, [boys]);

  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce((total, mark) => total + (mark.score > 0 ? mark.score : 0), 0);
  };

  const getMarkForDate = (boy: Boy, date: string) => {
    const mark = boy.marks.find(m => m.date === date);
    if (mark === undefined || mark.score < 0) return <span className="text-gray-400">-</span>;
    return mark.score.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
      
      {(Object.keys(boysBySquad) as unknown as Squad[]).map((squad) => (
        boysBySquad[squad].length > 0 && (
        <div key={squad}>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Squad {squad}</h2>
          <div className="shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6 z-10 w-48 min-w-[12rem]">Name</th>
                    {allWeeks.map(date => (
                      <th key={date} scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-white w-20">{formatDate(date)}</th>
                    ))}
                    <th scope="col" className="sticky right-0 bg-gray-50 dark:bg-gray-700 px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-white w-28 min-w-[7rem]">All Time Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {boysBySquad[squad].map(boy => (
                    <tr key={boy.id}>
                      <td className="sticky left-0 bg-white dark:bg-gray-800 whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6 z-10 w-48 min-w-[12rem]">
                        <div className={`${SQUAD_COLORS[boy.squad]}`}>
                          {boy.name}
                          {squadLeaders[boy.squad] === boy.id && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>
                          )}
                        </div>
                      </td>
                      {allWeeks.map(date => (
                        <td key={`${boy.id}-${date}`} className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                          {getMarkForDate(boy, date)}
                        </td>
                      ))}
                      <td className="sticky right-0 bg-white dark:bg-gray-800 whitespace-nowrap px-3 py-4 text-sm text-center font-semibold text-gray-900 dark:text-white w-28 min-w-[7rem]">
                        {calculateTotalMarks(boy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      ))}
      {boys.length === 0 && (
          <div className="text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No members yet!</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add some boys on the Home page to see the dashboard.</p>
          </div>
      )}
    </div>
  );
};

export default DashboardPage;