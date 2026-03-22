import React from 'react';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import type { MemberMeetingRecord, MemberSessionSummary, SessionReportData, SquadSessionSummary } from '../../types/reporting';
import bbLogo from '../../assets/branding/bb-logo.png';
import bbBackground from '../../assets/branding/bb-background.jpg';
import companyLogo from '../../assets/branding/company-logo.png';
import juniorLogo from '../../assets/branding/junior-logo.png';

const BB_LOGO_URL = bbLogo;
const BB_BACKGROUND_URL = bbBackground;
const COMPANY_LOGO_URL = companyLogo;
const JUNIOR_LOGO_URL = juniorLogo;

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: 10,
    paddingTop: 84,
    paddingBottom: 36,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
  },
  coverPage: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 42,
    backgroundColor: '#10182e',
    color: '#ffffff',
    fontFamily: 'Helvetica',
  },
  coverContent: {
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 34,
  },
  coverBrandColumn: {
    width: '58%',
  },
  coverPhotoCard: {
    width: '34%',
    backgroundColor: '#18233f',
    borderRadius: 18,
    overflow: 'hidden',
    border: '1 solid #314469',
  },
  coverPhoto: {
    width: '100%',
    height: 228,
    objectFit: 'cover',
  },
  coverMainLogo: {
    width: 120,
    height: 120,
    objectFit: 'contain',
  },
  coverSectionLogo: {
    width: 100,
    height: 100,
    objectFit: 'contain',
  },
  coverEyebrow: {
    color: '#9fb4ff',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  coverTitle: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 1.2,
    fontWeight: 700,
    marginBottom: 10,
  },
  coverSubtitle: {
    color: '#dbe7ff',
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: 380,
  },
  coverStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
    marginBottom: 28,
  },
  coverStatCard: {
    width: '48%',
    backgroundColor: '#162441',
    border: '1 solid #395485',
    borderRadius: 12,
    padding: 14,
    marginRight: '2%',
    marginBottom: 12,
  },
  coverStatLabel: {
    color: '#9fb4ff',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  coverStatValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
  },
  coverFooter: {
    color: '#c8d7f6',
    fontSize: 10,
    lineHeight: 1.5,
  },
  coverDivider: {
    width: 68,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#9fb4ff',
    marginTop: 22,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottom: '1 solid #cbd5e1',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '66%',
  },
  headerTextBlock: {
    marginLeft: 12,
    paddingRight: 10,
  },
  headerLogo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  sectionLogo: {
    width: 44,
    height: 44,
    objectFit: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    lineHeight: 1.25,
    fontWeight: 700,
    color: '#0f172a',
  },
  headerMeta: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
    textAlign: 'right',
    width: '30%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
    color: '#0f172a',
  },
  sectionCopy: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.5,
    marginBottom: 16,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  statCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    border: '1 solid #e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginRight: '2.33%',
  },
  statCardLabel: {
    color: '#64748b',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statCardValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: 700,
  },
  statCardHint: {
    color: '#475569',
    fontSize: 9,
    marginTop: 4,
  },
  twoColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  column: {
    flexGrow: 1,
    flexBasis: 0,
    width: '48.5%',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1 solid #e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  memberTableSection: {
    marginTop: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 10,
  },
  keyRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1 solid #f1f5f9',
    paddingVertical: 5,
  },
  keyLabel: {
    fontSize: 9,
    color: '#475569',
  },
  keyValue: {
    fontSize: 9,
    color: '#0f172a',
    fontWeight: 700,
  },
  rankRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottom: '1 solid #f1f5f9',
  },
  rankLabel: {
    fontSize: 10,
    color: '#0f172a',
    fontWeight: 700,
  },
  rankMeta: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  rankValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: 700,
  },
  chartBlock: {
    marginBottom: 14,
  },
  chartLabelRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 9,
    color: '#334155',
  },
  chartValue: {
    fontSize: 9,
    color: '#0f172a',
    fontWeight: 700,
  },
  chartTrack: {
    width: '100%',
    height: 11,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  chartFill: {
    height: 11,
    borderRadius: 999,
  },
  table: {
    width: '100%',
    border: '1 solid #e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHead: {
    backgroundColor: '#e2e8f0',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 8.5,
    color: '#0f172a',
  },
  tableHeadCell: {
    fontSize: 8,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#64748b',
  },
  note: {
    marginTop: 8,
    fontSize: 8.5,
    color: '#64748b',
    lineHeight: 1.45,
  },
  memberMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberMetricsCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    border: '1 solid #e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
});

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatMonth = (value: string) =>
  new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

