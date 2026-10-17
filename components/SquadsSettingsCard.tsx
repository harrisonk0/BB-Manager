import React, { useState } from "react";
import { Boy, Section, SectionSettings, ToastType, UserRole } from "../types";
import { saveSettings } from "../services/settings";
import {
  addSquad,
  assignedMemberCount,
  MAX_SECTION_SQUADS,
  removeSquad,
  renameSquad,
  squadDisplayName,
} from "../services/sectionSquads";
import { NativeButton, NativeInput, InlineNotice } from "./ui";
import "./reporting/reporting.css";

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
  const [draftLabels, setDraftLabels] = useState<Record<number, string>>({});
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const persist = async (
    squads: SectionSettings["squads"],
    successMessage: string,
  ) => {
    setIsSaving(true);
    try {
      const next: SectionSettings = {
        meetingDay: currentSettings.meetingDay,
        squads,
      };
      await saveSettings(activeSection, next, userRole);
      onSettingsSaved(next);
      showToast(successMessage, "success");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save squads.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    try {
      const next = addSquad(currentSettings.squads);
      const added = next.find(
        (squad) =>
          !currentSettings.squads.some(
            (current) => current.number === squad.number,
          ),
      );
      await persist(
        next,
        added
          ? `Added ${squadDisplayName(next, added.number)}.`
          : "Squad added.",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not add a squad.";
      showToast(message, "error");
    }
  };

  const handleRenameBlur = async (number: number) => {
    const draft = Object.prototype.hasOwnProperty.call(draftLabels, number)
      ? draftLabels[number]
      : (currentSettings.squads.find((squad) => squad.number === number)
          ?.label ?? "");
    const current =
      currentSettings.squads.find((squad) => squad.number === number)?.label ??
      "";
    if ((draft || "") === (current || "")) {
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
      const message =
        error instanceof Error ? error.message : "Could not rename that squad.";
      showToast(message, "error");
    }
  };

  const handleDelete = async (number: number) => {
    const assigned = assignedMemberCount(boys, number);
    if (assigned > 0) {
      showToast(
        `Move the ${assigned} ${assigned === 1 ? "member" : "members"} out of ${squadDisplayName(currentSettings.squads, number)} before deleting it.`,
        "error",
      );
      setPendingDelete(null);
      return;
    }

    try {
      const next = removeSquad(currentSettings.squads, number);
      await persist(next, `Removed Squad ${number}.`);
      setPendingDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not delete that squad.";
      showToast(message, "error");
    }
  };

  return (
    <section className="bb-report-section">
      <h2>Squads</h2>
      <p className="bb-report-intro">
        Members keep their squad number. Nicknames save when you leave the
        field.
      </p>
      <ul className="bb-squad-editor">
        {currentSettings.squads.map((squad) => {
          const assigned = assignedMemberCount(boys, squad.number);
          const labelValue = Object.prototype.hasOwnProperty.call(
            draftLabels,
            squad.number,
          )
            ? draftLabels[squad.number]
            : (squad.label ?? "");
          const deleting = pendingDelete === squad.number;
          return (
            <li key={squad.number}>
              <div className="bb-squad-heading">
                <h3>Squad {squad.number}</h3>
                <p>
                  {assigned === 0
                    ? "No members"
                    : `${assigned} ${assigned === 1 ? "member" : "members"}`}
                </p>
              </div>
              <NativeInput
                label={`Squad ${squad.number} nickname`}
                maxLength={40}
                value={labelValue}
                disabled={!canEdit || isSaving}
                placeholder={`Squad ${squad.number}`}
                onChange={(event) =>
                  setDraftLabels((labels) => ({
                    ...labels,
                    [squad.number]: event.target.value,
                  }))
                }
                onBlur={() => void handleRenameBlur(squad.number)}
              />
              {canEdit &&
                (deleting ? (
                  <>
                    <InlineNotice kind="error">
                      Remove Squad {squad.number}? Move assigned members first.
                      At least one squad must remain.
                    </InlineNotice>
                    <div className="bb-report-actions">
                      <NativeButton
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => setPendingDelete(null)}
                      >
                        Cancel
                      </NativeButton>
                      <NativeButton
                        danger
                        disabled={isSaving}
                        onClick={() => void handleDelete(squad.number)}
                      >
                        Delete Squad {squad.number}
                      </NativeButton>
                    </div>
                  </>
                ) : (
                  <div className="bb-report-actions">
                    <NativeButton
                      variant="plain"
                      danger
                      disabled={isSaving || currentSettings.squads.length <= 1}
                      onClick={() => setPendingDelete(squad.number)}
                    >
                      Remove Squad {squad.number}
                    </NativeButton>
                  </div>
                ))}
            </li>
          );
        })}
      </ul>
      {canEdit && (
        <div className="bb-report-actions">
          <NativeButton
            variant="secondary"
            onClick={() => void handleAdd()}
            disabled={
              isSaving || currentSettings.squads.length >= MAX_SECTION_SQUADS
            }
            busy={isSaving}
          >
            Add squad
          </NativeButton>
        </div>
      )}
    </section>
  );
};
export default SquadsSettingsCard;
