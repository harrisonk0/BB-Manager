import React, { useState, useMemo } from 'react';
import { Boy, Squad, View, Section, JuniorSquad } from '../types';
import Modal from './Modal';
import BoyForm from './BoyForm';
import { PencilIcon, ChartBarIcon, PlusIcon, TrashIcon, SearchIcon } from './Icons';
import { deleteBoyById, createAuditLog } from '../services/db';
import { getAuthInstance } from '../services/firebase';

interface HomePageProps {
  boys: Boy[];
  setView: (view: View) => void;
  refreshData: () => void;
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

const HomePage: React.FC<HomePageProps> = ({ boys, setView, refreshData, activeSection }) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boyToEdit, setBoyToEdit] = useState<Boy | null>(null);
  const [boyToDelete, setBoyToDelete] = useState<Boy | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

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
      }, activeSection);
      
      await deleteBoyById(boyToDelete.id!, activeSection);
      
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
    const grouped: Record<string, Boy[]> = {};
    filteredBoys.forEach(boy => {
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
                return yearB.localeCompare(yearA); // P7 > P6
            }
            if (typeof yearA === 'number' && typeof yearB === 'number') {
                return yearB - yearA; // 14 > 13
            }
            return a.name.localeCompare(b.name);
        });
    }

    return grouped;
  }, [filteredBoys]);

  const squadLeaders = useMemo(() => {
    const leaders: Record<string, string | undefined> = {};
    const allBoysBySquad: Record<string, Boy[]> = {};

    boys.forEach(boy => {
      if (!allBoysBySquad[boy.squad]) {
        allBoysBySquad[boy.squad] = [];
      }
      allBoysBySquad[boy.squad].push(boy);
    });
    
    for (const squad of Object.keys(allBoysBySquad)) {
      allBoysBySquad[squad].sort((a, b) => {
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

    Object.keys(allBoysBySquad).forEach(squad => {
      const squadBoys = allBoysBySquad[squad];
      if (squadBoys.length === 0) return;
      let leader = squadBoys.find(b => b.isSquadLeader);
      if (!leader && squadBoys.length > 0) {
        leader = squadBoys[0];
      }
      if (leader) {
        leaders[squad] = leader.id;
      }
    });
    return leaders;
  }, [boys]);


  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce((total, mark) => total + (mark.score > 0 ? mark.score : 0), 0);
  };
  
  const calculateAttendancePercentage = (boy: Boy) => {
    if (boy.marks.length === 0) return 0;
    const attendedCount = boy.marks.filter(m => m.score >= 0).length;
    return Math.round((attendedCount / boy.marks.length) * 100);
  };

  const calculateSquadTotalMarks = (squadBoys: Boy[]) => {
    return squadBoys.reduce((total, boy) => total + calculateTotalMarks(boy), 0);
  };

  const calculateSquadAttendancePercentage = (squadBoys: Boy[]) => {
    const totalPossibleAttendances = squadBoys.reduce((acc, boy) => acc + boy.marks.length, 0);
    if (totalPossibleAttendances === 0) return 0;
    const totalActualAttendances = squadBoys.reduce((acc, boy) => acc + boy.marks.filter(m => m.score >= 0).length, 0);
    return Math.round((totalActualAttendances / totalPossibleAttendances) * 100);
  };

  const sortedSquads = Object.keys(boysBySquad).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentTextHover = isCompany ? 'hover:text-company-blue' : 'hover:text-junior-blue';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Members</h1>
        <button
          onClick={handleAddBoy}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'}`}
        >
          <PlusIcon className="h-5 w-5 mr-2"/>
          Add Boy
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 sm:text-sm ${accentRing}`}
          aria-label="Search members"
        />
      </div>

      {boys.length === 0 && (
          <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-slate-900">No members yet!</h3>
              <p className="mt-1 text-sm text-slate-500">Click "Add Boy" to get started.</p>
          </div>
      )}

      {boys.length > 0 && filteredBoys.length === 0 && (
          <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-slate-900">No members found</h3>
              <p className="mt-1 text-sm text-slate-500">Your search for "{searchQuery}" did not match any members.</p>
          </div>
      )}

      {sortedSquads.map((squad) => (
        <div key={squad}>
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-2xl font-semibold text-slate-800">{`Squad ${squad}`}</h2>
            <div className="text-right">
              <p className="font-semibold text-slate-600">
                Total Marks: {calculateSquadTotalMarks(boysBySquad[squad])}
              </p>
              <p className="text-sm text-slate-500">
                Avg Attendance: {calculateSquadAttendancePercentage(boysBySquad[squad])}%
              </p>
            </div>
          </div>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <ul className="divide-y divide-slate-200">
              {boysBySquad[squad].map((boy) => (
                <li key={boy.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <p className={`text-lg font-medium ${(SQUAD_COLORS as any)[boy.squad]}`}>
                        {boy.name}
                        {squadLeaders[boy.squad] === boy.id && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span>
                        )}
                    </p>
                    <p className="text-sm text-slate-500">
                      {isCompany ? `Year ${boy.year}` : boy.year} &bull; Total Marks: {calculateTotalMarks(boy)} &bull; Attendance: {calculateAttendancePercentage(boy)}%
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setView({ page: 'boyMarks', boyId: boy.id! })}
                      className={`p-3 text-slate-500 rounded-full hover:bg-slate-100 ${accentTextHover}`}
                      aria-label={`View marks for ${boy.name}`}
                    >
                      <ChartBarIcon />
                    </button>
                    <button
                      onClick={() => handleEditBoy(boy)}
                      className={`p-3 text-slate-500 rounded-full hover:bg-slate-100 ${accentTextHover}`}
                      aria-label={`Edit ${boy.name}`}
                    >
                      <PencilIcon />
                    </button>
                     <button
                      onClick={() => handleOpenDeleteModal(boy)}
                      className="p-3 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-100"
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
      ))}

      <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={boyToEdit ? 'Edit Boy' : 'Add New Boy'}>
        <BoyForm boyToEdit={boyToEdit} onSave={handleSave} onClose={handleCloseFormModal} activeSection={activeSection} />
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Confirm Deletion">
        {boyToDelete && (
          <div className="space-y-4">
            <p className="text-slate-600">Are you sure you want to delete <strong className="font-semibold text-slate-800">{boyToDelete.name}</strong>? This action cannot be undone directly, but can be reverted from the audit log.</p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
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