const formatGeneratedAt = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatNumber = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(2);

const getAccent = (section: SessionReportData['section']) =>
  section === 'company'
    ? { primary: '#222943', secondary: '#9fb4ff', soft: '#dbe4ff', sectionLogo: COMPANY_LOGO_URL }
    : { primary: '#284e8b', secondary: '#8ec6ff', soft: '#d8e9ff', sectionLogo: JUNIOR_LOGO_URL };

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const renderHorizontalBars = (
  items: { label: string; value: number; helper?: string }[],
  accentColor: string,
  maxValue: number,
) => (
  <View>
    {items.map((item) => {
      const width = maxValue > 0 ? `${Math.max((item.value / maxValue) * 100, 4)}%` : '0%';
      return (
        <View key={item.label} style={styles.chartBlock}>
          <View style={styles.chartLabelRow}>
            <Text style={styles.chartLabel}>{item.label}</Text>
            <Text style={styles.chartValue}>{item.helper ?? formatNumber(item.value)}</Text>
          </View>
          <View style={styles.chartTrack}>
            <View style={[styles.chartFill, { width, backgroundColor: accentColor }]} />
          </View>
        </View>
      );
    })}
  </View>
);

const renderPageHeader = (report: SessionReportData, title: string) => {
  const accent = getAccent(report.section);

  return (
      <View style={styles.header} fixed>
      <View style={styles.headerBrand}>
        <Image src={BB_LOGO_URL} style={styles.headerLogo} />
        <Image src={accent.sectionLogo} style={styles.sectionLogo} />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.keyLabel}>{report.sectionLabel}</Text>
        </View>
      </View>
      <Text style={styles.headerMeta}>
        {`Session: ${formatDate(report.range.startDate)} to ${formatDate(report.range.endDate)}\nGenerated: ${formatGeneratedAt(report.generatedAt)}`}
      </Text>
    </View>
  );
};

const renderPageFooter = (report: SessionReportData) => (
  <View style={styles.footer} fixed>
    <Text>{`BB Manager session report • ${report.sectionLabel}`}</Text>
    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </View>
);

const renderMemberTable = (members: MemberSessionSummary[], section: SessionReportData['section']) => (
  <View style={styles.table}>
    <View style={[styles.tableRow, styles.tableHead]}>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: section === 'junior' ? '24%' : '28%' }]}>Member</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: section === 'junior' ? '8%' : '10%' }]}>Squad</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: section === 'junior' ? '8%' : '10%' }]}>Year</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: section === 'junior' ? '8%' : '10%' }]}>Attend</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: section === 'junior' ? '8%' : '10%' }]}>Absent</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: section === 'junior' ? '8%' : '10%' }]}>Rate</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: section === 'junior' ? '12%' : '22%' }]}>Total</Text>
      {section === 'junior' && (
        <Text style={[styles.tableCell, styles.tableHeadCell, { width: '12%' }]}>Uniform</Text>
      )}
      {section === 'junior' && (
        <Text style={[styles.tableCell, styles.tableHeadCell, { width: '12%' }]}>Behav.</Text>
      )}
    </View>
    {members.map((member, index) => (
      <View key={member.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]}>
        <Text style={[styles.tableCell, { width: section === 'junior' ? '24%' : '28%' }]}>{member.name}</Text>
        <Text style={[styles.tableCell, { width: section === 'junior' ? '8%' : '10%' }]}>{String(member.squad)}</Text>
        <Text style={[styles.tableCell, { width: section === 'junior' ? '8%' : '10%' }]}>{String(member.year)}</Text>
        <Text style={[styles.tableCell, { width: section === 'junior' ? '8%' : '10%' }]}>{member.attendanceCount}</Text>
        <Text style={[styles.tableCell, { width: section === 'junior' ? '8%' : '10%' }]}>{member.absenceCount}</Text>
        <Text style={[styles.tableCell, { width: section === 'junior' ? '8%' : '10%' }]}>{`${formatNumber(member.attendanceRate)}%`}</Text>
        <Text style={[styles.tableCell, { width: section === 'junior' ? '12%' : '22%' }]}>{formatNumber(member.totalMarks)}</Text>
        {section === 'junior' && (
          <Text style={[styles.tableCell, { width: '12%' }]}>{formatNumber(member.uniformTotal ?? 0)}</Text>
        )}
        {section === 'junior' && (
          <Text style={[styles.tableCell, { width: '12%' }]}>{formatNumber(member.behaviourTotal ?? 0)}</Text>
        )}
      </View>
    ))}
  </View>
);

