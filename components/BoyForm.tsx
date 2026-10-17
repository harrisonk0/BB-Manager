import { NativeButton, NativeInput, NativeField, NativeSwitch } from "./ui";
import "./staff/staff.css";
/**
 * @file BoyForm.tsx
 * @description A form component used for both creating a new boy and editing an existing one.
 * It is displayed within a modal.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Boy,
  SchoolYear,
  Section,
  JuniorYear,
  SectionSquad,
  MemberRank,
} from "../types";
import { MEMBER_RANKS, isRankEligible } from "../services/memberRanks";
import { NameWithRank } from "./RankBadge";
import { createBoy, updateBoy } from "../services/db";
import {
  formatSchoolYear,
  resolveSquadNumber,
  schoolYearsForSection,
  squadDisplayName,
  defaultSquadsForSection,
} from "../services/sectionSquads";

interface BoyFormProps {
  /** If provided, the form will be in 'edit' mode, pre-filled with this boy's data. If null/undefined, it's in 'add' mode. */
  boyToEdit?: Boy | null;
  /** Callback function to be executed after a successful save. */
  onSave: (isNew: boolean, name: string) => void;
  /** Callback function to close the form/modal. */
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** The currently active section, which determines the available options (e.g., squads, years). */
  activeSection: Section;
  /** Squads configured for this section in settings. */
  squads?: SectionSquad[];
}

