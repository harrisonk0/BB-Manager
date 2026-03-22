import React, { useMemo, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';

import Modal from './Modal';
import SessionReportDocument from './reports/SessionReportDocument';
import { buildSessionReportData, getSectionDateRange } from '../services/reporting/sessionReport';
import type { Boy, Section } from '../types';

interface SessionReportModalProps {
  boys: Boy[];
  activeSection: Section;
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const SessionReportModal: React.FC<SessionReportModalProps> = ({
  boys,
  activeSection,
  isOpen,
  onClose,
}) => {
  const sectionRange = useMemo(() => getSectionDateRange(boys), [boys]);
  const [startDate, setStartDate] = useState(sectionRange?.startDate ?? '');
  const [endDate, setEndDate] = useState(sectionRange?.endDate ?? '');

  React.useEffect(() => {
    setStartDate(sectionRange?.startDate ?? '');
    setEndDate(sectionRange?.endDate ?? '');
  }, [sectionRange, isOpen]);

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

  const hasDataForRange = Boolean(report && report.headlineStats.meetingCount > 0);
  const sectionLabel = activeSection === 'company' ? 'Company Section' : 'Junior Section';
  const filename = `${activeSection}-session-report-${startDate || 'start'}-to-${endDate || 'end'}.pdf`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Master Session PDF" size="lg">
      {!sectionRange ? (
        <div className="space-y-3">
          <p className="text-slate-700">
            There are no recorded marks in this section yet, so there is nothing to export.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-900">Single Master Report</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This export produces one branded end-of-session PDF for the active section using the current BB logo
              and photography already used in the app. The document includes the section summary, attendance and marks
              trends, squad breakdowns, and a page for every member in the selected date range.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Session Start</span>
              <input
                type="date"
                value={startDate}
                min={sectionRange.startDate}
                max={sectionRange.endDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-company-blue focus:outline-none focus:ring-2 focus:ring-company-blue"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Session End</span>
              <input
                type="date"
                value={endDate}
                min={sectionRange.startDate}
                max={sectionRange.endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-company-blue focus:outline-none focus:ring-2 focus:ring-company-blue"
              />
            </label>
          </div>

          {hasValidRange ? (
            hasDataForRange && report ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{sectionLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meetings</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{report.headlineStats.meetingCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{report.headlineStats.attendanceRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pages</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{4 + report.members.length}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  {`Report range: ${formatDate(startDate)} to ${formatDate(endDate)}. This will export ${report.members.length} member detail pages in addition to the summary pages.`}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                There are no recorded marks inside that range. Pick dates that include at least one saved meeting.
              </div>
            )
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Choose a valid date range where the start date is on or before the end date.
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Close
            </button>

            {hasDataForRange && report ? (
              <PDFDownloadLink
                document={<SessionReportDocument report={report} />}
                fileName={filename}
                className="inline-flex items-center rounded-md bg-company-blue px-4 py-2 text-sm font-medium text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-company-blue focus:ring-offset-2"
              >
                {({ loading }) => (loading ? 'Preparing PDF...' : 'Download Master PDF')}
              </PDFDownloadLink>
            ) : (
              <span className="text-sm text-slate-500">PDF download becomes available once the range is valid.</span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default SessionReportModal;