const renderSquadCard = (squad: SquadSessionSummary) => (
  <View key={squad.squad} style={styles.card}>
    <Text style={styles.cardTitle}>{`Squad ${squad.squad}`}</Text>
    <View style={styles.keyRow}>
      <Text style={styles.keyLabel}>Members</Text>
      <Text style={styles.keyValue}>{squad.memberCount}</Text>
    </View>
    <View style={styles.keyRow}>
      <Text style={styles.keyLabel}>Attendance</Text>
      <Text style={styles.keyValue}>{`${formatNumber(squad.attendanceRate)}%`}</Text>
    </View>
    <View style={styles.keyRow}>
      <Text style={styles.keyLabel}>Total marks</Text>
      <Text style={styles.keyValue}>{formatNumber(squad.totalMarks)}</Text>
    </View>
    <View style={styles.keyRow}>
      <Text style={styles.keyLabel}>Average mark when present</Text>
      <Text style={styles.keyValue}>{formatNumber(squad.averageScoreWhenPresent)}</Text>
    </View>
    <View style={[styles.keyRow, { borderBottom: 0 }]}>
      <Text style={styles.keyLabel}>Leading member</Text>
      <Text style={styles.keyValue}>
        {squad.topMember ? `${squad.topMember.name} (${formatNumber(squad.topMember.totalMarks)})` : 'N/A'}
      </Text>
    </View>
  </View>
);

const renderMeetingLedgerTable = (meetings: SessionReportData['meetings']) => (
  <View style={styles.table}>
    <View style={[styles.tableRow, styles.tableHead]}>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '26%' }]}>Meeting</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '18%' }]}>Present</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '18%' }]}>Absent</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '18%' }]}>Attend Rate</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '20%' }]}>Marks</Text>
    </View>
    {meetings.map((meeting, index) => (
      <View key={meeting.date} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]}>
        <Text style={[styles.tableCell, { width: '26%' }]}>{formatDate(meeting.date)}</Text>
        <Text style={[styles.tableCell, { width: '18%' }]}>{meeting.attendanceCount}</Text>
        <Text style={[styles.tableCell, { width: '18%' }]}>{meeting.absenceCount}</Text>
        <Text style={[styles.tableCell, { width: '18%' }]}>{`${formatNumber(meeting.attendanceRate)}%`}</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>{formatNumber(meeting.totalMarks)}</Text>
      </View>
    ))}
  </View>
);

export interface SessionReportDocumentProps {
  report: SessionReportData;
}

