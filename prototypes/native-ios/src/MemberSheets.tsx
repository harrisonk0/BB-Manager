import React, { useState } from "react";
import {
  attendancePercent,
  formatDate,
  squadName,
  squads,
  weeks,
  yearLabel,
  type Member,
  type Section,
} from "./data";
import { Icon } from "./icons";
import { Avatar, Button, Sheet, Switch } from "./ui";
export function MemberDetail({
  member,
  section,
  canEdit,
  onClose,
  onEdit,
  onDelete,
  onMark,
  onReviewDate,
}: {
  member: Member;
  section: Section;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMark: () => void;
  onReviewDate: (date: string) => void;
}) {
  return (
    <Sheet
      title={member.name}
      onClose={onClose}
      full
      footer={
        canEdit ? (
          <Button onClick={onMark}>
            <Icon name="marks" size={20} /> Record attendance
          </Button>
        ) : undefined
      }
    >
      <div className="member-profile">
        <Avatar name={member.name} squad={member.squad} />
        <div>
          <strong>
            {yearLabel(member, section)} · {squadName(member.squad)}
          </strong>
          <p>{member.leader ? "Squad leader" : `Squad ${member.squad}`}</p>
        </div>
        {canEdit && (
          <Button variant="quiet" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
      <div className="profile-stats">
        <div>
          <strong>{member.total}</strong>
          <span>Total marks</span>
        </div>
        <div>
          <strong>{attendancePercent(member)}%</strong>
          <span>Attendance</span>
        </div>
      </div>
      <h3 className="detail-section-title">Meeting history</h3>
      <p className="group-footnote">
        This BB year · {weeks.length} recorded nights
      </p>
      <ul className="list-group history-list">
        {weeks.map((date, index) => (
          <li key={date}>
            <div>
              <strong>
                {formatDate(date, { day: "numeric", month: "long" })}
              </strong>
              <span>
                {member.history[index] === -2
                  ? "Not recorded"
                  : member.history[index] < 0
                    ? "Absent"
                    : "Present"}
              </span>
            </div>
            <strong className="history-score">
              {member.history[index] < 0 ? "—" : member.history[index]}
            </strong>
            {canEdit && (
              <button
                className="history-edit"
                aria-label={`Review ${formatDate(date)} score`}
                onClick={() => onReviewDate(date)}
              >
                <Icon name="edit" size={18} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <Button variant="danger" className="delete-member" onClick={onDelete}>
          <Icon name="trash" size={18} /> Remove member
        </Button>
      )}
    </Sheet>
  );
}
export function MemberEditor({
  member,
  section,
  onClose,
  onSave,
}: {
  member?: Member;
  section: Section;
  onClose: () => void;
  onSave: (value: {
    name: string;
    year: number;
    squad: number;
    leader: boolean;
  }) => void;
}) {
  const [name, setName] = useState(member?.name || "");
  const [year, setYear] = useState(member?.year || 8);
  const [squad, setSquad] = useState(member?.squad || 1);
  const [leader, setLeader] = useState(member?.leader || false);
  const [error, setError] = useState("");
  return (
    <Sheet
      title={member ? "Edit member" : "New member"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="member-editor">
            {member ? "Save changes" : "Add member"}
          </Button>
        </>
      }
    >
      <form
        id="member-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) {
            setError("Enter a name.");
            return;
          }
          onSave({ name: name.trim(), year, squad, leader });
        }}
      >
        <p className="sheet-intro">
          A place in your Company starts with a name.
        </p>
        <label className="form-field">
          Name
          <input
            name="member-name"
            autoComplete="off"
            required
            value={name}
            aria-invalid={!!error}
            aria-describedby={error ? "member-name-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="Full name"
          />
        </label>
        {error && (
          <p className="field-error" id="member-name-error">
            {error}
          </p>
        )}
        <div className="form-columns">
          <label className="form-field">
            School year
            <select
              name="school-year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {Array.from(
                { length: section === "company" ? 7 : 4 },
                (_, index) => (
                  <option key={index} value={index + 8}>
                    {section === "company"
                      ? `Year ${index + 8}`
                      : `P${index + 4}`}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="form-field">
            Squad
            <select
              name="squad"
              value={squad}
              onChange={(event) => setSquad(Number(event.target.value))}
            >
              {squads.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.id} · {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-toggle">
          <div>
            <strong>Squad leader</strong>
            <p>Show a star beside their name.</p>
          </div>
          <Switch label="Squad leader" value={leader} onChange={setLeader} />
        </div>
      </form>
    </Sheet>
  );
}
