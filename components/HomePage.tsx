"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Boy, Squad, View, Section, JuniorSquad, ToastType, SortByType, SchoolYear, JuniorYear } from '../types';
import Modal from './Modal';
import BoyForm from './BoyForm';
import { PencilIcon, ChartBarIcon, PlusIcon, TrashIcon, SearchIcon, FilterIcon, ClipboardDocumentListIcon } from './Icons';
import { deleteBoyById, createAuditLog } from '../services/db';

interface HomePageProps {
  /** The list of all boys for the active section. */
  boys: Boy[];
  /** Function to navigate to a different view. */
  setView: (view: View) => void;
  /** Callback to trigger a refresh of the boys data from the database. */
  refreshData: () => void;
  /** The currently active section. */
  activeSection: Section;
  /** Function to display a toast notification. */
  showToast: (message: string, type?: ToastType) => void;
  /** The encryption key derived from the user session. */
  encryptionKey: CryptoKey | null;
}

// Color mappings for squad names, specific to each section.
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

const HomePage: React.FC<HomePageProps> = ({ boys, setView, refreshData, activeSection, showToast, encryptionKey }) => {
  // --- STATE MANAGEMENT ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boyToEdit, setBoyToEdit] = useState<Boy | null>(null);
  const [boyToDelete, setBoyToDelete] = useState<Boy | null>(null);
  
  // State for filtering and sorting, initialized from localStorage
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('homePageSearchQuery') || '');
  const [isSearchVisible, setIsSearchVisible] = useState(() => !!localStorage.getItem('homePageSearchQuery')); // Show search if there's a query
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortByType>(() => (localStorage.getItem('homePageSortBy') as SortByType) || 'name');
  const [filterSquad, setFilterSquad] = useState<string>(() => localStorage.getItem('homePageFilterSquad') || 'all');
  const [filterYear, setFilterYear] = useState<string>(() => localStorage.getItem('homePageFilterYear') || 'all');

  const isCompany = activeSection === 'company';
  const SQUAD_COLORS = isCompany ? COMPANY_SQUAD_COLORS : JUNIOR_SQUAD_COLORS;

  // --- EFFECTS for persisting state ---
  useEffect(() => {
    localStorage.setItem('homePageSearchQuery', searchQuery);
    setIsSearchVisible(!!searchQuery); // Keep search visible if query exists
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem('homePageSortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('homePageFilterSquad', filterSquad);
  }, [filterSquad]);

  useEffect(() => {
    localStorage.setItem('homePageFilterYear', filterYear);
  }, [filterYear]);

  // --- UTILITY FUNCTIONS ---
  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce((total, mark) => total + (mark.score > 0 ? mark.score : 0), 0);
  };
  
  const calculateAttendancePercentage = (boy: Boy) => {
    if (boy.marks.length === 0) return 0;
    const attendedCount = boy.marks.filter(m => m.score >= 0).length;
    return Math.round((attendedCount / boy.marks.length) * 100);
  };
  
  // --- MEMOIZED COMPUTATIONS ---
  const { uniqueYears, uniqueSquads } = useMemo(() => {
    const years = new Set<SchoolYear | JuniorYear>();
    const squads = new Set<Squad | JuniorSquad>();
    boys.forEach(boy => {
        years.add(boy.year);
        squads.add(boy.squad);
    });
    const sortedYears = Array.from(years).sort((a,b) => String(b).localeCompare(String(a), undefined, { numeric: true }));
    const sortedSquads = Array.from(squads).sort((a,b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    return { uniqueYears: sortedYears, uniqueSquads: sortedSquads };
  }, [boys]);

  /**
   * Memoized filtering of boys. This is a key performance optimization.
   */
  const filteredBoys = useMemo(() => {
    return boys
      .filter(boy => filterSquad === 'all' || String(boy.squad) === filterSquad)
      .filter(boy => filterYear === 'all' || String(boy.year) === filterYear)
      .filter(boy => !searchQuery.trim() || boy.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [boys, searchQuery, filterSquad, filterYear]);

  /**
   * Memoized grouping and sorting of boys by squad. Sorting is now handled within each squad.
   */
  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    filteredBoys.forEach(boy => {
        if (!grouped[boy.squad]) {
            grouped[boy.squad] = [];
        }
        grouped[boy.squad].push(boy);
    });
    
    // Sort members within each squad based on the selected sort criteria
    for (const squad in grouped) {
        grouped[squad].sort((a, b) => {
            switch(sortBy) {
                case 'marks':
                    return calculateTotalMarks(b) - calculateTotalMarks(a) || a.name.localeCompare(b.name);
                case 'attendance':
                    return calculateAttendancePercentage(b) - calculateAttendancePercentage(a) || a.name.localeCompare(b.name);
                case 'name': // Default sort
                default:
                    // Sort by School Year (descending), then by Name (ascending)
                    const yearCompare = String(b.year).localeCompare(String(a.year), undefined, { numeric: true });
                    if (yearCompare !== 0) return yearCompare;
                    return a.name.localeCompare(b.name);
            }
        });
    }

    return grouped;
  }, [filteredBoys, sortBy]);
  
  /**
   * Memoized calculation of squad-wide statistics and leaders.
   * This calculation is based on the original, unfiltered `boys` array to ensure
   * that the stats and leader designations are always correct and not affected by filtering.
   */
  const { squadStats, squadLeaders } = useMemo(() => {
    // Group all boys by squad from the original unfiltered prop
    const allBoysBySquad: Record<string, Boy[]> = {};
    boys.forEach(boy => {
      if (!allBoysBySquad[boy.squad]) {
        allBoysBySquad[boy.squad] = [];
      }
      allBoysBySquad[boy.squad].push(boy);
    });
    
    const stats: Record<string, { totalMarks: number; avgAttendance: number }> = {};
    const leaders: Record<string, string | undefined> = {};

    Object.keys(allBoysBySquad).forEach(squad => {
        const squadBoys = allBoysBySquad[squad];
        
        // Calculate squad-wide statistics
        stats[squad] = {
            totalMarks: squadBoys.reduce((total, boy) => total + calculateTotalMarks(boy), 0),
            avgAttendance: (() => {
              const totalPossibleAttendances = squadBoys.reduce((acc, boy) => acc + boy.marks.length, 0);
              if (totalPossibleAttendances === 0) return 0;
              const totalActualAttendances = squadBoys.reduce((acc, boy) => acc + boy.marks.filter(m => m.score >= 0).length, 0);
              return Math.round((totalActualAttendances / totalPossibleAttendances) * 100);
            })(),
        };

        // Determine the squad leader
        if (squadBoys.length === 0) return;
        let leader = squadBoys.find(b => b.isSquadLeader);
        if (!leader && squadBoys.length > 0) {
            // Find most senior boy in the squad as a fallback
            const sortedByYear = [...squadBoys].sort((a, b) => {
                return String(b.year).localeCompare(String(a.year), undefined, { numeric: true }) || a.name.localeCompare(b.name);
            });
            leader = sortedByYear[0];
        }
        if (leader) {
            leaders[squad] = leader.id;
        }
    });

    return { squadStats: stats, squadLeaders: leaders };
  }, [boys]);


  // --- EVENT HANDLERS ---
  const handleAddBoy = () => {
    setBoyToEdit(null); // Ensure form is in 'add' mode
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
    if (!boyToDelete || !encryptionKey) return;

    try {
      await createAuditLog({
          // userEmail handled by db.ts
          actionType: 'DELETE_BOY',
          description: `Deleted boy: ${boyToDelete.name}`,
          revertData: { boyData: boyToDelete },
      }, activeSection, encryptionKey);
      
      await deleteBoyById(boyToDelete.id!, activeSection);
      
      showToast(`'${boyToDelete.name}' was deleted.`, 'success');
      refreshData();
      handleCloseDeleteModal();
    } catch (error) {
        console.error("Failed to delete boy:", error);
        showToast('Failed to delete member.', 'error');
    }
  };

  /** Callback for the BoyForm, triggers a data refresh after saving. */
  const handleSave = (isNew: boolean, name: string) => {
    handleCloseFormModal();
    const message = isNew ? `Added '${name}' successfully.` : `Updated '${name}' successfully.`;
    showToast(message, 'success');
    refreshData();
  }

  // --- RENDER LOGIC ---
  const sortedSquads = Object.keys(boysBySquad).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentTextHover = isCompany ? 'hover:text-company-blue' : 'hover:text-junior-blue';
  const hasActiveFilters = filterSquad !== 'all' || filterYear !== 'all' || searchQuery !== '';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Members</h1>
        <div className="flex items-center space-x-2">
            <button
                onClick={() => setIsSearchVisible(!isSearchVisible)}
                className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSearchVisible ? 'bg-slate-100' : ''} ${accentRing}`}
                aria-label="Toggle search bar"
            >
                <SearchIcon className="h-5 w-5"/>
            </button>
             <button
                onClick={() => setIsFilterModalOpen(true)}
                className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentRing}`}
                aria-label="Open sort and filter options"
            >
                <FilterIcon className="h-5 w-5"/>
            </button>
            <button
              onClick={handleAddBoy}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'}`}
            >
              <PlusIcon className="h-5 w-5 mr-2 -ml-1"/>
              Add Boy
            </button>
        </div>
      </div>
      
      {isSearchVisible && (
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
      )}

      {/* Conditional rendering for empty or no-result states */}
      {boys.length === 0 && (
        <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md mt-8">
            <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-slate-400" />
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Your Roster is Empty</h3>
            <p className="mt-2 text-md text-slate-500">
                Get started by adding your first member. You can assign them to a squad and start tracking their marks.
            </p>
            <div className="mt-6">
                <button
                    onClick={handleAddBoy}
                    className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'}`}
                >
                    <PlusIcon className="h-5 w-5 mr-3 -ml-1"/>
                    Add your first member
                </button>
            </div>
        </div>
      )}

      {boys.length > 0 && filteredBoys.length === 0 && (
          <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-slate-900">No members found</h3>
              <p className="mt-1 text-sm text-slate-500">{hasActiveFilters ? "Your filters did not match any members." : "No members match your search."}</p>
          </div>
      )}

      {/* Main content: list of squads and their members */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {sortedSquads.map((squad) => {
            // Only render the squad if it has members after filtering
            if (!boysBySquad[squad] || boysBySquad[squad].length === 0) {
                return null;
            }
            return (
              <div key={squad}>
                <div className="flex justify-between items-baseline mb-4">
                  <h2 className="text-2xl font-semibold text-slate-800">{`Squad ${squad}`}</h2>
                  <div className="text-right">
                    <p className="font-semibold text-slate-600">
                      Total Marks: {squadStats[squad]?.totalMarks ?? 0}
                    </p>
                    <p className="text-sm text-slate-500">
                      Avg Attendance: {squadStats[squad]?.avgAttendance ?? 0}%
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
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                            <span>{isCompany ? `Year ${boy.year}` : boy.year}</span>
                            <span className="text-slate-300">&bull;</span>
                            <span>Total Marks: {calculateTotalMarks(boy)}</span>
                            <span className="text-slate-300">&bull;</span>
                            <span>Attendance: {calculateAttendancePercentage(boy)}%</span>
                          </div>
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
            )
        })}
      </div>

      {/* Modals for Add/Edit Form and Delete Confirmation */}
      <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={boyToEdit ? 'Edit Boy' : 'Add New Boy'}>
        <BoyForm boyToEdit={boyToEdit} onSave={handleSave} onClose={handleCloseFormModal} activeSection={activeSection} allBoys={boys} encryptionKey={encryptionKey} />
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

      <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Sort & Filter">
          <div className="space-y-4">
               <div>
                    <label htmlFor="sort-by" className="block text-sm font-medium text-slate-700">Sort By</label>
                    <select id="sort-by" value={sortBy} onChange={e => setSortBy(e.target.value as SortByType)} className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none sm:text-sm rounded-md ${accentRing}`}>
                        <option value="name">Year, then Name (A-Z)</option>
                        <option value="marks">Total Marks (High-Low)</option>
                        <option value="attendance">Attendance (High-Low)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="filter-squad" className="block text-sm font-medium text-slate-700">Filter by Squad</label>
                    <select id="filter-squad" value={filterSquad} onChange={e => setFilterSquad(e.target.value)} className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none sm:text-sm rounded-md ${accentRing}`}>
                        <option value="all">All Squads</option>
                        {uniqueSquads.map(s => <option key={s} value={s}>Squad {s}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="filter-year" className="block text-sm font-medium text-slate-700">Filter by Year</label>
                    <select id="filter-year" value={filterYear} onChange={e => setFilterYear(e.target.value)} className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none sm:text-sm rounded-md ${accentRing}`}>
                        <option value="all">All Years</option>
                        {uniqueYears.map(y => <option key={y} value={y}>{isCompany ? `Year ${y}` : y}</option>)}
                    </select>
                </div>
          </div>
          <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                Done
              </button>
          </div>
      </Modal>

    </div>
  );
};

export default HomePage;