import React, { useState, useMemo } from 'react';
import { Boy, Squad } from '../types';
import Modal from './Modal';
import BoyForm from './BoyForm';
import { PencilIcon, ChartBarIcon, PlusIcon } from './Icons';

interface HomePageProps {
  boys: Boy[];
  setView: (view: { page: 'boyMarks'; boyId: string }) => void;
  refreshData: () => void;
}

const SQUAD_COLORS: Record<Squad, string> = {
  1: 'text-red-600 dark:text-red-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-yellow-600 dark:text-yellow-400',
};

const HomePage: React.FC<HomePageProps> = ({ boys, setView, refreshData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boyToEdit, setBoyToEdit] = useState<Boy | null>(null);

  const handleAddBoy = () => {
    setBoyToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditBoy = (boy: Boy) => {
    setBoyToEdit(boy);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setBoyToEdit(null);
  };
  
  const handleSave = () => {
    handleCloseModal();
    refreshData();
  }

  const boysBySquad = useMemo(() => {
    const grouped: Record<Squad, Boy[]> = { 1: [], 2: [], 3: [] };
    boys.forEach(boy => {
      if (grouped[boy.squad]) {
        grouped[boy.squad].push(boy);
      }
    });

    // Sort within each squad by year (desc) then name (asc)
    for (const squadNum of Object.keys(grouped)) {
        const key = squadNum as unknown as Squad;
        grouped[key].sort((a, b) => {
            const yearA = a.year || 0;
            const yearB = b.year || 0;
            if (yearA !== yearB) {
                return yearB - yearA; // Descending by year
            }
            return a.name.localeCompare(b.name); // Ascending by name
        });
    }

    return grouped;
  }, [boys]);

  const squadLeaders = useMemo(() => {
    const leaders: Record<string, string | undefined> = {};
    (Object.keys(boysBySquad) as unknown as Squad[]).forEach(squadNum => {
        const squadBoys = boysBySquad[squadNum];
        if (squadBoys.length === 0) return;

        // Find explicitly marked leader
        let leader = squadBoys.find(b => b.isSquadLeader);
        
        // If no explicit leader, the first one in the sorted list is the default leader
        if (!leader) {
            leader = squadBoys[0];
        }
        
        if (leader) {
            leaders[squadNum] = leader.id;
        }
    });
    return leaders;
}, [boysBySquad]);

  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce((total, mark) => total + mark.score, 0);
  };
  
  const calculateSquadTotalMarks = (squadBoys: Boy[]) => {
    return squadBoys.reduce((total, boy) => total + calculateTotalMarks(boy), 0);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Members</h1>
        <button
          onClick={handleAddBoy}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
        >
          <PlusIcon className="h-5 w-5 mr-2"/>
          Add Boy
        </button>
      </div>

      {boys.length === 0 && (
          <div className="text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No members yet!</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click "Add Boy" to get started.</p>
          </div>
      )}

      {(Object.keys(boysBySquad) as unknown as Squad[]).map((squad) => (
        boysBySquad[squad].length > 0 && (
        <div key={squad}>
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Squad {squad}</h2>
            <p className="font-semibold text-gray-600 dark:text-gray-400">
              Total Marks: {calculateSquadTotalMarks(boysBySquad[squad])}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {boysBySquad[squad].map((boy) => (
                <li key={boy.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <p className={`text-lg font-medium ${SQUAD_COLORS[boy.squad]}`}>
                        {boy.name}
                        {squadLeaders[boy.squad] === boy.id && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>
                        )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Year {boy.year} &bull; Total Marks: {calculateTotalMarks(boy)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setView({ page: 'boyMarks', boyId: boy.id! })}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label={`View marks for ${boy.name}`}
                    >
                      <ChartBarIcon />
                    </button>
                    <button
                      onClick={() => handleEditBoy(boy)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label={`Edit ${boy.name}`}
                    >
                      <PencilIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        )
      ))}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={boyToEdit ? 'Edit Boy' : 'Add New Boy'}>
        <BoyForm boyToEdit={boyToEdit} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default HomePage;