const BoyForm: React.FC<BoyFormProps> = ({
  boyToEdit,
  onSave,
  onClose,
  activeSection,
  squads,
  onBusyChange,
  onDirtyChange,
}) => {
  const isCompany = activeSection === "company";
  const configuredSquads = useMemo(
    () =>
      squads && squads.length > 0
        ? squads
        : defaultSquadsForSection(activeSection),
    [squads, activeSection],
  );

  const squadOptions = useMemo(() => {
    const options = [...configuredSquads];
    if (
      boyToEdit &&
      !options.some((squad) => squad.number === boyToEdit.squad)
    ) {
      options.push({ number: boyToEdit.squad, label: null });
      options.sort((left, right) => left.number - right.number);
    }
    return options;
  }, [configuredSquads, boyToEdit]);

  const schoolYears = schoolYearsForSection(activeSection);
  const initialSquad = resolveSquadNumber(squadOptions, boyToEdit?.squad);
  const initialYear = (isCompany ? 8 : "P4") as SchoolYear | JuniorYear;

  const [name, setName] = useState("");
  const [squad, setSquad] = useState(initialSquad);
  const [year, setYear] = useState<SchoolYear | JuniorYear>(initialYear);
  const [isSquadLeader, setIsSquadLeader] = useState(false);
  const [memberRank, setMemberRank] = useState<MemberRank | null>(null);
  const [rankCleared, setRankCleared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const initialState = JSON.stringify({
    name: boyToEdit?.name ?? "",
    squad: initialSquad,
    year: boyToEdit?.year || initialYear,
    isSquadLeader: boyToEdit?.isSquadLeader || false,
    memberRank: boyToEdit?.memberRank ?? null,
  });
  const dirty =
    JSON.stringify({ name, squad, year, isSquadLeader, memberRank }) !==
    initialState;
  useEffect(() => {
    onBusyChange?.(isSaving);
  }, [isSaving, onBusyChange]);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const [nameError, setNameError] = useState<string | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);

  useEffect(() => {
    if (boyToEdit) {
      setName(boyToEdit.name);
      setSquad(resolveSquadNumber(squadOptions, boyToEdit.squad));
      setYear(boyToEdit.year || initialYear);
      setIsSquadLeader(boyToEdit.isSquadLeader || false);
      setMemberRank(boyToEdit.memberRank ?? null);
    } else {
      setName("");
      setSquad(resolveSquadNumber(squadOptions, undefined));
      setYear(initialYear);
      setIsSquadLeader(false);
      setMemberRank(null);
    }
    setNameError(null);
    setSquadError(null);
    setYearError(null);
    setRankCleared(false);
    setShowDiscard(false);
  }, [boyToEdit, activeSection, squadOptions, initialYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setNameError(null);
    setSquadError(null);
    setYearError(null);

    let isValid = true;
    if (!name.trim()) {
      setNameError("Name cannot be empty.");
      isValid = false;
    }
    if (!squadOptions.some((option) => option.number === squad)) {
      setSquadError("Choose a squad.");
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setIsSaving(true);
    try {
      if (boyToEdit) {
        await updateBoy(
          { ...boyToEdit, name, squad, year, isSquadLeader, memberRank },
          activeSection,
        );
        onSave(false, name);
      } else {
        await createBoy(
          { name, squad, year, marks: [], isSquadLeader, memberRank },
          activeSection,
        );
        onSave(true, name);
      }
    } catch (err) {
      console.error("Failed to save boy:", err);
      setNameError("Failed to save boy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="staff-form" aria-busy={isSaving}>
      <NativeInput
        label="Name"
        id="name"
        autoComplete="name"
        value={name}
        required
        onChange={(e) => setName(e.target.value)}
        error={nameError || undefined}
        disabled={isSaving}
      />
      <NativeField
        label="School year"
        htmlFor="year"
        error={yearError || undefined}
      >
        <select
          className="bb-input"
          id="year"
          value={year}
          disabled={isSaving}
          onChange={(e) => {
            const value = (
              isCompany ? parseInt(e.target.value, 10) : e.target.value
            ) as SchoolYear | JuniorYear;
            setYear(value);
            if (!isRankEligible(activeSection, value) && memberRank) {
              setMemberRank(null);
              setRankCleared(true);
            }
          }}
        >
          {schoolYears.map((y) => (
            <option key={y} value={y}>
              {formatSchoolYear(activeSection, y)}
            </option>
          ))}
        </select>
      </NativeField>
      {isCompany && (
        <NativeField
          label="Rank (optional)"
          htmlFor="member-rank"
          hint="Available from Year 11. Rank does not change squad-leader access."
        >
          <select
            className="bb-input"
            id="member-rank"
            value={memberRank ?? ""}
            disabled={isSaving || !isRankEligible(activeSection, year)}
            onChange={(e) => {
              setMemberRank((e.target.value || null) as MemberRank | null);
              setRankCleared(false);
            }}
          >
            <option value="">No rank</option>
            {MEMBER_RANKS.map((rank) => (
              <option key={rank.value} value={rank.value}>
                {rank.label}
              </option>
            ))}
          </select>
          {rankCleared && (
            <p role="status">
              Rank will be removed on save because this member is below Year 11.
            </p>
          )}
          {memberRank && (
            <p>
              <NameWithRank
                name={name.trim() || "Member name"}
                memberRank={memberRank}
              />
            </p>
          )}
        </NativeField>
      )}
      <NativeField
        label="Squad"
        htmlFor="member-squad"
        error={squadError || undefined}
      >
        <select
          className="bb-input"
          id="member-squad"
          value={squad}
          disabled={isSaving}
          onChange={(e) => setSquad(Number(e.target.value))}
        >
          {squadOptions.map((option) => (
            <option key={option.number} value={option.number}>
              {squadDisplayName(squadOptions, option.number)}
            </option>
          ))}
        </select>
      </NativeField>
      <div className="staff-switch-row">
        <span>Squad leader</span>
        <NativeSwitch
          label="Set as Squad Leader"
          checked={isSquadLeader}
          onChange={setIsSquadLeader}
          disabled={isSaving}
        />
      </div>
      {dirty && (
        <p className="staff-context">
          Unsaved member changes. Use Cancel to review discarding them.
        </p>
      )}
      {showDiscard && (
        <div
          className="bb-notice"
          role="group"
          aria-label="Discard unsaved member changes?"
        >
          <p>Discard unsaved member changes?</p>
          <div className="staff-form-actions">
            <NativeButton
              variant="secondary"
              onClick={() => setShowDiscard(false)}
            >
              Keep editing
            </NativeButton>
            <NativeButton danger onClick={onClose}>
              Discard changes
            </NativeButton>
          </div>
        </div>
      )}
      <div className="staff-form-actions">
        <NativeButton
          variant="secondary"
          onClick={() => {
            if (dirty) setShowDiscard(true);
            else onClose();
          }}
          disabled={isSaving}
        >
          Cancel
        </NativeButton>
        <NativeButton type="submit" busy={isSaving}>
          {boyToEdit ? "Update Boy" : "Add Boy"}
        </NativeButton>
      </div>
    </form>
  );
};
export default BoyForm;
