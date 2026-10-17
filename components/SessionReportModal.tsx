import React, { useMemo, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";

import Modal from "./Modal";
import { NativeButton, NativeInput, InlineNotice, EmptyState } from "./ui";
import "./reporting/reporting.css";
import SessionReportDocument from "./reports/SessionReportDocument";
import {
  MEMBER_DETAIL_CONTINUED_ROWS,
  MEMBER_DETAIL_FIRST_PAGE_ROWS,
} from "./reports/reportConstants";
import {
  buildSessionReportData,
  getDefaultSessionReportRange,
  getSectionDateRange,
} from "../services/reporting/sessionReport";
import type { Boy, Section } from "../types";

interface SessionReportModalProps {
  boys: Boy[];
  activeSection: Section;
  isOpen: boolean;
  onClose: () => void;
  /** Optional closed-session label used in copy and the download filename. */
  sessionLabel?: string;
}

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const SessionReportModal: React.FC<SessionReportModalProps> = ({
  boys,
  activeSection,
  isOpen,
  onClose,
  sessionLabel,
}) => {
  const sectionRange = useMemo(() => getSectionDateRange(boys), [boys]);
  const defaultRange = useMemo(
    () => getDefaultSessionReportRange(boys),
    [boys],
  );
  const [startDate, setStartDate] = useState(defaultRange?.startDate ?? "");
  const [endDate, setEndDate] = useState(defaultRange?.endDate ?? "");
  React.useEffect(() => {
    setStartDate(defaultRange?.startDate ?? "");
    setEndDate(defaultRange?.endDate ?? "");
  }, [defaultRange, isOpen]);

  const hasValidRange = Boolean(startDate && endDate && startDate <= endDate);
  const report = useMemo(() => {
    if (!hasValidRange) {
      return null;
    }

    return buildSessionReportData({
      boys,
      section: activeSection,
      range: { startDate, endDate },
    });
  }, [activeSection, boys, endDate, hasValidRange, startDate]);

  const hasDataForRange = Boolean(
    report && report.headlineStats.meetingCount > 0,
  );
  const sectionLabel =
    activeSection === "company" ? "Company Section" : "Junior Section";
  const filenamePrefix = sessionLabel
    ? `${
        sessionLabel
          .replace(/[^A-Za-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase() || "archived-session"
      }-`
    : "";
  const filename = `${filenamePrefix}${activeSection}-session-report-${startDate || "start"}-to-${endDate || "end"}.pdf`;
  const estimatedPageCount = report
    ? 1 +
      1 +
      1 +
      Math.max(1, Math.ceil(report.meetings.length / 18)) +
      1 +
      (report.members.length === 0
        ? 0
        : Math.max(
            1,
            Math.ceil(
              report.members.length / (activeSection === "junior" ? 14 : 16),
            ),
          )) +
      report.members.reduce(
        (sum, member) =>
          sum +
          1 +
          Math.ceil(
            Math.max(
              member.meetings.length - MEMBER_DETAIL_FIRST_PAGE_ROWS,
              0,
            ) / MEMBER_DETAIL_CONTINUED_ROWS,
          ),
        0,
      )
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Master Session PDF"
      size="lg"
    >
      {!sectionRange ? (
        <EmptyState title="Nothing to export yet">
          Record marks for this section to generate a report.
        </EmptyState>
      ) : (
        <div className="bb-reports">
          <p className="bb-report-intro">
            One branded report with session totals, attendance and marks trends,
            squads and individual member details.
            {sessionLabel ? ` Using archived ${sessionLabel} data.` : ""}
          </p>
          <div className="bb-form-surface bb-report-grid-fields">
            <NativeInput
              label="Session start"
              type="date"
              value={startDate}
              min={sectionRange.startDate}
              max={sectionRange.endDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <NativeInput
              label="Session end"
              type="date"
              value={endDate}
              min={sectionRange.startDate}
              max={sectionRange.endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          {hasValidRange ? (
            hasDataForRange && report ? (
              <>
                <dl className="bb-report-metrics">
                  <div className="bb-report-metric">
                    <dt>Meetings</dt>
                    <dd>{report.headlineStats.meetingCount}</dd>
                  </div>
                  <div className="bb-report-metric">
                    <dt>Attendance</dt>
                    <dd>{report.headlineStats.attendanceRate}%</dd>
                  </div>
                  <div className="bb-report-metric">
                    <dt>Est. pages</dt>
                    <dd>{estimatedPageCount}</dd>
                  </div>
                </dl>
                <p className="bb-report-intro">
                  {sectionLabel} · {formatDate(startDate)}–{formatDate(endDate)}
                  . Includes {report.members.length} member detail pages plus
                  session summary pages.
                </p>
                {estimatedPageCount > 15 && (
                  <InlineNotice>
                    This report is estimated at {estimatedPageCount} pages.
                    Narrow the range for a shorter report.
                  </InlineNotice>
                )}
              </>
            ) : (
              <InlineNotice>
                No recorded marks fall inside this range. Include at least one
                saved meeting.
              </InlineNotice>
            )
          ) : (
            <InlineNotice kind="error">
              Choose valid dates with the start on or before the end.
            </InlineNotice>
          )}
          <div className="bb-report-actions">
            <NativeButton variant="secondary" onClick={onClose}>
              Close
            </NativeButton>
            {hasDataForRange && report ? (
              <PDFDownloadLink
                document={<SessionReportDocument report={report} />}
                fileName={filename}
                className="bb-report-download external"
              >
                {({ loading, error }) =>
                  error
                    ? "PDF failed — try another range"
                    : loading
                      ? "Preparing PDF…"
                      : "Download Master PDF"
                }
              </PDFDownloadLink>
            ) : (
              <p className="bb-secondary">Choose a valid range to download.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
export default SessionReportModal;
