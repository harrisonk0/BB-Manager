import React, { useMemo, useState } from "react";
import {
  attendancePercent,
  formatDate,
  squadName,
  squads,
  weeks,
  yearLabel,
  type Member,
  type Role,
  type Section,
} from "./data";
import { Icon } from "./icons";
import { Avatar, IconButton, PageTitle, Segmented, Sheet } from "./ui";

export function Squad({
  members,
  section,
  role,
  onMember,
}: {
  members: Member[];
  section: Section;
  role: Role;
  onMember: (member: Member) => void;
}) {
  const [number, setNumber] = useState("1");
  const [chosenWeek, setChosenWeek] = useState(7);
  const [range, setRange] = useState("recent");
  const [rangeOpen, setRangeOpen] = useState(false);
  const own = useMemo(
    () => members.filter((member) => member.squad === Number(number)),
    [members, number],
  );
  const total = own.reduce((sum, member) => sum + member.total, 0);
  const present = own.filter(
    (member) => member.history[chosenWeek] >= 0,
  ).length;
  const attendance = own.length
    ? Math.round(
        (own.reduce((sum, member) => sum + member.attended, 0) /
          Math.max(
            1,
            own.reduce(
              (sum, member) =>
                sum + member.history.filter((score) => score >= -1).length,
              0,
            ),
          )) *
          100,
      )
    : 0;
  const weeklyTotals = weeks.map((_, index) =>
    own.reduce((sum, member) => sum + Math.max(0, member.history[index]), 0),
  );
  const max = Math.max(...weeklyTotals, 1);
  const totals = squads
    .map((squad) => ({
      ...squad,
      total: members
        .filter((member) => member.squad === squad.id)
        .reduce((sum, member) => sum + member.total, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const position = 1 + totals.filter((squad) => squad.total > total).length;
  const presentRecords = own.reduce(
    (sum, member) => sum + member.history.filter((score) => score >= 0).length,
    0,
  );
  const average = presentRecords ? (total / presentRecords).toFixed(1) : "—";
  const visibleWeeks = weeks
    .map((date, index) => ({ date, index }))
    .slice(range === "recent" ? -5 : 0);
  return (
    <div className="squad-screen">
      <PageTitle
        title={role === "leader" ? "Your squad" : "Squad overview"}
        subtitle={`${squadName(Number(number))} · Squad ${number}`}
        action={
          <button className="period-button" onClick={() => setRangeOpen(true)}>
            This year <Icon name="down" size={14} />
          </button>
        }
      />
      {role === "staff" && (
        <Segmented
          label="Reporting squad"
          value={number}
          onChange={setNumber}
          options={squads.map((squad) => ({
            value: String(squad.id),
            label: `Squad ${squad.id}`,
          }))}
        />
      )}
      <section className="squad-summary" aria-label="Squad summary">
        <div className="squad-summary-top">
          <div>
            <p>Squad marks</p>
            <strong className="squad-total">{total}</strong>
          </div>
          <div className="summary-spark" aria-hidden="true">
            {weeklyTotals.slice(-4).map((value, index) => (
              <span
                key={index}
                style={{ height: `${28 + (value / max) * 35}px` }}
              />
            ))}
          </div>
        </div>
        <div className="squad-summary-bottom">
          <div>
            <strong>{attendance}%</strong>
            <span>Attendance</span>
          </div>
          <div>
            <strong>#{position}</strong>
            <span>In {section === "company" ? "Company" : "Junior"}</span>
          </div>
          <div>
            <strong>{average}</strong>
            <span>Avg score</span>
          </div>
        </div>
      </section>
      <div className="report-layout">
        <section className="chart-panel">
          <header className="section-title-row">
            <h2>Weekly progress</h2>
            <button className="text-button" onClick={() => setRangeOpen(true)}>
              {range === "recent" ? "Recent 5" : "All 8"}{" "}
              <Icon name="down" size={12} />
            </button>
          </header>
          <div
            className="chart-plot"
            tabIndex={0}
            role="region"
            aria-label="Weekly squad marks chart. Choose a bar to see that meeting."
          >
            <div
              className={`chart-bars ${range === "all" ? "chart-bars-all" : ""}`}
            >
              {visibleWeeks.map(({ date, index }) => (
                <button
                  key={date}
                  className={`chart-column ${chosenWeek === index ? "chart-column-selected" : ""}`}
                  aria-pressed={chosenWeek === index}
                  onClick={() => setChosenWeek(index)}
                >
                  <span className="sr-only">Select week: </span>
                  <span className="chart-number">
                    {weeklyTotals[index]}
                    <span className="sr-only"> squad marks, </span>
                  </span>
                  <span className="chart-track">
                    <span
                      style={{
                        height: `${Math.max(3, (weeklyTotals[index] / max) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="chart-date">
                    {formatDate(date, { day: "numeric" })}
                    <span> {formatDate(date, { month: "short" })}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="standings-panel">
          <header className="section-title-row">
            <h2>{section === "company" ? "Company" : "Junior"} standings</h2>
            <Icon name="squad" size={20} />
          </header>
          <ol className="standings-list">
            {totals.map((squad, index) => (
              <li
                key={squad.id}
                className={squad.id === Number(number) ? "standings-own" : ""}
              >
                <span className="standing-number">
                  {1 +
                    totals.filter((other) => other.total > squad.total).length}
                </span>
                <span>
                  <strong>{squad.name}</strong>
                  <span className="standing-caption">
                    Squad {squad.id}
                    {squad.id === Number(number) ? " · Selected" : ""}
                  </span>
                </span>
                <strong className="standing-total">{squad.total}</strong>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="list-group weekly-report">
        <header className="report-meeting">
          <IconButton
            icon="back"
            label="Previous report week"
            disabled={chosenWeek === 0}
            onClick={() => setChosenWeek((value) => Math.max(0, value - 1))}
          />
          <label className="report-week-label">
            <span className="sr-only">Report meeting</span>
            <select
              aria-label="Report meeting"
              value={chosenWeek}
              onChange={(event) => setChosenWeek(Number(event.target.value))}
            >
              {weeks.map((date, index) => (
                <option value={index} key={date}>
                  {formatDate(date, {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </label>
          <IconButton
            icon="chevron"
            label="Next report week"
            disabled={chosenWeek === 7}
            onClick={() => setChosenWeek((value) => Math.min(7, value + 1))}
          />
        </header>
        <div className="report-strip">
          <span>
            <strong>{weeklyTotals[chosenWeek]}</strong> marks this week
          </span>
          <span>
            <strong>
              {present} of {own.length}
            </strong>{" "}
            present
          </span>
        </div>
        <table className="native-table">
          <caption className="sr-only">
            {squadName(Number(number))} marks for{" "}
            {formatDate(weeks[chosenWeek])}
          </caption>
          <thead>
            <tr>
              <th scope="col">This week</th>
              <th scope="col">Score</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {own.map((member) => (
              <tr key={member.id}>
                <th scope="row">
                  <button
                    className="report-member"
                    onClick={() => onMember(member)}
                  >
                    <Avatar name={member.name} squad={member.squad} small />
                    <span>
                      {member.name}
                      <span className="member-meta">
                        {yearLabel(member, section)} ·{" "}
                        {attendancePercent(member)}%
                      </span>
                    </span>
                  </button>
                </th>
                <td>
                  <span
                    className={
                      member.history[chosenWeek] < 0
                        ? "score-absent"
                        : "report-score"
                    }
                  >
                    {member.history[chosenWeek] === -2
                      ? "—"
                      : member.history[chosenWeek] < 0
                        ? "Absent"
                        : member.history[chosenWeek]}
                  </span>
                </td>
                <td className="tabular">{member.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <details className="recorded-nights">
          <summary>
            View all recorded nights <Icon name="chevron" size={16} />
          </summary>
          <ul>
            {weeks.map((date, index) => (
              <li key={date}>
                <button
                  onClick={() => setChosenWeek(index)}
                  aria-pressed={chosenWeek === index}
                >
                  <span>
                    {formatDate(date, { day: "numeric", month: "short" })}
                  </span>
                  <strong>{weeklyTotals[index]} marks</strong>
                  {chosenWeek === index && <Icon name="check" size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </section>
      <p className="section-footnote">
        Attendance counts present and absent records. Unrecorded nights don’t
        count. Equal totals share a position.
      </p>
      {rangeOpen && (
        <Sheet title="Report period" onClose={() => setRangeOpen(false)}>
          <p className="sheet-intro">
            Totals cover this BB year. Choose how many meetings to show in the
            chart.
          </p>
          <div className="list-group choice-list">
            {[
              { value: "recent", label: "Recent 5 meetings" },
              { value: "all", label: "All 8 meetings" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setRange(option.value);
                  setRangeOpen(false);
                }}
                aria-pressed={range === option.value}
              >
                {option.label}
                {range === option.value && <Icon name="check" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
