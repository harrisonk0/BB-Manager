"use client";

import React, { useState, useMemo } from 'react';
import { Boy, View, Section, ToastType } from '../types';
import Modal from './Modal';
import BoyForm from './BoyForm';
import { PlusIcon, SearchIcon, FilterIcon, ClipboardDocumentListIcon } from './Icons';
import { deleteBoyById, createAuditLog } from '../services/db';
import { useBoyFilter } from '../hooks/useBoyFilter';
import BoyListItem from './BoyListItem';

interface HomePageProps {
  boys: Boy[];
  setView: (view: View) => void;
  refreshData: () => void;
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
  encryptionKey: CryptoKey | null;
}

const HomePage: React.FC<HomePageProps> = ({ boys, setView, refreshData, activeSection, showToast, encryptionKey }) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [boyToEdit, setBoyToEdit] = useState<Boy | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [boyToDelete, setBoyToDelete] = useState<Boy | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const { searchQuery, setSearchQuery, sortBy, setSortBy, filterSquad, setFilterSquad, filterYear, setFilterYear, filteredBoys } = useBoyFilter(boys);
  const isCompany = activeSection === 'company';

  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    filteredBoys.forEach(boy => {
        if (!grouped[boy.squad]) grouped[boy.squad] = [];
        grouped[boy.squad].push(boy);
    });
    return grouped;
  }, [filteredBoys]);

  const handleDeleteBoy = async () => {
    if (!boyToDelete || !encryptionKey) return;
    try {
      await createAuditLog({ actionType: 'DELETE_BOY', description: `Deleted ${boyToDelete.name}`, revertData: { boyData: boyToDelete } }, activeSection, encryptionKey);
      await deleteBoyById(boyToDelete.id!, activeSection);
      showToast('Deleted successfully', 'success'); refreshData(); setIsDeleteModalOpen(false);
    } catch (e) { showToast('Delete failed', 'error'); }
  };

  const sortedSquads = Object.keys(boysBySquad).sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Members</h1>
        <div className="flex space-x-2">
            <button onClick={() => setIsSearchVisible(!isSearchVisible)} className="p-2 rounded-full hover:bg-slate-100"><SearchIcon className="h-5 w-5"/></button>
            <button onClick={() => setIsFilterModalOpen(true)} className="p-2 rounded-full hover:bg-slate-100"><FilterIcon className="h-5 w-5"/></button>
            <button onClick={() => { setBoyToEdit(null); setIsFormModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"><PlusIcon className="h-5 w-5 mr-1"/> Add Boy</button>
        </div>
      </div>
      {isSearchVisible && <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-2 border rounded" />}
      
      {boys.length === 0 ? (
        <div className="text-center py-16 bg-white rounded shadow mt-8">
            <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-slate-400" />
            <h3 className="mt-4 text-xl font-semibold">No Members</h3>
            <p className="mt-2 text-slate-500">Add your first member to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {sortedSquads.map(squad => (
                <div key={squad}>
                    <h2 className="text-2xl font-semibold mb-4">Squad {squad}</h2>
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <ul className="divide-y divide-slate-200">
                            {boysBySquad[squad].map(boy => (
                                <BoyListItem key={boy.id} boy={boy} isCompany={isCompany} onView={id => setView({ page: 'boyMarks', boyId: id })} onEdit={b => { setBoyToEdit(b); setIsFormModalOpen(true); }} onDelete={b => { setBoyToDelete(b); setIsDeleteModalOpen(true); }} />
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
      )}

      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={boyToEdit ? 'Edit Boy' : 'Add New Boy'}>
        <BoyForm boyToEdit={boyToEdit} onSave={() => { setIsFormModalOpen(false); refreshData(); }} onClose={() => setIsFormModalOpen(false)} activeSection={activeSection} allBoys={boys} encryptionKey={encryptionKey} />
      </Modal>
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
          <div className="flex justify-end space-x-3 mt-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
              <button onClick={handleDeleteBoy} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
          </div>
      </Modal>
      {/* Filter Modal Logic Omitted for brevity, but would go here */}
    </div>
  );
};

export default HomePage;