import { NameWithRank } from "./RankBadge";
/**
 * @file DashboardPage.tsx
 * @description Displays a summary dashboard of member performance.
 * It shows a table of all members with their total marks broken down by month,
 * providing a high-level overview for reporting and comparison.
 */

import React, { Suspense, useMemo } from "react";
import { Boy, Section, Mark, SectionSettings } from "../types";
import { NativeButton, EmptyState, LoadingState } from "./ui";
import "./reporting/reporting.css";
import BarChart from "./BarChart";
import {
  squadChartColor,
  squadDisplayName,
  withSettingsSquads,
} from "../services/sectionSquads";

const SessionReportModal = React.lazy(() => import("./SessionReportModal"));

interface DashboardPageProps {
  boys: Boy[];
  activeSection: Section;
  settings: SectionSettings | null;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  boys,
  activeSection,
  settings,
}) => {
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const isCompany = activeSection === "company";
  const configuredSquads = withSettingsSquads(settings, activeSection);

  // --- UTILITY FUNCTIONS ---
  const calculateTotalMarks = (boy: Boy) => {
    return boy.marks.reduce(
      (total, mark) => total + (mark.score > 0 ? mark.score : 0),
      0,
    );
  };

  // --- MEMOIZED COMPUTATIONS ---
  const boysBySquad = useMemo(() => {
    const grouped: Record<string, Boy[]> = {};
    boys.forEach((boy) => {
      if (!grouped[boy.squad]) grouped[boy.squad] = [];
      grouped[boy.squad].push(boy);
    });
    return grouped;
  }, [boys]);

  const allMonths = useMemo(() => {
    const allMonthStrings = new Set<string>();
    boys.forEach((boy) => {
      boy.marks.forEach((mark) =>
        allMonthStrings.add(mark.date.substring(0, 7)),
      );
    });
    return Array.from(allMonthStrings).sort((a, b) => b.localeCompare(a));
  }, [boys]);

  const leaderboard = useMemo(() => {
    return [...boys]
      .map((boy) => ({ ...boy, totalMarks: calculateTotalMarks(boy) }))
      .sort((a, b) => b.totalMarks - a.totalMarks)
      .slice(0, 5);
  }, [boys]);

  const squadMarksData = useMemo(() => {
    return Object.keys(boysBySquad)
      .map((squad) => ({
        label: squadDisplayName(configuredSquads, Number(squad)),
        value: boysBySquad[squad].reduce(
          (total, boy) => total + calculateTotalMarks(boy),
          0,
        ),
        color: squadChartColor(activeSection, Number(squad)),
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true }),
      );
  }, [activeSection, boysBySquad, configuredSquads]);

  const heatmapData = useMemo(() => {
    const allDates = Array.from(
      new Set(boys.flatMap((b) => b.marks.map((m) => m.date))),
    ).sort();
    const sortedSquads = Object.keys(boysBySquad).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );

    if (allDates.length === 0 || sortedSquads.length === 0) {
      return { dates: [], squads: [], matrix: {} };
    }

    const matrix: Record<string, Record<string, number | undefined>> = {};

    sortedSquads.forEach((squad: string) => {
      matrix[squad] = {};
      const squadBoys = boysBySquad[squad];
      allDates.forEach((date: string) => {
        // Find all marks for the boys in this squad on this specific date.
        const marksForDate: Mark[] = squadBoys
          .map((b) => b.marks.find((m) => m.date === date))
          .filter((mark): mark is Mark => !!mark); // Filter out undefined and ensure correct type.

        const totalForDate = marksForDate.length;

        if (totalForDate === 0) {
          // If no one in the squad has a mark for this date, there's no data.
          matrix[squad][date] = undefined;
        } else {
          // Of those with a mark, count how many were present.
          const attended = marksForDate.filter((m) => m.score >= 0).length;
          matrix[squad][date] = Math.round((attended / totalForDate) * 100);
        }
      });
    });

    return {
      dates: allDates,
      squads: sortedSquads,
      matrix: matrix,
    };
  }, [boys, boysBySquad]);

  const getHeatmapColor = (percentage: number | undefined) => {
    if (percentage === undefined || isNaN(percentage)) {
      return { backgroundColor: "#f1f5f9" }; // slate-100 for N/A
    }
    const hue = (percentage / 100) * 120; // 0 (red) to 120 (green)
    return { backgroundColor: `hsl(${hue}, 80%, 88%)` }; // Using HSL for a color scale
  };

  const getMarksForMonth = (boy: Boy, month: string) => {
    const total = boy.marks
      .filter((mark) => mark.date.startsWith(month) && mark.score >= 0)
      .reduce((sum, mark) => sum + mark.score, 0);
    const hasMarksInMonth = boy.marks.some((mark) =>
      mark.date.startsWith(month),
    );
    return hasMarksInMonth ? (
      total.toString()
    ) : (
      <span className="text-slate-400">-</span>
    );
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
  };

  const sortedSquads = Object.keys(boysBySquad).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  if (boys.length === 0)
    return (
      <EmptyState title="Your session at a glance">
        Add members and record marks to see performance, attendance and session
        reports here.
      </EmptyState>
    );
  const totalMarks = boys.reduce(
    (sum, boy) => sum + calculateTotalMarks(boy),
    0,
  );
  return (
    <div className="bb-reports">
      <div className="bb-report-toolbar">
        <p className="bb-report-intro">
          {isCompany ? "Company" : "Junior"} session overview
        </p>
        <NativeButton
          variant="secondary"
          onClick={() => setIsReportModalOpen(true)}
        >
          Generate Master PDF
        </NativeButton>
      </div>
      <dl className="bb-report-metrics">
        <div className="bb-report-metric">
          <dt>Members</dt>
          <dd>{boys.length}</dd>
        </div>
        <div className="bb-report-metric">
          <dt>Total marks</dt>
          <dd>{totalMarks}</dd>
        </div>
        <div className="bb-report-metric">
          <dt>Meetings</dt>
          <dd>{heatmapData.dates.length}</dd>
        </div>
      </dl>
      <div className="bb-report-two">
        <section className="bb-report-section">
          <h2>Top 5 members</h2>
          <ol className="bb-report-roster">
            {leaderboard.map((boy, index) => (
              <li key={boy.id}>
                <span className="bb-rank-position">{index + 1}</span>
                <span className="bb-member-name">
                  <NameWithRank name={boy.name} memberRank={boy.memberRank} />
                </span>
                <strong className="bb-report-value">{boy.totalMarks}</strong>
              </li>
            ))}
          </ol>
        </section>
        <section className="bb-report-section">
          <h2>Squad performance</h2>
          <div className="bb-form-surface">
            {squadMarksData.some((d) => d.value > 0) ? (
              <BarChart data={squadMarksData} />
            ) : (
              <p className="bb-report-intro">No marks recorded yet.</p>
            )}
          </div>
        </section>
      </div>
      {heatmapData.dates.length > 0 && (
        <section className="bb-report-section">
          <h2>Squad attendance trend</h2>
          <div
            className="bb-report-table-wrap"
            role="region"
            aria-label="Squad attendance trend, scroll for more dates"
            tabIndex={0}
          >
            <table className="bb-report-table">
              <caption>
                Attendance among members with a saved mark. Scroll horizontally
                for all meetings.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Squad</th>
                  {heatmapData.dates.map((date) => (
                    <th key={date} scope="col">
                      {new Date(date + "T00:00:00").toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.squads.map((squad) => (
                  <tr key={squad}>
                    <th scope="row">
                      {squadDisplayName(configuredSquads, Number(squad))}
                    </th>
                    {heatmapData.dates.map((date) => {
                      const percentage = heatmapData.matrix[squad]?.[date];
                      return (
                        <td key={date} style={getHeatmapColor(percentage)}>
                          {percentage !== undefined ? `${percentage}%` : "N/A"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="bb-report-section">
        <h2>Marks by month</h2>
        <p className="bb-report-intro">
          Every member, every month. Scroll the table for previous months.
        </p>
        <div
          className="bb-report-table-wrap"
          role="region"
          aria-label="Monthly marks breakdown, scroll for more months"
          tabIndex={0}
        >
          <table className="bb-report-table">
            <caption>
              Absent marks do not add to totals. A dash means no record for that
              month.
            </caption>
            <thead>
              <tr>
                <th scope="col">Member</th>
                {allMonths.map((month) => (
                  <th key={month} scope="col">
                    {formatMonth(month)}
                  </th>
                ))}
                <th scope="col">All-time total</th>
              </tr>
            </thead>
            <tbody>
              {sortedSquads.flatMap((squad) =>
                boysBySquad[squad].map((boy) => (
                  <tr key={boy.id}>
                    <th scope="row">
                      <NameWithRank
                        name={boy.name}
                        memberRank={boy.memberRank}
                      />
                    </th>
                    {allMonths.map((month) => (
                      <td key={month}>{getMarksForMonth(boy, month)}</td>
                    ))}
                    <td className="bb-report-value">
                      {calculateTotalMarks(boy)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
      {isReportModalOpen && (
        <Suspense fallback={<LoadingState label="Loading report tools…" />}>
          <SessionReportModal
            boys={boys}
            activeSection={activeSection}
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};
export default DashboardPage;
