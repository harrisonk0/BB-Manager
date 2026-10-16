import React, { useMemo, useState } from 'react';
import type { PortalSquadMember, PortalSummary } from '../types/portal';
import { buildSquadDashboard } from '../services/squadDashboard';
import {
  ChartBarIcon,
  CheckCircleIcon,
  StarIcon,
  TrophyIcon,
  UserCircleIcon,
} from './Icons';
import './SquadLeaderDashboard.css';

const formatDate = (date: string, short = false) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(short ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
const percentage = (value: number | null) =>
  value === null ? '—' : `${value}%`;
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('');

function Stat({
  label,
  value,
  detail,
  Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  Icon: React.FC<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="sd-stat">
      <span className={`sd-stat-icon sd-tone-${tone}`} aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="sd-muted">{label}</p>
      <p className="sd-stat-value">{value}</p>
      <p className="sd-stat-detail">{detail}</p>
    </div>
  );
}

export default function SquadLeaderDashboard({
  squad,
  squads,
  members,
}: {
  squad: number;
  squads: PortalSummary['squads'];
  members: PortalSquadMember[];
}) {
  const dashboard = useMemo(() => buildSquadDashboard(members), [members]);
  // An empty selection follows the latest recorded night when staff add marks.
  const [chosenDate, setChosenDate] = useState('');
  const week =
    dashboard.weeks.find((entry) => entry.date === chosenDate) ??
    dashboard.weeks[0];
  const ownSquad = squads.find((entry) => entry.number === squad);
  const squadName = ownSquad?.label || `Squad ${squad}`;
  const companyRank =
    1 + squads.filter((entry) => entry.total > dashboard.overall.total).length;
  const hasCompanyMarks = squads.some((entry) => entry.recorded > 0);
  const recentWeeks = dashboard.weeks.slice(0, 8).reverse();
  const maxWeeklyMarks = Math.max(
    ...recentWeeks.map((entry) => entry.total),
    1,
  );
  const maxCompanyMarks = Math.max(...squads.map((entry) => entry.total), 1);
  const maxMemberMarks = Math.max(
    ...dashboard.members.map((entry) => entry.total),
    1,
  );
  return (
    <div className="squad-dashboard">
      <div className="sd-page-heading">
        <div>
          <p className="sd-eyebrow">COMPANY SECTION / SQUAD LEADER</p>
          <h1>Squad dashboard</h1>
        </div>
        <span className="sd-year">
          <span aria-hidden="true" /> This BB year
        </span>
      </div>

      <header className="sd-hero">
        <div className="sd-hero-copy">
          <span className="sd-hero-tag">
            <UserCircleIcon className="h-4 w-4" /> YOUR SQUAD
          </span>
          <h2>{squadName}</h2>
          <p>A closer look at your squad’s weekly results and progress.</p>
          <div className="sd-hero-meta">
            <span>{members.length} squad members</span>
            <span aria-hidden="true">·</span>
            <span>{dashboard.weeks.length} recorded nights</span>
          </div>
        </div>
        <div className="sd-attendance-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r="51"
              fill="none"
              stroke="rgba(255,255,255,.12)"
              strokeWidth="6"
            />
            <circle
              cx="60"
              cy="60"
              r="51"
              fill="none"
              stroke="#8de1c0"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(dashboard.overall.attendance ?? 0) * 3.2044} 320.44`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div>
            <strong>{percentage(dashboard.overall.attendance)}</strong>
            <span>attendance</span>
          </div>
        </div>
      </header>

      <section aria-label="Overall squad statistics" className="sd-stats-grid">
        <Stat
          label="Squad marks"
          value={dashboard.overall.total.toLocaleString('en-GB')}
          detail="Total earned this BB year"
          Icon={StarIcon}
          tone="mint"
        />
        <Stat
          label="Company position"
          value={hasCompanyMarks ? `#${companyRank}` : '—'}
          detail={`Across ${squads.length} Company squads`}
          Icon={TrophyIcon}
          tone="gold"
        />
        <Stat
          label="Present / recorded"
          value={`${dashboard.overall.attended} / ${dashboard.overall.recorded}`}
          detail="Individual attendance records"
          Icon={CheckCircleIcon}
          tone="blue"
        />
        <Stat
          label="Average marks"
          value={dashboard.overall.averageMarks ?? '—'}
          detail="Per boy, per night when present"
          Icon={ChartBarIcon}
          tone="lilac"
        />
      </section>

      <div className="sd-chart-grid">
        <section
          aria-labelledby="squad-trend-heading"
          className="sd-panel sd-trend"
        >
          <div className="sd-panel-heading">
            <div>
              <p className="sd-eyebrow">WEEK BY WEEK</p>
              <h2 id="squad-trend-heading">Squad progress</h2>
            </div>
            <span className="sd-muted">Latest 8 nights</span>
          </div>
          {recentWeeks.length ? (
            <>
              <div className="sd-chart-legend">
                <span /> Squad marks <span className="sd-selected-dot" />{' '}
                Selected night
              </div>
              <div
                className="sd-bars"
                role="group"
                aria-label="Squad marks by meeting night"
              >
                {recentWeeks.map((entry) => (
                  <button
                    key={entry.date}
                    onClick={() => setChosenDate(entry.date)}
                    aria-label={`${formatDate(entry.date)}: ${entry.total} marks, ${percentage(entry.attendance)} attendance. View weekly results`}
                    aria-pressed={week?.date === entry.date}
                    className={`sd-bar-column ${week?.date === entry.date ? 'sd-bar-selected' : ''}`}
                  >
                    <span className="sd-bar-track">
                      <span
                        className="sd-bar"
                        style={{
                          height: `${Math.max(2, (entry.total / maxWeeklyMarks) * 100)}%`,
                        }}
                      >
                        <span>{entry.total}</span>
                      </span>
                    </span>
                    <span className="sd-bar-date">
                      {formatDate(entry.date, true)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="sd-chart-hint">
                Choose a bar to explore that night’s results.
              </p>
            </>
          ) : (
            <div className="sd-empty">
              Your squad’s progress will appear when staff record marks.
            </div>
          )}
        </section>

        <section
          aria-labelledby="squad-comparison-heading"
          className="sd-panel"
        >
          <div className="sd-panel-heading">
            <div>
              <p className="sd-eyebrow">THE BIGGER PICTURE</p>
              <h2 id="squad-comparison-heading">Squad standings</h2>
            </div>
            <TrophyIcon className="h-5 w-5 text-slate-400" />
          </div>
          <ol className="sd-standings">
            {[...squads]
              .sort((a, b) => b.total - a.total || a.number - b.number)
              .map((entry) => (
                <li
                  key={entry.number}
                  className={entry.number === squad ? 'sd-own-squad' : ''}
                >
                  <span className="sd-position">
                    {hasCompanyMarks
                      ? 1 +
                        squads.filter((other) => other.total > entry.total)
                          .length
                      : '—'}
                  </span>
                  <div className="sd-standing-detail">
                    <div>
                      <span>
                        {entry.label || `Squad ${entry.number}`}{' '}
                        {entry.number === squad && <small>YOURS</small>}
                      </span>
                      <strong>{entry.total.toLocaleString('en-GB')}</strong>
                    </div>
                    <div className="sd-standing-track" aria-hidden="true">
                      <span
                        style={{
                          width: `${(entry.total / maxCompanyMarks) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
          </ol>
          <p className="sd-standings-note">
            Total marks this BB year. Equal totals share a position.
          </p>
        </section>
      </div>

      <section
        aria-labelledby="squad-weekly-heading"
        className="sd-panel sd-roster"
      >
        <div className="sd-panel-heading">
          <div>
            <p className="sd-eyebrow">EVERY BOY. EVERY WEEK.</p>
            <h2 id="squad-weekly-heading">Your squad, in detail</h2>
            <p className="sd-muted">
              Weekly results alongside each boy’s running total.
            </p>
          </div>
          {!!dashboard.weeks.length && (
            <label className="sd-date-picker">
              Meeting date
              <select
                value={week.date}
                onChange={(event) => setChosenDate(event.target.value)}
              >
                {dashboard.weeks.map((entry) => (
                  <option key={entry.date} value={entry.date}>
                    {formatDate(entry.date)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {week ? (
          <div className="sd-week-summary">
            <span>
              <strong>{week.total}</strong> squad marks
            </span>
            <span>
              <strong>
                {week.attended} / {week.recorded}
              </strong>{' '}
              present
            </span>
            <span>
              <strong>{percentage(week.attendance)}</strong> attendance
            </span>
            <span>
              <strong>{members.length - week.recorded}</strong> not recorded
            </span>
          </div>
        ) : (
          <p className="sd-no-marks">
            No weekly marks recorded for your squad yet.
          </p>
        )}
        <div
          className="sd-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Squad member marks and attendance"
        >
          <table>
            <caption className="sr-only">
              Squad members ranked by overall marks.{' '}
              {week
                ? `Weekly results for ${formatDate(week.date)}.`
                : 'No marks recorded yet.'}
            </caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Squad member</th>
                <th scope="col">This night</th>
                <th scope="col">Total so far</th>
                <th scope="col">Year attendance</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.members.map((member) => {
                const mark = member.marks.find(
                  (entry) => entry.date === week?.date,
                );
                return (
                  <tr key={member.id}>
                    <td>
                      <span
                        className={`sd-member-rank ${member.rank === 1 ? 'sd-first-rank' : ''}`}
                      >
                        {member.rank === null ? '—' : `#${member.rank}`}
                      </span>
                    </td>
                    <th scope="row">
                      <span className="sd-member-name">
                        <span className="sd-avatar" aria-hidden="true">
                          {initials(member.name)}
                        </span>
                        <span>
                          {member.name}
                          {member.isSquadLeader && <small>Squad leader</small>}
                          <span className="sd-mobile-attendance">
                            {percentage(member.attendance)} attendance
                          </span>
                        </span>
                      </span>
                    </th>
                    <td>
                      {!mark ? (
                        <span className="sd-score sd-score-missing">
                          Not recorded
                        </span>
                      ) : mark.score < 0 ? (
                        <span className="sd-score sd-score-absent">Absent</span>
                      ) : (
                        <span className="sd-score sd-score-present">
                          {mark.score} marks
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="sd-member-total">
                        <strong>{member.total.toLocaleString('en-GB')}</strong>
                        <span aria-hidden="true">
                          <span
                            style={{
                              width: `${(member.total / maxMemberMarks) * 100}%`,
                            }}
                          />
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="sd-attendance-value">
                        {percentage(member.attendance)}
                      </span>
                      <span className="sd-attendance-detail">
                        {member.attended} / {member.recorded} nights
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="sd-table-footer">
          <span>{members.length} squad members</span>
          <span>Ranked by total marks this BB year</span>
        </div>
        {!!dashboard.weeks.length && (
          <details className="sd-history">
            <summary>Browse all recorded nights</summary>
            <ul>
              {dashboard.weeks.map((entry) => (
                <li key={entry.date}>
                  <button
                    onClick={() => setChosenDate(entry.date)}
                    aria-pressed={week?.date === entry.date}
                  >
                    <span>{formatDate(entry.date)}</span>
                    <span>
                      {entry.total} marks · {percentage(entry.attendance)}{' '}
                      attendance
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <p className="sd-footnote">
        Stats follow the current squad roster. Attendance uses present and
        absent records; unrecorded nights do not count. A present score of zero
        counts as attended.
      </p>
    </div>
  );
}
