import React, { useState } from "react";
import {
  useModel,
  squads,
  weeks,
  formatDate,
  initialDate,
  type Overlay,
  type RankedMember,
} from "./model";
import { useUI, Icon } from "./foundation";
import companyLogo from "../../native-ios/assets/company.png";
import juniorLogo from "../../native-ios/assets/juniors.png";
export const overlayTitle: Record<Overlay["kind"], string> = {
  filter: "Sort & filter",
  workspace: "Your workspace",
  date: "Choose meeting",
  editor: "Member details",
  delete: "Remove member?",
  clear: "Clear this meeting?",
  discard: "Keep your changes?",
  report: "Report meeting",
  about: "Prototype options",
  actions: "Meeting actions",
};
export function titleForOverlay(o: Overlay | null) {
  return !o
    ? ""
    : o.kind === "editor"
      ? o.id
        ? "Edit member"
        : "New member"
      : overlayTitle[o.kind];
}
export function EditorAction() {
  const m = useModel();
  return (
    <button
      className="text-action editor-action"
      type="submit"
      form="member-editor"
      aria-label={m.overlay?.id ? "Save changes" : "Add member"}
      disabled={m.saving}
    >
      {m.overlay?.id ? "Save" : "Add"}
    </button>
  );
}
export function OverlayContent({ close }: { close: () => void }) {
  const m = useModel();
  const { Segment, Button, Switch, back, variant } = useUI();
  const o = m.overlay!;
  if (o.kind === "filter")
    return (
      <>
        <p className="sheet-intro">
          Find the right people without losing your place.
        </p>
        <fieldset>
          <legend>Squad</legend>
          <Segment
            label="Filter by squad"
            value={m.squad}
            onChange={m.setSquad}
            options={[
              { value: "all", label: "All" },
              ...squads.map((s) => ({
                value: String(s.id),
                label: String(s.id),
              })),
            ]}
          />
        </fieldset>
        <label className="form-field">
          School year
          <select
            aria-label="School year"
            value={m.year}
            onChange={(e) => m.setYear(e.target.value)}
          >
            <option value="all">All years</option>
            {Array.from({ length: m.section === "company" ? 7 : 4 }, (_, i) => (
              <option key={i} value={8 + i}>
                {m.section === "company" ? `Year ${8 + i}` : `P${4 + i}`}
              </option>
            ))}
          </select>
        </label>
        <button
          className="text-action"
          onClick={() => {
            m.setSearch("");
            m.setYear("all");
            m.setSquad("all");
            m.setMode("all");
          }}
        >
          Reset all filters
        </button>
        <div className="sheet-primary">
          <Button onClick={close}>Show {m.filtered.length} members</Button>
        </div>
      </>
    );
  if (o.kind === "workspace")
    return (
      <>
        <p className="sheet-intro">One Company. A place for every section.</p>
        <div className="workspace-options">
          {(["company", "junior"] as const)
            .filter((s) => m.role === "staff" || s === "company")
            .map((s) => (
              <button
                key={s}
                aria-pressed={m.section === s}
                onClick={() => m.chooseSection(s)}
              >
                <img src={s === "company" ? companyLogo : juniorLogo} alt="" />
                <span>
                  <strong>
                    {s === "company" ? "Company Section" : "Junior Section"}
                  </strong>
                  <small>
                    {s === "company"
                      ? "School years 8–14"
                      : "School years P4–P7"}
                  </small>
                </span>
                {m.section === s && <Icon name="check" size={21} />}
              </button>
            ))}
        </div>
      </>
    );
  if (o.kind === "editor") return <MemberEditor id={o.id} close={close} />;
  if (o.kind === "delete" || o.kind === "clear")
    return (
      <>
        <p className="confirmation-copy">
          {o.kind === "delete"
            ? `Remove ${m.members.find((p) => p.id === o.id)?.name} from this preview roster?`
            : "Set everyone to Not recorded for this meeting? Nothing changes until you save."}
        </p>
        <div className="confirmation-actions">
          <Button
            danger
            onClick={() => {
              if (o.kind === "delete") {
                m.removeMember(o.id!);
                back();
              } else m.clear();
            }}
          >
            {o.kind === "delete" ? "Remove member" : "Clear entries"}
          </Button>
          <Button quiet onClick={close}>
            Cancel
          </Button>
        </div>
      </>
    );
  if (o.kind === "discard")
    return (
      <>
        <p className="confirmation-copy">
          You have {m.dirty} unsaved changes. Save before changing the meeting
          or section, or discard them to continue.
        </p>
        <div className="confirmation-actions">
          <Button
            danger
            onClick={() => {
              if (o.nextDate) m.applyDate(o.nextDate);
              else if (o.nextSection) m.applySection(o.nextSection);
            }}
          >
            Discard changes
          </Button>
          <Button quiet onClick={close}>
            Stay here
          </Button>
        </div>
      </>
    );
  if (o.kind === "date") return <DateContent close={close} />;
  if (o.kind === "report")
    return (
      <>
        <p className="sheet-intro">
          Select a recorded meeting. The chart and dated roster stay in sync.
        </p>
        <div className="choice-list">
          {weeks.map((d, i) => (
            <button
              key={d}
              aria-pressed={m.week === i}
              onClick={() => {
                m.setWeek(i);
                close();
              }}
            >
              {formatDate(d)}
              {m.week === i && <Icon name="check" size={19} />}
            </button>
          ))}
        </div>
      </>
    );
  if (o.kind === "actions")
    return (
      <>
        <div className="choice-list">
          <button onClick={() => m.setOverlay({ kind: "date" })}>
            <Icon name="calendar" />
            Choose meeting date
            <Icon name="next" size={16} />
          </button>
          <button
            className="danger-text"
            disabled={m.locked}
            onClick={() => m.setOverlay({ kind: "clear" })}
          >
            <Icon name="trash" />
            Clear this meeting
          </button>
        </div>
        <p className="footnote">Changes are only applied when you save.</p>
      </>
    );
  return (
    <>
      <p className="sheet-intro">
        {variant === "framework7" ? "Framework7 Native" : "Assembly Native+"} ·
        iOS 26 experiment
      </p>
      <p>
        All records are synthetic. Saves stay in memory. Reload resets your
        changes. There is no account or backend connection.
      </p>
      <div className="preview-setting">
        <div>
          <strong>Simulate offline</strong>
          <p>Try a failed save and retry.</p>
        </div>
        <Switch
          label="Simulate offline"
          value={m.offline}
          onChange={m.setOffline}
        />
      </div>
      <h3>Explore a role</h3>
      <div className="choice-list">
        {["staff", "leader", "boy"].map((role) => (
          <a
            key={role}
            href={`?role=${role}&page=${role === "staff" ? "members" : role === "leader" ? "squad" : "home"}`}
          >
            {role === "staff"
              ? "Staff workspace"
              : role === "leader"
                ? "Squad Leader"
                : "Ordinary boy portal"}
            <Icon name="next" size={17} />
          </a>
        ))}
      </div>
      <a className="comparison-link" href="/">
        Compare both experiments
        <Icon name="external" size={17} />
      </a>
      <p className="footnote">
        Passkeys, notifications, archives and production administration are
        outside this synthetic experiment.
      </p>
    </>
  );
}
function DateContent({ close }: { close: () => void }) {
  const m = useModel();
  const { Button } = useUI();
  const [value, setValue] = useState(m.date);
  return (
    <>
      <p className="sheet-intro">Your marks stay with their meeting.</p>
      <label className="form-field">
        Meeting date
        <input
          type="date"
          name="meeting-date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <div className="choice-list">
        {["2026-10-09", initialDate, "2026-10-23"].map((d) => (
          <button
            key={d}
            aria-pressed={value === d}
            onClick={() => setValue(d)}
          >
            {formatDate(d)}
            {value === d && <Icon name="check" size={18} />}
          </button>
        ))}
      </div>
      <div className="sheet-primary">
        <Button
          disabled={!/^\d{4}-\d{2}-\d{2}$/.test(value)}
          onClick={() => {
            m.chooseDate(value);
          }}
        >
          Choose date
        </Button>
      </div>
    </>
  );
}
function MemberEditor({ id, close }: { id?: string; close: () => void }) {
  const m = useModel();
  const { Button, Switch } = useUI();
  const p = m.members.find((p) => p.id === id);
  const [name, setName] = useState(p?.name || "");
  const [year, setYear] = useState(p?.year || 8);
  const [squad, setSquad] = useState(p?.squad || 1);
  const [leader, setLeader] = useState(p?.leader || false);
  const [rank, setRank] = useState<RankedMember["rank"]>(p?.rank);
  return (
    <form
      id="member-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim())
          m.saveMember({ name: name.trim(), year, squad, leader, rank }, id);
      }}
    >
      <label className="form-field">
        Name
        <input
          required
          autoComplete="off"
          name="member-name"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="form-columns">
        <label className="form-field">
          School year
          <select
            aria-label="School year"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              if (Number(e.target.value) < 11) setRank(undefined);
            }}
          >
            {Array.from({ length: m.section === "company" ? 7 : 4 }, (_, i) => (
              <option key={i} value={8 + i}>
                {m.section === "company" ? `Year ${8 + i}` : `P${4 + i}`}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          Squad
          <select
            aria-label="Squad"
            value={squad}
            onChange={(e) => setSquad(Number(e.target.value))}
          >
            {squads.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {m.section === "company" && (
        <label className="form-field">
          NCO rank
          <select
            aria-label="NCO rank"
            disabled={year < 11}
            value={rank || ""}
            onChange={(e) =>
              setRank((e.target.value as RankedMember["rank"]) || undefined)
            }
          >
            <option value="">No rank</option>
            {["Lance Corporal", "Corporal", "Sergeant", "Staff Sergeant"].map(
              (r) => (
                <option key={r}>{r}</option>
              ),
            )}
          </select>
          <small>Optional for Years 11–14. Rank does not grant access.</small>
        </label>
      )}
      <div className="preview-setting">
        <div>
          <strong>Squad leader</strong>
          <p>A separate role from NCO rank.</p>
        </div>
        <Switch label="Squad leader" value={leader} onChange={setLeader} />
      </div>
    </form>
  );
}
