import React, { useState } from 'react';
import { Boy, Section, SectionSettings, ToastType, UserRole } from '../types';
import { saveSettings } from '../services/settings';
import {
  addSquad,
  assignedMemberCount,
  MAX_SECTION_SQUADS,
  removeSquad,
  renameSquad,
  squadDisplayName,
} from '../services/sectionSquads';
import { PlusIcon, TrashIcon } from './Icons';

interface SquadsSettingsCardProps {
  activeSection: Section;
  currentSettings: SectionSettings;
  boys: Boy[];
  userRole: UserRole | null;
  canEdit: boolean;
  onSettingsSaved: (newSettings: SectionSettings) => void;
  showToast: (message: string, type?: ToastType) => void;
}

const SquadsSettingsCard: React.FC<SquadsSettingsCardProps> = ({
  activeSection,
  currentSettings,
  boys,
  userRole,
  canEdit,
  onSettingsSaved,
  showToast,
}) => {
  const isCompany = activeSection === 'company';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const [draftLabels, setDraftLabels] = useState<Record<number, string>>({});
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const persist = async (squads: SectionSettings['squads'], successMessage: string) => {
    setIsSaving(true);
    try {
      const next: SectionSettings = { meetingDay: currentSettings.meetingDay, squads };
      await saveSettings(activeSection, next, userRole);
      onSettingsSaved(next);
      showToast(successMessage, 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save squads.';
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    try {
      const next = addSquad(currentSettings.squads);
      const added = next.find((squad) => !currentSettings.squads.some((current) => current.number === squad.number));
      await persist(next, added ? `Added ${squadDisplayName(next, added.number)}.` : 'Squad added.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not add a squad.';
      showToast(message, 'error');
    }
  };

  const handleRenameBlur = async (number: number) => {
    const draft = Object.prototype.hasOwnProperty.call(draftLabels, number)
      ? draftLabels[number]
      : currentSettings.squads.find((squad) => squad.number === number)?.label ?? '';
    const current = currentSettings.squads.find((squad) => squad.number === number)?.label ?? '';
    if ((draft || '') === (current || '')) {
      return;
    }

    try {
      const next = renameSquad(currentSettings.squads, number, draft);
      await persist(next, `Updated ${squadDisplayName(next, number)}.`);
      setDraftLabels((labels) => {
        const copy = { ...labels };
        delete copy[number];
        return copy;
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not rename that squad.';
      showToast(message, 'error');
    }
  };

  const handleDelete = async (number: number) => {
    const assigned = assignedMemberCount(boys, number);
    if (assigned > 0) {
      showToast(
        `Move the ${assigned} ${assigned === 1 ? 'member' : 'members'} out of ${squadDisplayName(currentSettings.squads, number)} before deleting it.`,
        'error',
      );
      setPendingDelete(null);
      return;
    }

    try {
      const next = removeSquad(currentSettings.squads, number);
      await persist(next, `Removed Squad ${number}.`);
      setPendingDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not delete that squad.';
      showToast(message, 'error');
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
      <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Squads</h2>
      <p className="text-slate-600">
        Add, rename, or remove squads for this section. Members keep the squad number; a nickname is optional.
      </p>
      <ul className="mt-4 space-y-3">
        {currentSettings.squads.map((squad) => {
          const assigned = assignedMemberCount(boys, squad.number);
          const labelValue = Object.prototype.hasOwnProperty.call(draftLabels, squad.number)
            ? draftLabels[squad.number]
            : squad.label ?? '';
          const deleting = pendingDelete === squad.number;

          return (
            <li key={squad.number} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="w-24 shrink-0 font-medium text-slate-800">Squad {squad.number}</p>
                <label className="min-w-0 flex-1 text-sm text-slate-600">
                  Nickname
                  <input
                    type="text"
                    maxLength={40}
                    value={labelValue}
                    disabled={!canEdit || isSaving}
                    placeholder={`Squad ${squad.number}`}
                    onChange={(event) =>
                      setDraftLabels((labels) => ({ ...labels, [squad.number]: event.target.value }))
                    }
                    onBlur={() => { void handleRenameBlur(squad.number); }}
                    className={`mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:outline-none sm:text-sm ${accentRing} disabled:bg-slate-50`}
                  />
                </label>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p className="text-sm text-slate-500">
                    {assigned === 0 ? 'No members' : `${assigned} ${assigned === 1 ? 'member' : 'members'}`}
                  </p>
                  {canEdit && (
                    deleting ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => setPendingDelete(null)}
                          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => { void handleDelete(squad.number); }}
                          className="rounded-md bg-red-600 px-2 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving || currentSettings.squads.length <= 1}
                        onClick={() => setPendingDelete(squad.number)}
                        aria-label={`Delete Squad ${squad.number}`}
                        className="inline-flex items-center rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Remove
                      </button>
                    )
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {canEdit && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => { void handleAdd(); }}
            disabled={isSaving || currentSettings.squads.length >= MAX_SECTION_SQUADS}
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white ${accentBg} hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <PlusIcon className="h-5 w-5 mr-2 -ml-1" />
            Add squad
          </button>
        </div>
      )}
    </div>
  );
};

export default SquadsSettingsCard;
