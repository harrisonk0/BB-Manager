import React from "react";
import {
  useModel,
  squads,
  yearLabel,
  attendancePercent,
  formatDate,
  weeks,
  entryError,
  emptyEntry,
  type RankedMember,
} from "./model";
import { useUI, Icon, IconButton, Avatar, MemberName } from "./foundation";
import bbLogo from "../../native-ios/assets/bb-blue.png";
export function Members() {
  const m = useModel();
  const { Group, Row, Segment, Search, Button, openMember } = useUI();
  return (
    <div className="screen-body roster-body">
      <p className="page-caption">
        {m.members.length} members <span>·</span> {squads.length} squads
      </p>
      <div className="search-line">
        <Search value={m.search} onChange={m.setSearch} />
        <IconButton
          name="filter"
          label="Filter members"
          onClick={() => m.setOverlay({ kind: "filter" })}
        />
      </div>
      <Segment
        label="Member view"
        value={m.mode}
        onChange={m.setMode}
        options={[
          { value: "all", label: "All members" },
          { value: "leaders", label: "Leaders" },
        ]}
      />
      {(m.search || m.squad !== "all" || m.year !== "all") && (
        <div className="results-line">
          <span>{m.filtered.length} members shown</span>
          <button
            onClick={() => {
              m.setSearch("");
              m.setSquad("all");
              m.setYear("all");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <div className="roster-grid">
        {squads.map((s) => {
          const members = m.filtered.filter((p) => p.squad === s.id);
          return (
            members.length > 0 && (
              <section key={s.id}>
                <h2 className="group-label">
                  <span>
                    Squad {s.id} <span className="secondary">· {s.name}</span>
                  </span>
                  <span>{members.length}</span>
                </h2>
                <Group className="roster-list">
                  {members.map((member) => (
                    <Row
                      key={member.id}
                      className="roster-row"
                      title={<MemberName member={member} />}
                      subtitle={`${yearLabel(member, m.section)} · ${attendancePercent(member)}% attendance`}
                      media={<Avatar member={member} />}
                      after={<Icon name="next" size={16} />}
                      onClick={() => openMember(member.id)}
                    />
                  ))}
                </Group>
              </section>
            )
          );
        })}
      </div>
      {!m.filtered.length && (
        <div className="empty-state">
          <Icon name="search" size={38} />
          <h2>No matching members</h2>
          <p>Try another name or clear your filters.</p>
          <Button
            onClick={() => {
              m.setSearch("");
              m.setSquad("all");
              m.setYear("all");
              m.setMode("all");
            }}
          >
            Clear search & filters
          </Button>
        </div>
      )}
      <p className="footnote">
        Stars identify squad leaders. Chevrons show an optional NCO rank.
      </p>
    </div>
  );
}
function Score({
  member,
  kind,
}: {
  member: RankedMember;
  kind: "score" | "uniform" | "behaviour";
}) {
  const m = useModel();
  const entry = m.entries[member.id] || emptyEntry();
  const fieldEntry =
    kind === "uniform"
      ? { ...entry, behaviour: "" }
      : kind === "behaviour"
        ? { ...entry, uniform: "" }
        : entry;
  const error = entryError(fieldEntry, m.section);
  const label =
    kind === "score" ? "Score" : kind === "uniform" ? "Uniform" : "Behaviour";
  return (
    <label className="score-input">
      <span>
        {label}{" "}
        <span className="secondary">/{kind === "behaviour" ? 5 : 10}</span>
      </span>
      <input
        aria-label={`${label} for ${member.name}`}
        data-member={member.id}
        value={entry[kind]}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${member.id}` : undefined}
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        disabled={m.locked || m.saving || entry.attendance !== "present"}
        placeholder="—"
        onChange={(e) => m.changeEntry(member.id, { [kind]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const fields = [
              ...e.currentTarget
                .closest(".screen-body")!
                .querySelectorAll<HTMLInputElement>(
                  ".score-input input:not(:disabled)",
                ),
            ];
            const next = fields[fields.indexOf(e.currentTarget) + 1];
            if (next) next.focus();
            else e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
export function Marks() {
  const m = useModel();
  const { Group, Segment } = useUI();
  const recorded = m.members.filter(
    (p) => m.entries[p.id]?.attendance !== "unrecorded",
  ).length;
  const present = m.members.filter(
    (p) => m.entries[p.id]?.attendance === "present",
  ).length;
  return (
    <div className="screen-body marks-body">
      <p className="page-caption">{formatDate(m.date)}</p>
      <div className="meeting-bar">
        <IconButton
          name="back"
          label="Previous meeting"
          onClick={() => {
            const d = new Date(m.date + "T12:00:00Z");
            d.setUTCDate(d.getUTCDate() - 7);
            m.chooseDate(d.toISOString().slice(0, 10));
          }}
        />
        <button
          className="meeting-label"
          onClick={() => m.setOverlay({ kind: "date" })}
        >
          <Icon name="calendar" size={18} />
          {m.date === "2026-10-16"
            ? "This Friday"
            : formatDate(m.date, { day: "numeric", month: "short" })}
          <Icon name="down" size={12} />
        </button>
        <IconButton
          name="next"
          label="Next meeting"
          onClick={() => {
            const d = new Date(m.date + "T12:00:00Z");
            d.setUTCDate(d.getUTCDate() + 7);
            m.chooseDate(d.toISOString().slice(0, 10));
          }}
        />
      </div>
      <div className="attendance-progress">
        <div>
          <strong>
            {recorded} of {m.members.length} recorded
          </strong>
          <span>{present} present</span>
        </div>
        <progress
          value={recorded}
          max={Math.max(1, m.members.length)}
          aria-label="Attendance recording progress"
        />
      </div>
      {m.locked && (
        <div className="notice">
          <Icon name="shield" size={18} />
          <span>Past meeting · view only</span>
          <button onClick={() => m.setUnlocked(true)}>Unlock</button>
        </div>
      )}
      <Segment
        label="Marks squad"
        value={m.marksSquad}
        onChange={m.setMarksSquad}
        options={[
          { value: "all", label: "All squads" },
          ...squads.map((s) => ({ value: String(s.id), label: String(s.id) })),
        ]}
      />
      <div className="marks-grid">
        {squads
          .filter(
            (s) => m.marksSquad === "all" || String(s.id) === m.marksSquad,
          )
          .map((s) => (
            <section key={s.id}>
              <h2 className="group-label">
                <span>
                  Squad {s.id} <span className="secondary">· {s.name}</span>
                </span>
              </h2>
              <Group className="marks-list">
                {m.members
                  .filter((p) => p.squad === s.id)
                  .map((member) => {
                    const entry = m.entries[member.id] || emptyEntry();
                    const error = entryError(entry, m.section);
                    return (
                      <li className="mark-row" key={member.id}>
                        <div className="mark-top">
                          <Avatar member={member} />
                          <div className="mark-person">
                            <MemberName member={member} />
                            <span className="person-meta">
                              {yearLabel(member, m.section)}
                            </span>
                          </div>
                          {m.section === "company" && (
                            <Score member={member} kind="score" />
                          )}
                        </div>
                        <div
                          className="attendance-strip"
                          role="group"
                          aria-label={`Attendance for ${member.name}`}
                        >
                          {(["unrecorded", "present", "absent"] as const).map(
                            (value) => (
                              <button
                                key={value}
                                aria-pressed={entry.attendance === value}
                                aria-label={`${value === "unrecorded" ? "Not recorded" : value === "present" ? "Present" : "Absent"} for ${member.name}`}
                                data-state={value}
                                disabled={m.locked || m.saving}
                                onClick={() =>
                                  m.changeEntry(member.id, {
                                    attendance: value,
                                  })
                                }
                              >
                                {value === "unrecorded" ? (
                                  <>
                                    <span aria-hidden="true">—</span>
                                    <span className="sr-only">
                                      Not recorded
                                    </span>
                                  </>
                                ) : value === "present" ? (
                                  <>
                                    <Icon name="check" size={15} />
                                    Present
                                  </>
                                ) : (
                                  "Absent"
                                )}
                              </button>
                            ),
                          )}
                        </div>
                        {m.section === "junior" && (
                          <div className="junior-fields">
                            <Score member={member} kind="uniform" />
                            <Score member={member} kind="behaviour" />
                          </div>
                        )}
                        {error && (
                          <p id={`error-${member.id}`} className="field-error">
                            {error}
                          </p>
                        )}
                      </li>
                    );
                  })}
              </Group>
            </section>
          ))}
      </div>
      <p className="footnote">
        Present with a blank score saves as 0. Not recorded clears that entry
        when you save.
      </p>
    </div>
  );
}
export function SaveAccessory() {
  const m = useModel();
  const { Button } = useUI();
  if (!m.dirty && !m.status && !m.error) return null;
  return (
    <aside
      className="save-accessory material-control"
      aria-label="Save meeting"
    >
      <div role="status">
        <strong>
          {m.error
            ? "Changes kept here"
            : m.saving
              ? "Saving your marks…"
              : m.dirty
                ? `${m.dirty} unsaved ${m.dirty === 1 ? "change" : "changes"}`
                : "All changes saved"}
        </strong>
        <span>{m.error || m.status || "Save when you’re ready."}</span>
      </div>
      <Button disabled={m.saving || (!m.dirty && !m.error)} onClick={m.save}>
        {m.saving ? (
          "Saving…"
        ) : m.error ? (
          "Try again"
        ) : m.dirty ? (
          "Save marks"
        ) : (
          <>
            <Icon name="check" size={17} />
            Saved
          </>
        )}
      </Button>
    </aside>
  );
}
export function Squad() {
  const m = useModel();
  const { Group, Row, Segment, openMember } = useUI();
  const number = m.role === "leader" ? 1 : m.reportSquad;
  const own = m.members.filter((p) => p.squad === number);
  const total = own.reduce((s, p) => s + p.total, 0);
  const attended = own.reduce((s, p) => s + p.attended, 0);
  const recorded = own.reduce(
    (s, p) => s + p.history.filter((v) => v >= -1).length,
    0,
  );
  const totals = squads
    .map((s) => ({
      ...s,
      total: m.members
        .filter((p) => p.squad === s.id)
        .reduce((t, p) => t + p.total, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const rank = 1 + totals.filter((s) => s.total > total).length;
  const weekly = weeks.map((_, i) =>
    own.reduce((s, p) => s + Math.max(0, p.history[i]), 0),
  );
  return (
    <div className="screen-body squad-body">
      <p className="page-caption">
        {squads[number - 1].name} <span>·</span> Squad {number}
      </p>
      {m.role === "staff" && (
        <Segment
          label="Reporting squad"
          value={String(number)}
          onChange={(v) => m.setReportSquad(Number(v))}
          options={squads.map((s) => ({
            value: String(s.id),
            label: `Squad ${s.id}`,
          }))}
        />
      )}
      <section className="metric-panel">
        <div>
          <span>Squad marks</span>
          <strong className="metric-number">{total}</strong>
        </div>
        <span className="metric-emblem" aria-hidden="true">
          <Icon name="squad" size={48} />
        </span>
        <div className="metric-strip">
          <div>
            <strong>
              {recorded ? Math.round((attended / recorded) * 100) : 0}%
            </strong>
            <span>Attendance</span>
          </div>
          <div>
            <strong>#{rank}</strong>
            <span>In Company</span>
          </div>
          <div>
            <strong>{attended ? (total / attended).toFixed(1) : "—"}</strong>
            <span>Avg score</span>
          </div>
        </div>
      </section>
      <section className="dated-report">
        <h2 className="group-label">
          <span>This week</span>
          <span>
            {own.filter((p) => p.history[m.week] >= 0).length} of {own.length}{" "}
            present
          </span>
        </h2>
        <Group>
          <li className="report-date">
            <IconButton
              name="back"
              label="Previous report week"
              onClick={() => m.setWeek(Math.max(0, m.week - 1))}
            />
            <label>
              <span className="sr-only">Report meeting</span>
              <select
                aria-label="Report meeting"
                value={m.week}
                onChange={(e) => m.setWeek(Number(e.target.value))}
              >
                {weeks.map((d, i) => (
                  <option value={i} key={d}>
                    {formatDate(d, {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </label>
            <IconButton
              name="next"
              label="Next report week"
              onClick={() => m.setWeek(Math.min(7, m.week + 1))}
            />
          </li>
          <li className="report-columns">
            <span>Member</span>
            <span>Score</span>
            <span>Total</span>
          </li>
          {own.map((p) => (
            <Row
              key={p.id}
              className="report-row"
              media={<Avatar member={p} />}
              title={<MemberName member={p} />}
              subtitle={`${yearLabel(p, m.section)} · ${attendancePercent(p)}% attendance`}
              after={
                <span className="report-numbers">
                  <span
                    className={p.history[m.week] < 0 ? "report-absent" : ""}
                  >
                    {p.history[m.week] === -2
                      ? "—"
                      : p.history[m.week] < 0
                        ? "Absent"
                        : p.history[m.week]}
                  </span>
                  <strong>{p.total}</strong>
                </span>
              }
              onClick={() => openMember(p.id)}
            />
          ))}
        </Group>
      </section>
      <div className="report-extras">
        <section>
          <h2 className="group-label">Weekly progress</h2>
          <div
            className="chart-surface"
            tabIndex={0}
            role="region"
            aria-label="Weekly squad marks. Scroll to see every meeting."
          >
            <div className="chart-bars">
              {weekly.map((v, i) => (
                <button
                  key={i}
                  aria-pressed={m.week === i}
                  onClick={() => m.setWeek(i)}
                >
                  <span className="chart-value">
                    {v}
                    <span className="sr-only"> squad marks, </span>
                  </span>
                  <span className="chart-track">
                    <span
                      style={{
                        height: `${Math.max(2, (v / Math.max(...weekly, 1)) * 100)}%`,
                      }}
                    />
                  </span>
                  <span>
                    {formatDate(weeks[i], { day: "numeric", month: "short" })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section>
          <h2 className="group-label">Company standings</h2>
          <Group>
            {totals.map((s) => (
              <Row
                key={s.id}
                title={s.name}
                subtitle={`Squad ${s.id}${s.id === number ? " · Your squad" : ""}`}
                media={
                  <span className="standing-rank">
                    {1 + totals.filter((other) => other.total > s.total).length}
                  </span>
                }
                after={<strong className="standing-total">{s.total}</strong>}
              />
            ))}
          </Group>
        </section>
      </div>
      <p className="footnote">
        Unrecorded nights don’t affect attendance. Equal totals share a
        position. Other squads show aggregate totals only.
      </p>
    </div>
  );
}
export function Settings() {
  const m = useModel();
  const { Group, Row, Switch } = useUI();
  const icon = (
    name: React.ComponentProps<typeof Icon>["name"],
    tone: string,
  ) => (
    <span className={`settings-symbol symbol-${tone}`}>
      <Icon name={name} size={21} />
    </span>
  );
  return (
    <div className="screen-body settings-body">
      <Group className="workspace-group">
        <Row
          media={
            <span className="workspace-avatar">
              <Icon name="members" size={29} />
            </span>
          }
          title={m.section === "company" ? "Company Section" : "Junior Section"}
          subtitle={
            m.role === "staff"
              ? "Staff workspace"
              : m.role === "leader"
                ? "Squad leader"
                : "Your portal"
          }
          after={<Icon name="next" size={16} />}
          onClick={() => m.setOverlay({ kind: "workspace" })}
        />
      </Group>
      <div className="settings-grid">
        <div>
          <h2 className="group-label">Your section</h2>
          <Group>
            <Row
              media={icon("calendar", "red")}
              title="Meeting day"
              after={
                <span className="disclosure-value">
                  Friday
                  <Icon name="next" size={15} />
                </span>
              }
              onClick={() => m.setOverlay({ kind: "date" })}
            />
            <Row
              media={icon("members", "blue")}
              title="Squads"
              after={
                <span className="disclosure-value">
                  3<Icon name="next" size={15} />
                </span>
              }
              onClick={() => m.setOverlay({ kind: "report" })}
            />
            <Row
              media={icon("calendar", "orange")}
              title="Past sessions"
              after={<Icon name="next" size={15} />}
              onClick={() => m.setOverlay({ kind: "about" })}
            />
          </Group>
          <h2 className="group-label">Your experience</h2>
          <Group>
            <Row
              media={icon("sun", "grey")}
              title="Appearance"
              after={
                <span className="disclosure-value">
                  Light
                  <Icon name="next" size={15} />
                </span>
              }
              onClick={() => m.setOverlay({ kind: "about" })}
            />
            <Row
              media={icon("moon", "indigo")}
              title="Reduce motion"
              after={
                <Switch
                  label="Reduce motion"
                  value={m.motion}
                  onChange={m.setMotion}
                />
              }
            />
            <Row
              media={icon("shield", "blue")}
              title="Solid navigation"
              after={
                <Switch
                  label="Solid navigation"
                  value={m.solid}
                  onChange={m.setSolid}
                />
              }
            />
          </Group>
          <p className="footnote">
            System motion preferences are always respected. Solid navigation
            removes transparency.
          </p>
        </div>
        <div>
          <h2 className="group-label">Account</h2>
          <Group>
            <Row
              media={icon("key", "grey")}
              title="Passkeys"
              after={<Icon name="next" size={15} />}
              onClick={() => m.setOverlay({ kind: "about" })}
            />
            <Row
              media={icon("bell", "orange")}
              title="Notifications"
              after={<Icon name="next" size={15} />}
              onClick={() => m.setOverlay({ kind: "about" })}
            />
            <Row
              media={icon("external", "red")}
              title="Preview options"
              after={<Icon name="next" size={15} />}
              onClick={() => m.setOverlay({ kind: "about" })}
            />
          </Group>
          <div className="brand-signature">
            <img src={bbLogo} alt="The Boys’ Brigade" />
            <span>Designed for your Friday nights.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export function MemberDetail({ id }: { id: string }) {
  const m = useModel();
  const { Group, Row, Button, navigate } = useUI();
  const p = m.members.find((p) => p.id === id);
  if (!p)
    return (
      <div className="screen-body">
        <p>Member removed.</p>
      </div>
    );
  return (
    <div className="screen-body detail-body">
      <div className="profile-header">
        <Avatar member={p} />
        <div>
          <MemberName member={p} />
          <span className="person-meta">
            {yearLabel(p, m.section)} · {squads[p.squad - 1].name}
          </span>
        </div>
        {m.role === "staff" && (
          <button
            className="text-action"
            onClick={() => m.setOverlay({ kind: "editor", id })}
          >
            Edit
          </button>
        )}
      </div>
      <div className="profile-metrics">
        <div>
          <strong>{p.total}</strong>
          <span>Total marks</span>
        </div>
        <div>
          <strong>{attendancePercent(p)}%</strong>
          <span>Attendance</span>
        </div>
      </div>
      <h2 className="group-label">Meeting history</h2>
      <Group>
        {weeks.map((d, i) => (
          <Row
            key={d}
            title={formatDate(d, { day: "numeric", month: "long" })}
            subtitle={
              p.history[i] === -2
                ? "Not recorded"
                : p.history[i] < 0
                  ? "Absent"
                  : "Present"
            }
            after={
              <span className="history-result">
                {p.history[i] < 0 ? "—" : p.history[i]}
                {m.role === "staff" && <Icon name="next" size={15} />}
              </span>
            }
            onClick={
              m.role === "staff"
                ? () => {
                    navigate("marks");
                    m.chooseDate(d);
                  }
                : undefined
            }
          />
        ))}
      </Group>
      {m.role === "staff" && (
        <div className="detail-actions">
          <Button
            onClick={() => {
              navigate("marks");
            }}
          >
            Record attendance
          </Button>
          <Button danger onClick={() => m.setOverlay({ kind: "delete", id })}>
            Remove member
          </Button>
        </div>
      )}
    </div>
  );
}
export function Home() {
  const m = useModel();
  const { Group, Row } = useUI();
  const p = m.members[0];
  return (
    <div className="screen-body">
      <p className="page-caption">Hi, Alex. Your Company, together.</p>
      <div className="metric-panel personal-metric">
        <span>Your marks this BB year</span>
        <strong className="metric-number">{p.total}</strong>
        <p>{attendancePercent(p)}% attendance · Falcons</p>
      </div>
      <h2 className="group-label">Your weekly marks</h2>
      <Group>
        {weeks.map((d, i) => (
          <Row
            key={d}
            title={formatDate(d, { day: "numeric", month: "short" })}
            after={
              <strong>
                {p.history[i] === -2
                  ? "Not recorded"
                  : p.history[i] < 0
                    ? "Absent"
                    : p.history[i]}
              </strong>
            }
          />
        ))}
      </Group>
    </div>
  );
}
export const screenComponents = {
  members: Members,
  marks: Marks,
  squad: Squad,
  settings: Settings,
  home: Home,
};
