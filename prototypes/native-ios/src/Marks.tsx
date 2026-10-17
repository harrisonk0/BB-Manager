import React, { useState } from "react";
import {
  entryError,
  formatDate,
  squads,
  yearLabel,
  type Entry,
  type Member,
  type Section,
} from "./data";
import { Icon } from "./icons";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  PageTitle,
  Segmented,
} from "./ui";
interface Props {
  members: Member[];
  section: Section;
  date: string;
  entries: Record<string, Entry>;
  dirtyCount: number;
  saving: boolean;
  savedAt: string;
  saveError: string;
  locked: boolean;
  onEntry: (id: string, patch: Partial<Entry>) => void;
  onDate: () => void;
  onShift: (direction: number) => void;
  onSave: () => void;
  onClear: () => void;
  onUnlock: () => void;
}
export function Marks({
  members,
  section,
  date,
  entries,
  dirtyCount,
  saving,
  savedAt,
  saveError,
  locked,
  onEntry,
  onDate,
  onShift,
  onSave,
  onClear,
  onUnlock,
}: Props) {
  const advanceScore = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const fields = [
      ...document.querySelectorAll<HTMLInputElement>(
        ".screen:not([hidden]) .score-field input:not(:disabled)",
      ),
    ];
    const next = fields[fields.indexOf(event.currentTarget) + 1];
    if (next) next.focus();
    else event.currentTarget.blur();
  };
  const [squad, setSquad] = useState("all");
  const recorded = members.filter(
    (member) => entries[member.id]?.attendance !== "unrecorded",
  ).length;
  const present = members.filter(
    (member) => entries[member.id]?.attendance === "present",
  ).length;
  const errors = members.filter((member) =>
    entryError(entries[member.id], section),
  );
  return (
    <>
      <PageTitle
        title="Weekly marks"
        subtitle={formatDate(date)}
        action={
          <IconButton icon="more" label="Meeting actions" onClick={onClear} />
        }
      />
      <div className="meeting-selector">
        <IconButton
          icon="back"
          label="Previous meeting"
          onClick={() => onShift(-1)}
        />
        <button className="meeting-date" onClick={onDate}>
          <Icon name="calendar" size={18} />
          <span>
            {date === "2026-10-16"
              ? "This Friday"
              : formatDate(date, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
          </span>
          <Icon name="down" size={14} />
        </button>
        <IconButton
          icon="chevron"
          label="Next meeting"
          onClick={() => onShift(1)}
        />
      </div>
      <div className="meeting-progress">
        <div>
          <strong>
            {recorded} of {members.length} recorded
          </strong>
          <span>{present} present</span>
        </div>
        <progress
          aria-label="Attendance recording progress"
          max={Math.max(members.length, 1)}
          value={recorded}
        />
      </div>
      {locked && (
        <div className="inline-notice">
          <Icon name="shield" size={20} />
          <span>Past meeting. View only.</span>
          <button className="text-button" onClick={onUnlock}>
            Unlock
          </button>
        </div>
      )}
      <Segmented
        label="Marks squad"
        value={squad}
        onChange={setSquad}
        options={[
          { value: "all", label: "All squads" },
          ...squads.map((group) => ({
            value: String(group.id),
            label: String(group.id),
          })),
        ]}
      />
      <div className="marks-groups">
        {squads
          .filter((group) => squad === "all" || String(group.id) === squad)
          .map((group) => {
            const list = members.filter((member) => member.squad === group.id);
            return (
              list.length > 0 && (
                <section
                  key={group.id}
                  className="list-group"
                  aria-labelledby={`marks-squad-${group.id}`}
                >
                  <header className="group-heading">
                    <div>
                      <span
                        className={`squad-dot squad-dot-${group.id}`}
                        aria-hidden="true"
                      />
                      <h2 id={`marks-squad-${group.id}`}>
                        Squad {group.id} <span>· {group.name}</span>
                      </h2>
                    </div>
                    <span className="group-count">{list.length} members</span>
                  </header>
                  <ul className="marks-list">
                    {list.map((member) => {
                      const entry = entries[member.id];
                      const error = entryError(entry, section);
                      return (
                        <li
                          id={`mark-${member.id}`}
                          key={member.id}
                          className={`marks-row ${entry.attendance === "absent" ? "marks-row-absent" : ""}`}
                        >
                          <div className="marks-identity">
                            <Avatar
                              name={member.name}
                              squad={member.squad}
                              small
                            />
                            <span className="member-copy">
                              <span className="member-name">{member.name}</span>
                              <span className="member-meta">
                                {yearLabel(member, section)}
                              </span>
                            </span>
                            {section === "company" && (
                              <label className="score-field">
                                <span>Score /10</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  autoComplete="off"
                                  enterKeyHint="next"
                                  onKeyDown={advanceScore}
                                  name={`score-${member.id}`}
                                  aria-label={`Score for ${member.name}`}
                                  aria-invalid={!!error}
                                  aria-describedby={
                                    error
                                      ? `mark-error-${member.id}`
                                      : undefined
                                  }
                                  value={entry.score}
                                  disabled={
                                    locked ||
                                    saving ||
                                    entry.attendance !== "present"
                                  }
                                  placeholder="—"
                                  onChange={(event) =>
                                    onEntry(member.id, {
                                      score: event.target.value,
                                    })
                                  }
                                />
                              </label>
                            )}
                          </div>
                          <div
                            role="group"
                            aria-label={`Attendance for ${member.name}`}
                            className="attendance-control"
                          >
                            {(["unrecorded", "present", "absent"] as const).map(
                              (status) => (
                                <button
                                  type="button"
                                  disabled={locked || saving}
                                  key={status}
                                  aria-pressed={entry.attendance === status}
                                  aria-label={`${status === "unrecorded" ? "Not recorded" : status === "present" ? "Present" : "Absent"} for ${member.name}`}
                                  data-status={status}
                                  onClick={() =>
                                    onEntry(member.id, { attendance: status })
                                  }
                                >
                                  {status === "unrecorded" ? (
                                    <>
                                      <span aria-hidden="true">—</span>
                                      <span className="sr-only">
                                        Not recorded
                                      </span>
                                    </>
                                  ) : status === "present" ? (
                                    <>
                                      <Icon name="check" size={15} />
                                      <span>Present</span>
                                    </>
                                  ) : (
                                    "Absent"
                                  )}
                                </button>
                              ),
                            )}
                          </div>
                          {section === "junior" && (
                            <div className="junior-scores">
                              {(["uniform", "behaviour"] as const).map(
                                (kind) => (
                                  <label key={kind} className="score-field">
                                    <span>
                                      {kind === "uniform"
                                        ? "Uniform /10"
                                        : "Behaviour /5"}
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      autoComplete="off"
                                      enterKeyHint="next"
                                      onKeyDown={advanceScore}
                                      name={`${kind}-${member.id}`}
                                      aria-label={`${kind === "uniform" ? "Uniform" : "Behaviour"} score for ${member.name}`}
                                      aria-invalid={!!error}
                                      aria-describedby={
                                        error
                                          ? `mark-error-${member.id}`
                                          : undefined
                                      }
                                      value={entry[kind]}
                                      disabled={
                                        locked ||
                                        saving ||
                                        entry.attendance !== "present"
                                      }
                                      placeholder="—"
                                      onChange={(event) =>
                                        onEntry(member.id, {
                                          [kind]: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                ),
                              )}
                            </div>
                          )}
                          {error && (
                            <p
                              className="field-error"
                              id={`mark-error-${member.id}`}
                            >
                              {error}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )
            );
          })}
      </div>
      {!members.length && (
        <EmptyState title="Ready when your roster is">
          Add members in the Members tab before recording this meeting.
        </EmptyState>
      )}
      <p className="section-footnote">
        Not recorded clears a saved entry. A present member with a blank score
        saves as 0.
      </p>
      {(dirtyCount > 0 || saveError || savedAt) && (
        <div
          className={`save-accessory ${saveError ? "save-accessory-error" : ""}`}
        >
          <div aria-live="polite">
            <strong>
              {saveError
                ? "Changes kept on this screen"
                : dirtyCount
                  ? `${dirtyCount} unsaved ${dirtyCount === 1 ? "change" : "changes"}`
                  : "All changes saved"}
            </strong>
            <span>
              {saveError ||
                (dirtyCount ? "Save when you’re ready." : "Saved just now.")}
            </span>
          </div>
          <Button
            onClick={() => {
              if (errors.length) {
                setSquad("all");
                requestAnimationFrame(onSave);
              } else onSave();
            }}
            disabled={saving || (!dirtyCount && !saveError)}
          >
            {saving ? (
              "Saving…"
            ) : saveError ? (
              "Try again"
            ) : dirtyCount ? (
              "Save marks"
            ) : (
              <>
                <Icon name="check" size={18} /> Saved
              </>
            )}
          </Button>
          {errors.length > 0 && (
            <p className="save-errors" role="alert">
              Check the highlighted scores before saving.
            </p>
          )}
        </div>
      )}
    </>
  );
}
