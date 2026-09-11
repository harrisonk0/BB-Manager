/**
 * @file BoyForm.tsx
 * @description A form component used for both creating a new boy and editing an existing one.
 * It is displayed within a modal.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Boy, SchoolYear, Section, JuniorYear, SectionSquad } from '../types';
import { createBoy, updateBoy } from '../services/db';
import {
  formatSchoolYear,
  resolveSquadNumber,
  schoolYearsForSection,
  squadDisplayName,
  defaultSquadsForSection,
} from '../services/sectionSquads';

interface BoyFormProps {
  /** If provided, the form will be in 'edit' mode, pre-filled with this boy's data. If null/undefined, it's in 'add' mode. */
  boyToEdit?: Boy | null;
  /** Callback function to be executed after a successful save. */
  onSave: (isNew: boolean, name: string) => void;
  /** Callback function to close the form/modal. */
  onClose: () => void;
  /** The currently active section, which determines the available options (e.g., squads, years). */
  activeSection: Section;
  /** Squads configured for this section in settings. */
  squads?: SectionSquad[];
}

const BoyForm: React.FC<BoyFormProps> = ({ boyToEdit, onSave, onClose, activeSection, squads }) => {
  const isCompany = activeSection === 'company';
  const configuredSquads = useMemo(
    () => (squads && squads.length > 0 ? squads : defaultSquadsForSection(activeSection)),
    [squads, activeSection],
  );

  const squadOptions = useMemo(() => {
    const options = [...configuredSquads];
    if (boyToEdit && !options.some((squad) => squad.number === boyToEdit.squad)) {
      options.push({ number: boyToEdit.squad, label: null });
      options.sort((left, right) => left.number - right.number);
    }
    return options;
  }, [configuredSquads, boyToEdit]);

  const schoolYears = schoolYearsForSection(activeSection);
  const initialSquad = resolveSquadNumber(squadOptions, boyToEdit?.squad);
  const initialYear = (isCompany ? 8 : 'P4') as SchoolYear | JuniorYear;

  const [name, setName] = useState('');
  const [squad, setSquad] = useState(initialSquad);
  const [year, setYear] = useState<SchoolYear | JuniorYear>(initialYear);
  const [isSquadLeader, setIsSquadLeader] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);

  useEffect(() => {
    if (boyToEdit) {
      setName(boyToEdit.name);
      setSquad(resolveSquadNumber(squadOptions, boyToEdit.squad));
      setYear(boyToEdit.year || initialYear);
      setIsSquadLeader(boyToEdit.isSquadLeader || false);
    } else {
      setName('');
      setSquad(resolveSquadNumber(squadOptions, undefined));
      setYear(initialYear);
      setIsSquadLeader(false);
    }
    setNameError(null);
    setSquadError(null);
    setYearError(null);
  }, [boyToEdit, activeSection, squadOptions, initialYear]);

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
    if (!squadOptions.some((option) => option.number === squad)) {
      setSquadError('Choose a squad.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsSaving(true);
    try {
      if (boyToEdit) {
        await updateBoy({ ...boyToEdit, name, squad, year, isSquadLeader }, activeSection);
        onSave(false, name);
      } else {
        await createBoy({ name, squad, year, marks: [], isSquadLeader }, activeSection);
        onSave(true, name);
      }
    } catch (err) {
      console.error('Failed to save boy:', err);
      setNameError('Failed to save boy. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
            const value = isCompany ? parseInt(e.target.value, 10) : e.target.value;
            setYear(value as SchoolYear | JuniorYear);
          }}
          className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm ${yearError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
          aria-invalid={yearError ? "true" : "false"}
          aria-describedby={yearError ? "year-error" : undefined}
        >
          {schoolYears.map((yearNum) => (
            <option key={yearNum} value={yearNum}>
              {formatSchoolYear(activeSection, yearNum)}
            </option>
          ))}
        </select>
        {yearError && <p id="year-error" className="text-red-500 text-xs mt-1">{yearError}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Squad</label>
        <div className={`mt-2 flex flex-wrap gap-4 ${squadError ? 'border border-red-500 p-2 rounded-md' : ''}`}>
          {squadOptions.map((option) => (
            <label key={option.number} className="inline-flex items-center">
              <input
                type="radio"
                name="squad"
                value={option.number}
                checked={squad === option.number}
                onChange={() => setSquad(option.number)}
                aria-label={`Squad ${option.number}`}
                className={`form-radio h-4 w-4 border-slate-300 ${accentText}`}
              />
              <span className="ml-2 text-slate-700">{squadDisplayName(squadOptions, option.number)}</span>
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
          disabled={isSaving}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${accentBg}`}
        >
          {isSaving ? 'Saving...' : boyToEdit ? 'Update Boy' : 'Add Boy'}
        </button>
      </div>
    </form>
  );
};

export default BoyForm;
