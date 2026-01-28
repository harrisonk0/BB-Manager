/**
 * @file BoyForm.tsx
 * @description A form component used for both creating a new boy and editing an existing one.
 * It is displayed within a modal.
 */

import React, { useState, useEffect } from 'react';
import { Boy, Squad, SchoolYear, Section, JuniorSquad, JuniorYear } from '../types';
import { createBoy, updateBoy, createAuditLog } from '../services/db';
import { useAuthAndRole } from '../hooks/useAuthAndRole';

interface BoyFormProps {
  /** If provided, the form will be in 'edit' mode, pre-filled with this boy's data. If null/undefined, it's in 'add' mode. */
  boyToEdit?: Boy | null;
  /** Callback function to be executed after a successful save. */
  onSave: (isNew: boolean, name: string) => void;
  /** Callback function to close the form/modal. */
  onClose: () => void;
  /** The currently active section, which determines the available options (e.g., squads, years). */
  activeSection: Section;
}

const BoyForm: React.FC<BoyFormProps> = ({ boyToEdit, onSave, onClose, activeSection }) => {
  const isCompany = activeSection === 'company';

  const { user } = useAuthAndRole();
  
  // Set initial form state based on the active section.
  const initialSquad = isCompany ? 1 : 1;
  const initialYear = isCompany ? 8 : 'P4';
  
  // Form field states.
  const [name, setName] = useState('');
  const [squad, setSquad] = useState<Squad | JuniorSquad>(initialSquad);
  const [year, setYear] = useState<SchoolYear | JuniorYear>(initialYear);
  const [isSquadLeader, setIsSquadLeader] = useState(false);
  
  // Granular error states
  const [nameError, setNameError] = useState<string | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);

  /**
   * EFFECT: Populates the form fields when `boyToEdit` prop changes.
   * This handles switching between 'add' and 'edit' modes.
   */
  useEffect(() => {
    if (boyToEdit) {
      // Edit mode: set state from the boy's data.
      setName(boyToEdit.name);
      setSquad(boyToEdit.squad);
      setYear(boyToEdit.year || initialYear);
      setIsSquadLeader(boyToEdit.isSquadLeader || false);
    } else {
      // Add mode: reset form to initial values.
      setName('');
      setSquad(initialSquad);
      setYear(initialYear);
      setIsSquadLeader(false);
    }
    // Clear all errors when boyToEdit changes
    setNameError(null);
    setSquadError(null);
    setYearError(null);
  }, [boyToEdit, activeSection]);

  /**
   * Handles the form submission.
   * It performs validation, then calls the appropriate database service (create or update),
   * creates an audit log entry for the action, and finally calls the onSave callback.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setNameError(null);
    setSquadError(null);
    setYearError(null);

    let isValid = true;
    if (!name.trim()) {
      setNameError('Name cannot be empty.');
      isValid = false;
    }
    // Add more validation for squad and year if necessary, e.g., if they could be invalid.
    // For now, assuming select/radio ensure valid values.

    if (!isValid) {
      return;
    }

    try {
      const userEmail = user?.email || 'Unknown User';

      if (boyToEdit) {
        // --- UPDATE LOGIC ---
        // Construct a description of the changes for the audit log.
        const changes: string[] = [];
        if (boyToEdit.name !== name) changes.push(`name to "${name}"`);
        if (boyToEdit.squad !== squad) changes.push(`squad to ${squad}`);
        if (boyToEdit.year !== year) changes.push(`year to ${year}`);
        if (!!boyToEdit.isSquadLeader !== isSquadLeader) changes.push(`squad leader status to ${isSquadLeader}`);
        
        // Only create an audit log if something actually changed.
        if (changes.length > 0) {
            await createAuditLog({
                userEmail,
                actionType: 'UPDATE_BOY',
                description: `Updated ${boyToEdit.name}: changed ${changes.join(', ')}.`,
                revertData: { boyData: boyToEdit }, // Save the old data for potential revert.
            }, activeSection);
        }
        await updateBoy({ ...boyToEdit, name, squad, year, isSquadLeader }, activeSection);
        onSave(false, name);
      } else {
        // --- CREATE LOGIC ---
        const newBoy = await createBoy({ name, squad, year, marks: [], isSquadLeader }, activeSection);
        await createAuditLog({
            userEmail,
            actionType: 'CREATE_BOY',
            description: `Added new boy: ${name}`,
            revertData: { boyId: newBoy.id }, // Save the new ID for potential revert.
        }, activeSection);
        onSave(true, name);
      }
    } catch (err) {
      setNameError('Failed to save boy. Please try again.'); // Generic error for save failure
    }
  };
  
  // Define available form options based on the active section.
  const companyYears: SchoolYear[] = [8, 9, 10, 11, 12, 13, 14];
  const juniorYears: JuniorYear[] = ['P4', 'P5', 'P6', 'P7'];
  const schoolYears = isCompany ? companyYears : juniorYears;

  const companySquads: Squad[] = [1, 2, 3];
  const juniorSquads: JuniorSquad[] = [1, 2, 3, 4];
  const squadOptions = isCompany ? companySquads : juniorSquads;

  // Define dynamic styles based on the active section.
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentText = isCompany ? 'text-company-blue focus:ring-company-blue' : 'text-junior-blue focus:ring-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue focus:ring-company-blue' : 'bg-junior-blue focus:ring-junior-blue';
  
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
            // Handle parsing to number for Company Section years.
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
      {/* Form action buttons */}
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
          className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentBg}`}
        >
          {boyToEdit ? 'Update Boy' : 'Add Boy'}
        </button>
      </div>
    </form>
  );
};

export default BoyForm;