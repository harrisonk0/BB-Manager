import React, { useState, useEffect } from 'react';
import { Boy, Squad, SchoolYear } from '../types';
import { createBoy, updateBoy, createAuditLog } from '../services/db';
import { getAuthInstance } from '../services/firebase';

interface BoyFormProps {
  boyToEdit?: Boy | null;
  onSave: () => void;
  onClose: () => void;
}

const BoyForm: React.FC<BoyFormProps> = ({ boyToEdit, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [squad, setSquad] = useState<Squad>(1);
  const [year, setYear] = useState<SchoolYear>(8);
  const [isSquadLeader, setIsSquadLeader] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (boyToEdit) {
      setName(boyToEdit.name);
      setSquad(boyToEdit.squad);
      setYear(boyToEdit.year || 8); // Default to 8 for existing data
      setIsSquadLeader(boyToEdit.isSquadLeader || false);
    } else {
      setName('');
      setSquad(1);
      setYear(8);
      setIsSquadLeader(false);
    }
  }, [boyToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setError('');

    try {
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';

      if (boyToEdit) {
        const changes: string[] = [];
        if (boyToEdit.name !== name) changes.push(`name to "${name}"`);
        if (boyToEdit.squad !== squad) changes.push(`squad to ${squad}`);
        if (boyToEdit.year !== year) changes.push(`year to ${year}`);
        if (!!boyToEdit.isSquadLeader !== isSquadLeader) changes.push(`squad leader status to ${isSquadLeader}`);
        
        if (changes.length > 0) {
            await createAuditLog({
                userEmail,
                actionType: 'UPDATE_BOY',
                description: `Updated ${boyToEdit.name}: changed ${changes.join(', ')}.`,
                revertData: { boyData: boyToEdit },
            });
        }
        await updateBoy({ ...boyToEdit, name, squad, year, isSquadLeader });
      } else {
        const newBoy = await createBoy({ name, squad, year, marks: [], isSquadLeader });
        await createAuditLog({
            userEmail,
            actionType: 'CREATE_BOY',
            description: `Added new boy: ${name}`,
            revertData: { boyId: newBoy.id },
        });
      }
      onSave();
    } catch (err) {
      console.error('Failed to save boy:', err);
      setError('Failed to save boy. Please try again.');
    }
  };
  
  const schoolYears: SchoolYear[] = [8, 9, 10, 11, 12, 13, 14];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-bb-blue focus:border-bb-blue sm:text-sm"
          required
        />
      </div>
      <div>
        <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          School Year
        </label>
        <select
          id="year"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10) as SchoolYear)}
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-bb-blue focus:border-bb-blue sm:text-sm"
        >
          {schoolYears.map((yearNum) => (
            <option key={yearNum} value={yearNum}>
              Year {yearNum}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Squad</label>
        <div className="mt-2 flex space-x-4">
          {[1, 2, 3].map((squadNum) => (
            <label key={squadNum} className="inline-flex items-center">
              <input
                type="radio"
                name="squad"
                value={squadNum}
                checked={squad === squadNum}
                onChange={() => setSquad(squadNum as Squad)}
                className="form-radio h-4 w-4 text-bb-blue border-gray-300 focus:ring-bb-blue"
              />
              <span className="ml-2">Squad {squadNum}</span>
            </label>
          ))}
        </div>
      </div>
       <div>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={isSquadLeader}
            onChange={(e) => setIsSquadLeader(e.target.checked)}
            className="form-checkbox h-4 w-4 text-bb-blue border-gray-300 dark:border-gray-600 rounded focus:ring-bb-blue"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Set as Squad Leader</span>
        </label>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 dark:text-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-bb-blue rounded-md hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bb-blue"
        >
          {boyToEdit ? 'Update Boy' : 'Add Boy'}
        </button>
      </div>
    </form>
  );
};

export default BoyForm;