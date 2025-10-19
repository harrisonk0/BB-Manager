import React, { useState, useMemo } from 'react';
import { Boy, Squad, View } from '../types';
import Modal from './Modal';
import BoyForm from './BoyForm';
import { PencilIcon, ChartBarIcon, PlusIcon, TrashIcon, SearchIcon } from './Icons';
import { deleteBoyById, createAuditLog } from '../services/db';
import { getAuthInstance } from '../services/firebase';

interface HomePageProps {
  boys: Boy[];
  setView: (view: View) => void;
  refreshData: () => void;
}

const SQUAD_COLORS: Record<Squad, string> = {
  1: 'text-red-600 dark:text-red-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-yellow-600 dark:text-yellow-400',
};

const HomePage: React.FC<HomePageProps> = ({ boys, setView, refreshData }) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boyToEdit, setBoyToEdit] = useState<Boy | null>(null);
  const [boyToDelete, setBoyToDelete] = useState<Boy | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const allWeeksCount = useMemo(() => {
    const allDates = new Set<string>();
    boys.forEach(boy => {
      boy.marks.forEach(mark => allDates.add(mark.date));
    });
    return allDates.size;
  }, [boys]);

  const filteredBoys = useMemo(() => {
    if (!searchQuery.trim()) {
      return boys;
    }
    return boys.filter(boy =>
      boy.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [boys, searchQuery]);

  const handleAddBoy = () => {
    setBoyToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleEditBoy = (boy: Boy) => {
    setBoyToEdit(boy);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setBoyToEdit(null);
  };

  const handleOpenDeleteModal = (boy: Boy) => {
    setBoyToDelete(boy);
    setIsDeleteModalOpen(true);
  };
  
  const handleCloseDeleteModal = () => {
    setBoyToDelete(null);
    setIsDeleteModalOpen(false);
  };
  
  const handleDeleteBoy = async () => {
    if (!boyToDelete) return;

    try {
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      
      await createAuditLog({
          userEmail,
          actionType: 'DELETE_BOY',
          description: `Deleted boy: ${boyToDelete.name}`,
          revertData: { boyData: boyToDelete },
      });
      
      await deleteBoyById(boyToDelete.id!);
      
      refreshData();
      handleCloseDeleteModal();
    } catch (error) {
        console.error("Failed to delete boy:", error);
    }
  };

  const handleSave = () => {
    handleCloseFormModal();
    refreshData();
  }

  const boysBySquad = useMemo(() => {
    const grouped: Record<Squad, Boy[]> = { 1: [], 2: [], 3: [] };
    filteredBoys.forEach(boy => {
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
  }, [filteredBoys]);

  const squadLeaders = useMemo(() => {
    const leaders: Record<string, string | undefined> = {};
    const allBoysBySquad: Record<Squad, Boy[]> = { 1: [], 2: [], 3: [] };

    // Group all boys from the original, unfiltered list
    boys.forEach(boy => {
      if (allBoysBySquad[boy.squad]) {
        allBoysBySquad[boy.squad].push(boy);
      }
    });

    // Sort each squad in the full list to determine the correct default leader
    for (const squadNum of Object.keys(allBoysBySquad)) {
      const key = squadNum as unknown as Squad;
      allBoysBySquad[key].sort((a, b) => {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        if (yearA !== yearB) {
          return yearB - yearA; // Descending by year
        }
        return a.name.localeCompare(b.name); // Ascending by name
      });
    }

    // Determine the leader for each squad from the full, sorted list
    (Object.keys(allBoysBySquad) as unknown as Squad[]).forEach(squadNum => {
      const squadBoys = allBoysBySquad[squadNum];
      if (squadBoys.length === 0) return;

      // Find an explicitly marked leader first
      let leader = squadBoys.find(b => b.isSquadLeader);
      
      // If no explicit leader, the first one in the full sorted list is the default leader
      if (!leader && squadBoys.length > 0) {
        leader = squadBoys[0];
      }
      
      if (leader) {
        leaders[squadNum] = leader.id;
      }
    });
    return leaders;
  }, [boys]);

  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce((total, mark) => total + mark.score, 0);
  };
  
  const calculateAttendancePercentage = (boy: Boy) => {
    if (allWeeksCount === 0) return 0;
    const attendedCount = boy.marks.filter(m => m.score > 0).length;
    return Math.round((attendedCount / allWeeksCount) * 100);
  };

  const calculateSquadTotalMarks = (squadBoys: Boy[]) => {
    return squadBoys.reduce((total, boy) => total + calculateTotalMarks(boy), 0);
  };

  const calculateSquadAttendancePercentage = (squadBoys: Boy[]) => {
    if (allWeeksCount === 0 || squadBoys.length === 0) return 0;
    const totalPossibleAttendances = squadBoys.length * allWeeksCount;
    const totalActualAttendances = squadBoys.reduce((acc, boy) => acc + boy.marks.filter(m => m.score > 0).length, 0);
    return Math.round((totalActualAttendances / totalPossibleAttendances) * 100);
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

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          aria-label="Search members"
        />
      </div>

      {boys.length === 0 && (
          <div className="text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No members yet!</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click "Add Boy" to get started.</p>
          </div>
      )}

      {boys.length > 0 && filteredBoys.length === 0 && (
          <div className="text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No members found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your search for "{searchQuery}" did not match any members.</p>
          </div>
      )}

      {(Object.keys(boysBySquad) as unknown as Squad[]).map((squad) => (
        boysBySquad[squad].length > 0 && (
        <div key={squad}>
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Squad {squad}</h2>
            <div className="text-right">
              <p className="font-semibold text-gray-600 dark:text-gray-400">
                Total Marks: {calculateSquadTotalMarks(boysBySquad[squad])}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Avg Attendance: {calculateSquadAttendancePercentage(boysBySquad[squad])}%
              </p>
            </div>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Year {boy.year} &bull; Total Marks: {calculateTotalMarks(boy)} &bull; Attendance: {calculateAttendancePercentage(boy)}%
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setView({ page: 'boyMarks', boyId: boy.id! })}
                      className="p-3 text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label={`View marks for ${boy.name}`}
                    >
                      <ChartBarIcon />
                    </button>
                    <button
                      onClick={() => handleEditBoy(boy)}
                      className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label={`Edit ${boy.name}`}
                    >
                      <PencilIcon />
                    </button>
                     <button
                      onClick={() => handleOpenDeleteModal(boy)}
                      className="p-3 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label={`Delete ${boy.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        )
      ))}

      <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={boyToEdit ? 'Edit Boy' : 'Add New Boy'}>
        <BoyForm boyToEdit={boyToEdit} onSave={handleSave} onClose={handleCloseFormModal} />
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Confirm Deletion">
        {boyToDelete && (
          <div className="space-y-4">
            <p>Are you sure you want to delete <strong className="font-semibold">{boyToDelete.name}</strong>? This action cannot be undone directly, but can be reverted from the audit log.</p>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 dark:text-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBoy}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HomePage;