const SessionReportDocument: React.FC<SessionReportDocumentProps> = ({ report }) => {
  const accent = getAccent(report.section);
  const topMeetingMark = Math.max(...report.meetings.map((meeting) => meeting.totalMarks), 0);
  const topMonthMark = Math.max(...report.months.map((month) => month.totalMarks), 0);
  const meetingChunks: SessionReportData['meetings'][] = chunk<SessionReportData['meetings'][number]>(report.meetings, 18);
  const squadMemberChunks: MemberSessionSummary[][] = chunk<MemberSessionSummary>(
    report.members,
    report.section === 'junior' ? 14 : 16,
  );

  return (
    <Document
      title={`${report.sectionLabel} Session Report`}
      author="BB Manager"
      subject={`${report.sectionLabel} end of session report`}
      creator="BB Manager"
      producer="BB Manager"
      keywords={['BB Manager', 'Boys Brigade', report.sectionLabel, 'session report']}
      language="en-GB"
    >
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContent}>
          <View>
            <View style={styles.coverTop}>
              <View style={styles.coverBrandColumn}>
                <Image src={BB_LOGO_URL} style={styles.coverMainLogo} />
                <View style={{ marginTop: 36 }}>
                  <Text style={styles.coverEyebrow}>BB Manager Master Session Report</Text>
                  <Text style={styles.coverTitle}>{report.sectionLabel}</Text>
                  <Text style={styles.coverSubtitle}>
                    {`A complete session summary covering attendance, marks, squad performance, and member-level detail from ${formatDate(report.range.startDate)} to ${formatDate(report.range.endDate)}.`}
                  </Text>
                  <View style={styles.coverDivider} />
                  <Image src={accent.sectionLogo} style={styles.coverSectionLogo} />
                </View>
              </View>
              <View style={styles.coverPhotoCard}>
                <Image src={BB_BACKGROUND_URL} style={styles.coverPhoto} />
              </View>
            </View>
            <View>
              <View style={styles.coverStatGrid}>
                <View style={styles.coverStatCard}>
                  <Text style={styles.coverStatLabel}>Members</Text>
                  <Text style={styles.coverStatValue}>{report.headlineStats.memberCount}</Text>
                </View>
                <View style={styles.coverStatCard}>
                  <Text style={styles.coverStatLabel}>Meetings</Text>
                  <Text style={styles.coverStatValue}>{report.headlineStats.meetingCount}</Text>
                </View>
                <View style={styles.coverStatCard}>
                  <Text style={styles.coverStatLabel}>Attendance</Text>
                  <Text style={styles.coverStatValue}>{`${formatNumber(report.headlineStats.attendanceRate)}%`}</Text>
                </View>
                <View style={styles.coverStatCard}>
                  <Text style={styles.coverStatLabel}>Total Marks</Text>
                  <Text style={styles.coverStatValue}>{formatNumber(report.headlineStats.totalMarks)}</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.coverFooter}>
            {`Generated ${formatGeneratedAt(report.generatedAt)}\nThis master PDF is based on the recorded marks and attendance already stored in BB Manager for the selected section and date range.`}
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        {renderPageHeader(report, 'Executive Summary')}
        <Text style={styles.sectionTitle}>Session Snapshot</Text>
        <Text style={styles.sectionCopy}>
          This page condenses the full session into the numbers most useful to officers at the end of a BB session:
          membership size, how consistently members attended, how many marks were awarded, and which members led the section overall.
        </Text>

        <View style={styles.statGrid} wrap={false}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Total attendance records</Text>
            <Text style={styles.statCardValue}>{report.headlineStats.attendanceCount}</Text>
            <Text style={styles.statCardHint}>{`${report.headlineStats.absenceCount} absences recorded`}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Average mark when present</Text>
            <Text style={styles.statCardValue}>{formatNumber(report.headlineStats.averageMarksWhenPresent)}</Text>
            <Text style={styles.statCardHint}>Across all attended meetings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Reporting range</Text>
            <Text style={[styles.statCardValue, { fontSize: 13 }]}>
              {`${formatDate(report.range.startDate)}\n${formatDate(report.range.endDate)}`}
            </Text>
          </View>
        </View>

        <View style={styles.twoColumn} wrap={false}>
          <View style={styles.column}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Members</Text>
              {report.topMembers.map((member, index) => (
                <View key={member.id} style={styles.rankRow}>
                  <View>
                    <Text style={styles.rankLabel}>{`${index + 1}. ${member.name}`}</Text>
                    <Text style={styles.rankMeta}>{`Squad ${member.squad} • Attendance ${formatNumber(member.attendanceRate)}% • Avg ${formatNumber(member.averageScoreWhenPresent)}`}</Text>
                  </View>
                  <Text style={styles.rankValue}>{formatNumber(member.totalMarks)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.column}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Squad Snapshot</Text>
              {report.squads.map((squad) => (
                <View key={squad.squad} style={styles.keyRow}>
                  <Text style={styles.keyLabel}>{`Squad ${squad.squad}`}</Text>
                  <Text style={styles.keyValue}>
                    {`${formatNumber(squad.totalMarks)} marks • ${formatNumber(squad.attendanceRate)}%`}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reporting Notes</Text>
              <Text style={styles.note}>
                Attendance percentages are calculated from recorded marks in the selected range. Present nights use the saved score;
                absence rows are counted when a member was explicitly marked absent.
              </Text>
            </View>
          </View>
        </View>
        {renderPageFooter(report)}
      </Page>

      <Page size="A4" style={styles.page}>
        {renderPageHeader(report, 'Attendance And Marks Trends')}

        <View style={styles.twoColumn} wrap={false}>
          <View style={styles.column}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Meeting Attendance Rate</Text>
              {renderHorizontalBars(
                report.meetings.map((meeting) => ({
                  label: formatDate(meeting.date),
                  value: meeting.attendanceRate,
                  helper: `${formatNumber(meeting.attendanceRate)}%`,
                })),
                accent.primary,
                100,
              )}
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Meeting Marks Awarded</Text>
              {renderHorizontalBars(
                report.meetings.map((meeting) => ({
                  label: formatDate(meeting.date),
                  value: meeting.totalMarks,
                  helper: formatNumber(meeting.totalMarks),
                })),
                accent.secondary,
                topMeetingMark,
              )}
            </View>
          </View>
        </View>

        <View style={styles.card} wrap={false}>
          <Text style={styles.cardTitle}>Monthly Session Pattern</Text>
          {renderHorizontalBars(
            report.months.map((month) => ({
              label: formatMonth(month.month),
              value: month.totalMarks,
              helper: `${formatNumber(month.totalMarks)} marks • ${formatNumber(month.attendanceRate)}%`,
            })),
            accent.primary,
            topMonthMark,
          )}
        </View>

        {renderPageFooter(report)}
      </Page>

      {meetingChunks.map((meetingChunk, index) => (
        <Page key={`meeting-ledger-${index}`} size="A4" style={styles.page}>
          {renderPageHeader(report, index === 0 ? 'Meeting Ledger' : 'Meeting Ledger Continued')}
          <Text style={styles.sectionCopy}>
            Meeting-by-meeting attendance and marks for the selected session range.
          </Text>
          {renderMeetingLedgerTable(meetingChunk)}
          {renderPageFooter(report)}
        </Page>
      ))}

      <Page size="A4" style={styles.page}>
        {renderPageHeader(report, 'Squad Breakdown')}

        <Text style={styles.sectionCopy}>
          Squad-level comparison helps show which groups carried the session in marks, which groups were most reliable for attendance,
          and where section leadership might want to focus at the start of the next session.
        </Text>

        <View style={styles.twoColumn} wrap={false}>
          <View style={styles.column}>{report.squads.filter((_, index) => index % 2 === 0).map(renderSquadCard)}</View>
          <View style={styles.column}>{report.squads.filter((_, index) => index % 2 === 1).map(renderSquadCard)}</View>
        </View>

        {renderPageFooter(report)}
      </Page>

      {squadMemberChunks.map((memberChunk, index) => (
        <Page key={`squad-members-${index}`} size="A4" style={styles.page}>
          {renderPageHeader(report, index === 0 ? 'Section Member Ledger' : 'Section Member Ledger Continued')}
          <Text style={styles.sectionCopy}>
            Full member-level attendance and marks summary for the selected session range.
          </Text>
          {renderMemberTable(memberChunk, report.section)}
          {renderPageFooter(report)}
        </Page>
      ))}

      {report.members.map((member) => (
        <Page key={member.id} size="A4" style={styles.page}>
          {renderPageHeader(report, `${member.name} Session Detail`)}

          <View style={styles.memberMetricsRow} wrap={false}>
            <View style={styles.memberMetricsCard}>
              <Text style={styles.statCardLabel}>Squad / Year</Text>
              <Text style={styles.statCardValue}>{`S${member.squad} / ${member.year}`}</Text>
              <Text style={styles.statCardHint}>{member.isSquadLeader ? 'Squad leader' : 'Member'}</Text>
            </View>
            <View style={styles.memberMetricsCard}>
              <Text style={styles.statCardLabel}>Attendance</Text>
              <Text style={styles.statCardValue}>{`${formatNumber(member.attendanceRate)}%`}</Text>
              <Text style={styles.statCardHint}>{`${member.attendanceCount} present, ${member.absenceCount} absent`}</Text>
            </View>
            <View style={styles.memberMetricsCard}>
              <Text style={styles.statCardLabel}>Total Marks</Text>
              <Text style={styles.statCardValue}>{formatNumber(member.totalMarks)}</Text>
              <Text style={styles.statCardHint}>{`Avg ${formatNumber(member.averageScoreWhenPresent)} when present`}</Text>
            </View>
          </View>

          <View style={styles.twoColumn} wrap={false}>
            <View style={styles.column}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Member Summary</Text>
                <View style={styles.keyRow}>
                  <Text style={styles.keyLabel}>Best night</Text>
                  <Text style={styles.keyValue}>
                    {member.bestNightDate ? `${formatNumber(member.bestNightScore)} on ${formatDate(member.bestNightDate)}` : 'N/A'}
                  </Text>
                </View>
                <View style={styles.keyRow}>
                  <Text style={styles.keyLabel}>Last attended</Text>
                  <Text style={styles.keyValue}>{member.lastAttendedDate ? formatDate(member.lastAttendedDate) : 'N/A'}</Text>
                </View>
                {report.section === 'junior' && (
                  <View style={styles.keyRow}>
                    <Text style={styles.keyLabel}>Uniform total</Text>
                    <Text style={styles.keyValue}>{formatNumber(member.uniformTotal ?? 0)}</Text>
                  </View>
                )}
                {report.section === 'junior' && (
                  <View style={[styles.keyRow, { borderBottom: 0 }]}>
                    <Text style={styles.keyLabel}>Behaviour total</Text>
                    <Text style={styles.keyValue}>{formatNumber(member.behaviourTotal ?? 0)}</Text>
                  </View>
                )}
                {report.section === 'company' && (
                  <View style={[styles.keyRow, { borderBottom: 0 }]}>
                    <Text style={styles.keyLabel}>Recorded meetings</Text>
                    <Text style={styles.keyValue}>{member.meetings.length}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.column}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Session Performance</Text>
                <View style={styles.keyRow}>
                  <Text style={styles.keyLabel}>Attendance record</Text>
                  <Text style={styles.keyValue}>{`${member.attendanceCount} / ${member.meetings.length}`}</Text>
                </View>
                <View style={styles.keyRow}>
                  <Text style={styles.keyLabel}>Best score</Text>
                  <Text style={styles.keyValue}>{formatNumber(member.bestNightScore)}</Text>
                </View>
                <View style={styles.keyRow}>
                  <Text style={styles.keyLabel}>Attendance rate</Text>
                  <Text style={styles.keyValue}>{`${formatNumber(member.attendanceRate)}%`}</Text>
                </View>
                <View style={[styles.keyRow, { borderBottom: 0 }]}>
                  <Text style={styles.keyLabel}>Average when present</Text>
                  <Text style={styles.keyValue}>{formatNumber(member.averageScoreWhenPresent)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.memberTableSection}>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.tableCell, styles.tableHeadCell, { width: '22%' }]}>Date</Text>
                <Text style={[styles.tableCell, styles.tableHeadCell, { width: '14%' }]}>Status</Text>
                <Text style={[styles.tableCell, styles.tableHeadCell, { width: report.section === 'junior' ? '14%' : '64%' }]}>Score</Text>
                {report.section === 'junior' && (
                  <Text style={[styles.tableCell, styles.tableHeadCell, { width: '25%' }]}>Uniform</Text>
                )}
                {report.section === 'junior' && (
                  <Text style={[styles.tableCell, styles.tableHeadCell, { width: '25%' }]}>Behaviour</Text>
                )}
              </View>
              {member.meetings.slice(0, 14).map((meeting, index) => (
                <View key={meeting.date} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]}>
                  <Text style={[styles.tableCell, { width: '22%' }]}>{formatDate(meeting.date)}</Text>
                  <Text style={[styles.tableCell, { width: '14%' }]}>{meeting.attended ? 'Present' : 'Absent'}</Text>
                  <Text style={[styles.tableCell, { width: report.section === 'junior' ? '14%' : '64%' }]}>
                    {meeting.attended ? formatNumber(meeting.score) : '-'}
                  </Text>
                  {report.section === 'junior' && (
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {meeting.attended ? formatNumber(meeting.uniformScore ?? 0) : '-'}
                    </Text>
                  )}
                  {report.section === 'junior' && (
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {meeting.attended ? formatNumber(meeting.behaviourScore ?? 0) : '-'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
          {renderPageFooter(report)}
        </Page>
      ))}

      {report.members.flatMap((member) =>
        chunk<MemberMeetingRecord>(member.meetings.slice(14), 22).map((meetingChunk, index) => (
          <Page key={`${member.id}-continued-${index}`} size="A4" style={styles.page}>
            {renderPageHeader(report, `${member.name} Session Detail Continued`)}
            <Text style={styles.sectionCopy}>
              Continued meeting-by-meeting record for this member.
            </Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.tableCell, styles.tableHeadCell, { width: '22%' }]}>Date</Text>
                <Text style={[styles.tableCell, styles.tableHeadCell, { width: '14%' }]}>Status</Text>
                <Text style={[styles.tableCell, styles.tableHeadCell, { width: report.section === 'junior' ? '14%' : '64%' }]}>Score</Text>
                {report.section === 'junior' && (
                  <Text style={[styles.tableCell, styles.tableHeadCell, { width: '25%' }]}>Uniform</Text>
                )}
                {report.section === 'junior' && (
                  <Text style={[styles.tableCell, styles.tableHeadCell, { width: '25%' }]}>Behaviour</Text>
                )}
              </View>
              {meetingChunk.map((meeting, meetingIndex) => (
                <View key={meeting.date} style={[styles.tableRow, meetingIndex % 2 === 1 ? styles.tableRowAlt : null]}>
                  <Text style={[styles.tableCell, { width: '22%' }]}>{formatDate(meeting.date)}</Text>
                  <Text style={[styles.tableCell, { width: '14%' }]}>{meeting.attended ? 'Present' : 'Absent'}</Text>
                  <Text style={[styles.tableCell, { width: report.section === 'junior' ? '14%' : '64%' }]}>
                    {meeting.attended ? formatNumber(meeting.score) : '-'}
                  </Text>
                  {report.section === 'junior' && (
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {meeting.attended ? formatNumber(meeting.uniformScore ?? 0) : '-'}
                    </Text>
                  )}
                  {report.section === 'junior' && (
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {meeting.attended ? formatNumber(meeting.behaviourScore ?? 0) : '-'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
            {renderPageFooter(report)}
          </Page>
        )),
      )}
    </Document>
  );
};

export default SessionReportDocument;
