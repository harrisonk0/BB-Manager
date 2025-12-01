/**
 * @file BoyForm.tsx
 * @description A form component used for both creating a new boy and editing an existing one.
 * It is displayed within a modal.
 */

import React, { useState, useEffect } from 'react';
import { Boy, Squad, SchoolYear, Section, JuniorSquad, JuniorYear } from '../types';
import { createBoy, updateBoy, createAuditLog } from '../services/db';

interface BoyFormProps {
  /** If provided, the form will be in 'edit' mode, pre-filled with this boy's data. If null/undefined, it's in 'add' mode. */
  boyToEdit?: Boy | null;
  /** Callback function to be executed after a successful save. */
  onSave: (isNew: boolean, name: string) => void;
  /** Callback function to close the form/modal. */
  onClose: () => void;
  /** The currently active section, which determines the available options (e.g., squads, years). */
  activeSection: Section;
  /** The full list of boys, used to check for squad leader conflicts. */
  allBoys: Boy[];
  /** The encryption key derived from the user session. */
  encryptionKey: CryptoKey | null;
}

const BoyForm: React.FC<BoyFormProps> = ({ boyToEdit, onSave, onClose, activeSection, allBoys, encryptionKey }) => {
  const isCompany = activeSection === 'company';
  
  const initialSquad = isCompany ? 1 : 1;
  const initialYear = isCompany ? 8 : 'P4';
  
  const [name, setName] = useState('');
  const [squad, setSquad] = useState<Squad | JuniorSquad>(initialSquad);
  const [year, setYear] = useState<SchoolYear | JuniorYear>(initialYear);
  const [isSquadLeader, setIsSquadLeader] = useState(false);
  
  const [nameError, setNameError] = useState<string | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);

  // State for squad leader confirmation
  const [leaderConflict, setLeaderConflict] = useState<{ existingLeader: Boy, incomingBoyData: Omit<Boy, 'marks'> & { id?: string } } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (boyToEdit) {
      setName(boyToEdit.name);
      setSquad(boyToEdit.squad);
      setYear(boyToEdit.year || initialYear);
      setIsSquadLeader(boyToEdit.isSquadLeader || false);
    } else {
      setName('');
      setSquad(initialSquad);
      setYear(initialYear);
      setIsSquadLeader(false);
    }
    setNameError(null);
    setSquadError(null);
    setYearError(null);
  }, [boyToEdit, activeSection]);

  const executeSave = async (boyData: Omit<Boy, 'marks'> & { id?: string }) => {
    if (!encryptionKey) throw new Error("Encryption key missing.");

    if (boyToEdit) {
      await updateBoy({ ...boyToEdit, ...boyData }, activeSection, encryptionKey);
      onSave(false, boyData.name);
    } else {
      const newBoy = await createBoy({ ...boyData, marks: [] }, activeSection, encryptionKey);
      await createAuditLog({
          actionType: 'CREATE_BOY',
          description: `Added new boy: ${boyData.name}`,
          revertData: { boyId: newBoy.id },
      }, activeSection, encryptionKey);
      onSave(true, boyData.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setNameError(null);
    setSquadError(null);
    setYearError(null);

    let isValid = true;
    if (!name.trim()) {
      setNameError('Name cannot be empty.');
      isValid = false;
    }
    if (!encryptionKey) {
        setNameError('Authentication error: Encryption key missing.');
        isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    const incomingBoyData = {
      name: name.trim(),
      squad,
      year,
      isSquadLeader,
      ...(boyToEdit && { id: boyToEdit.id })
    };

    if (isSquadLeader) {
      const existingLeader = allBoys.find(b => 
        b.squad === squad && 
        b.isSquadLeader && 
        b.id !== boyToEdit?.id
      );

      if (existingLeader) {
        setLeaderConflict({ existingLeader, incomingBoyData });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await executeSave(incomingBoyData);
    } catch (err) {
      console.error('Failed to save boy:', err);
      setNameError('Failed to save boy. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmLeaderChange = async () => {
    if (!leaderConflict || !encryptionKey) return;

    setIsSubmitting(true);
    const { existingLeader, incomingBoyData } = leaderConflict;

    try {
      // The updateBoy function will now handle logging this change.
      await updateBoy({ ...existingLeader, isSquadLeader: false }, activeSection, encryptionKey);

      await executeSave(incomingBoyData);

    } catch (err) {
      console.error('Failed to change squad leader:', err);
      setNameError('Failed to change squad leader. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLeaderConflict(null);
    }
  };
  
  const companyYears: SchoolYear[] = [8, 9, 10, 11, 12, 13, 14];
  const juniorYears: JuniorYear[] = ['P4', 'P5', 'P6', 'P7'];
  const schoolYears = isCompany ? companyYears : juniorYears;

  const companySquads: Squad[] = [1, 2, 3];
  const juniorSquads: JuniorSquad[] = [1, 2, 3, 4];
  const squadOptions = isCompany ? companySquads : juniorSquads;

  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentText = isCompany ? 'text-company-blue focus:ring-company-blue' : 'text-junior-blue focus:ring-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue focus:ring-company-blue' : 'bg-junior-blue focus:ring-junior-blue';
  
  if (leaderConflict) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">
          Squad {leaderConflict.incomingBoyData.squad} already has a squad leader: <strong>{leaderConflict.existingLeader.name}</strong>.
        </p>
        <p className="text-slate-600">
          Do you want to make <strong>{leaderConflict.incomingBoyData.name}</strong> the new squad leader? This will remove the leader status from {leaderConflict.existingLeader.name}.
        </p>
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setLeaderConflict(null)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLeaderChange}
            disabled={isSubmitting}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentBg} disabled:opacity-50`}
          >
            {isSubmitting ? 'Updating...' : 'Yes, make new leader'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm ${nameError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
          required
          aria-invalid={nameError ? "true" : "false"}
          aria-describedby={nameError ? "name-error" : undefined}
        />
        {nameError && <p id="name-error" className="text-red-500 text-xs mt-1">{nameError}</p>}
      </div>
      <div>
        <label htmlFor="year" className="block text-sm font-medium text-slate-700">
          School Year
        </label>
        <select
          id="year"
          value={year}
          onChange={(e) => {
            const value = isCompany ? parseInt(e.target.value, 10) : e.target.value;
            setYear(value as SchoolYear | JuniorYear);
          }}
          className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm ${yearError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
          aria-invalid={yearError ? "true" : "false"}
          aria-describedby={yearError ? "year-error" : undefined}
        >
          {schoolYears.map((yearNum) => (
            <option key={yearNum} value={yearNum}>
              {isCompany ? `Year ${yearNum}` : yearNum}
            </option>
          ))}
        </select>
        {yearError && <p id="year-error" className="text-red-500 text-xs mt-1">{yearError}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Squad</label>
        <div className={`mt-2 flex flex-wrap gap-4 ${squadError ? 'border border-red-500 p-2 rounded-md' : ''}`}>
          {squadOptions.map((squadNum) => (
            <label key={squadNum} className="inline-flex items-center">
              <input
                type="radio"
                name="squad"
                value={squadNum}
                checked={squad === squadNum}
                onChange={() => setSquad(squadNum as Squad | JuniorSquad)}
                className={`form-radio h-4 w-4 border-slate-300 ${accentText}`}
              />
              <span className="ml-2 text-slate-700">{`Squad ${squadNum}`}</span>
            </label>
          ))}
        </div>
        {squadError && <p id="squad-error" className="text-red-500 text-xs mt-1">{squadError}</p>}
      </div>
       <div>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={isSquadLeader}
            onChange={(e) => setIsSquadLeader(e.target.checked)}
            className={`form-checkbox h-4 w-4 border-slate-300 rounded ${accentText}`}
          />
          <span className="ml-2 text-sm text-slate-700">Set as Squad Leader</span>
        </label>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentBg} disabled:opacity-50`}
        >
          {isSubmitting ? 'Saving...' : (boyToEdit ? 'Update Boy' : 'Add Boy')}
        </button>
      </div>
    </form>
  );
};

export default BoyForm;