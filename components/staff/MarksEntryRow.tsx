import React, { memo } from "react";
import type { Boy } from "../../types";
import type {
  AttendanceStatus,
  CompanyMarkState,
  JuniorMarkState,
} from "../weeklyMarksSavePlan";
import { NativeButton, NativeInput } from "../ui";
import { NameWithRank } from "../RankBadge";

type ScoreType = "score" | "uniform" | "behaviour";
export interface MarksEntryRowProps {
  boy: Boy;
  status: AttendanceStatus;
  mark: CompanyMarkState | JuniorMarkState;
  errors?: Partial<Record<ScoreType, string>>;
  isCompany: boolean;
  isLocked: boolean;
  isSaving: boolean;
  onAttendance: (id: string) => void;
  onScore: (id: string, type: ScoreType, value: string) => void;
}
const noErrors = {};
/** A changed member updates its own F7 controls; untouched rows retain their React subtree. */
export const MarksEntryRow = memo(function MarksEntryRow({
  boy,
  status,
  mark,
  errors = noErrors,
  isCompany,
  isLocked,
  isSaving,
  onAttendance,
  onScore,
}: MarksEntryRowProps) {
  const present = status === "present";
  const absent = status === "absent";
  const junior = mark as JuniorMarkState;
  return (
    <li className="staff-marks-row">
      <div className="staff-member-copy">
        <span className="staff-member-name">
          <NameWithRank name={boy.name} memberRank={boy.memberRank} />
          {boy.isSquadLeader && <span className="staff-leader">Leader</span>}
        </span>
        <span className="staff-context">
          {isCompany ? `Year ${boy.year}` : boy.year}
        </span>
      </div>
      <div className="staff-score-controls">
        <NativeButton
          variant="secondary"
          className={`staff-attendance staff-attendance--${status || "unrecorded"}`}
          disabled={isLocked || isSaving}
          onClick={() => onAttendance(boy.id!)}
          aria-pressed={present}
          aria-label={
            present
              ? `Present, ${boy.name}. Mark as absent`
              : absent
                ? `Absent, ${boy.name}. Clear attendance`
                : `Not recorded, ${boy.name}. Mark as present`
          }
        >
          {present ? "Present" : absent ? "Absent" : "Not recorded"}
        </NativeButton>
        {isCompany ? (
          <NativeInput
            label="Score /10"
            type="number"
            min="0"
            max="10"
            step="0.01"
            inputMode="decimal"
            aria-label={`Score /10 for ${boy.name}`}
            value={
              Number(mark as CompanyMarkState) < 0
                ? ""
                : ((mark as CompanyMarkState) ?? "")
            }
            onChange={(e) => onScore(boy.id!, "score", e.target.value)}
            disabled={!present || isLocked || isSaving}
            error={errors.score}
            placeholder="—"
          />
        ) : (
          <>
            <NativeInput
              label="Uniform /10"
              id={`uniform-${boy.id}`}
              type="number"
              min="0"
              max="10"
              step="0.01"
              inputMode="decimal"
              aria-label={`Uniform /10 for ${boy.name}`}
              value={Number(junior?.uniform) < 0 ? "" : (junior?.uniform ?? "")}
              onChange={(e) => onScore(boy.id!, "uniform", e.target.value)}
              disabled={!present || isLocked || isSaving}
              error={errors.uniform}
              placeholder="—"
            />
            <NativeInput
              label="Behaviour /5"
              id={`behaviour-${boy.id}`}
              type="number"
              min="0"
              max="5"
              step="0.01"
              inputMode="decimal"
              aria-label={`Behaviour /5 for ${boy.name}`}
              value={
                Number(junior?.behaviour) < 0 ? "" : (junior?.behaviour ?? "")
              }
              onChange={(e) => onScore(boy.id!, "behaviour", e.target.value)}
              disabled={!present || isLocked || isSaving}
              error={errors.behaviour}
              placeholder="—"
            />
          </>
        )}
      </div>
    </li>
  );
});
