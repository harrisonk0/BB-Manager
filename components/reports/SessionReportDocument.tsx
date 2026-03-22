import React from 'react';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import type { MemberSessionSummary, SessionReportData, SquadSessionSummary } from '../../types/reporting';

const BB_LOGO_URL = 'https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png';
const BB_BACKGROUND_URL = 'https://i.postimg.cc/MKD36t18/mixed-activities.jpg';
const COMPANY_LOGO_URL = 'https://i.postimg.cc/0j44DjdY/company-boxed-colour.png';
const JUNIOR_LOGO_URL = 'https://i.postimg.cc/W1qvWLdp/juniors-boxed-colour.png';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: 10,
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
  },
  coverPage: {
    position: 'relative',
    padding: 0,
    backgroundColor: '#0f172a',
  },
  coverBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.74)',
  },
  coverContent: {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 42,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverTop: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    color: '#cbd5e1',
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
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: 380,
  },
  coverStatGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  coverStatCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1 solid rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    padding: 14,
  },
  coverStatLabel: {
    color: '#cbd5e1',
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
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottom: '1 solid #cbd5e1',
  },
  headerBrand: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
  },
  headerMeta: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
    textAlign: 'right',
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
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    border: '1 solid #e2e8f0',
    borderRadius: 10,
    padding: 12,
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
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  column: {
    flexGrow: 1,
    flexBasis: 0,
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1 solid #e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
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
        <View>
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
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '28%' }]}>Member</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '10%' }]}>Squad</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '10%' }]}>Year</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '10%' }]}>Attend</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '10%' }]}>Absent</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: '10%' }]}>Rate</Text>
      <Text style={[styles.tableCell, styles.tableHeadCell, { width: section === 'junior' ? '12%' : '22%' }]}>Total</Text>
      {section === 'junior' && (
        <Text style={[styles.tableCell, styles.tableHeadCell, { width: '10%' }]}>Uniform</Text>
      )}
      {section === 'junior' && (
        <Text style={[styles.tableCell, styles.tableHeadCell, { width: '10%' }]}>Behav.</Text>
      )}
    </View>
    {members.map((member, index) => (
      <View key={member.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]}>
        <Text style={[styles.tableCell, { width: '28%' }]}>{member.name}</Text>
        <Text style={[styles.tableCell, { width: '10%' }]}>{String(member.squad)}</Text>
        <Text style={[styles.tableCell, { width: '10%' }]}>{String(member.year)}</Text>
        <Text style={[styles.tableCell, { width: '10%' }]}>{member.attendanceCount}</Text>
        <Text style={[styles.tableCell, { width: '10%' }]}>{member.absenceCount}</Text>
        <Text style={[styles.tableCell, { width: '10%' }]}>{`${formatNumber(member.attendanceRate)}%`}</Text>
        <Text style={[styles.tableCell, { width: section === 'junior' ? '12%' : '22%' }]}>{formatNumber(member.totalMarks)}</Text>
        {section === 'junior' && (
          <Text style={[styles.tableCell, { width: '10%' }]}>{formatNumber(member.uniformTotal ?? 0)}</Text>
        )}
        {section === 'junior' && (
          <Text style={[styles.tableCell, { width: '10%' }]}>{formatNumber(member.behaviourTotal ?? 0)}</Text>
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

export interface SessionReportDocumentProps {
  report: SessionReportData;
}

const SessionReportDocument: React.FC<SessionReportDocumentProps> = ({ report }) => {
  const accent = getAccent(report.section);
  const topMeetingMark = Math.max(...report.meetings.map((meeting) => meeting.totalMarks), 0);
  const topMonthMark = Math.max(...report.months.map((month) => month.totalMarks), 0);

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
        <Image src={BB_BACKGROUND_URL} style={styles.coverBackground} />
        <View style={styles.coverOverlay} />
        <View style={styles.coverContent}>
          <View>
            <View style={styles.coverTop}>
              <Image src={BB_LOGO_URL} style={styles.coverMainLogo} />
              <Image src={accent.sectionLogo} style={styles.coverSectionLogo} />
            </View>
            <View style={{ marginTop: 54 }}>
              <Text style={styles.coverEyebrow}>BB Manager Master Session Report</Text>
              <Text style={styles.coverTitle}>{report.sectionLabel}</Text>
              <Text style={styles.coverSubtitle}>
                {`A complete session summary covering attendance, marks, squad performance, and member-level detail from ${formatDate(report.range.startDate)} to ${formatDate(report.range.endDate)}.`}
              </Text>
            </View>
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

        <View style={styles.statGrid}>
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

        <View style={styles.twoColumn}>
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

        <View style={styles.twoColumn}>
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

        <View style={styles.card}>
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

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableHeadCell, { width: '26%' }]}>Meeting</Text>
            <Text style={[styles.tableCell, styles.tableHeadCell, { width: '18%' }]}>Present</Text>
            <Text style={[styles.tableCell, styles.tableHeadCell, { width: '18%' }]}>Absent</Text>
            <Text style={[styles.tableCell, styles.tableHeadCell, { width: '18%' }]}>Attend Rate</Text>
            <Text style={[styles.tableCell, styles.tableHeadCell, { width: '20%' }]}>Marks</Text>
          </View>
          {report.meetings.map((meeting, index) => (
            <View key={meeting.date} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]}>
              <Text style={[styles.tableCell, { width: '26%' }]}>{formatDate(meeting.date)}</Text>
              <Text style={[styles.tableCell, { width: '18%' }]}>{meeting.attendanceCount}</Text>
              <Text style={[styles.tableCell, { width: '18%' }]}>{meeting.absenceCount}</Text>
              <Text style={[styles.tableCell, { width: '18%' }]}>{`${formatNumber(meeting.attendanceRate)}%`}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{formatNumber(meeting.totalMarks)}</Text>
            </View>
          ))}
        </View>
        {renderPageFooter(report)}
      </Page>

      <Page size="A4" style={styles.page}>
        {renderPageHeader(report, 'Squad Breakdown')}

        <Text style={styles.sectionCopy}>
          Squad-level comparison helps show which groups carried the session in marks, which groups were most reliable for attendance,
          and where section leadership might want to focus at the start of the next session.
        </Text>

        <View style={styles.twoColumn}>
          <View style={styles.column}>{report.squads.filter((_, index) => index % 2 === 0).map(renderSquadCard)}</View>
          <View style={styles.column}>{report.squads.filter((_, index) => index % 2 === 1).map(renderSquadCard)}</View>
        </View>

        {renderMemberTable(report.members, report.section)}
        {renderPageFooter(report)}
      </Page>

      {report.members.map((member) => (
        <Page key={member.id} size="A4" style={styles.page}>
          {renderPageHeader(report, `${member.name} Session Detail`)}

          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>Squad / Year</Text>
              <Text style={styles.statCardValue}>{`S${member.squad} / ${member.year}`}</Text>
              <Text style={styles.statCardHint}>{member.isSquadLeader ? 'Squad leader' : 'Member'}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>Attendance</Text>
              <Text style={styles.statCardValue}>{`${formatNumber(member.attendanceRate)}%`}</Text>
              <Text style={styles.statCardHint}>{`${member.attendanceCount} present, ${member.absenceCount} absent`}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>Total Marks</Text>
              <Text style={styles.statCardValue}>{formatNumber(member.totalMarks)}</Text>
              <Text style={styles.statCardHint}>{`Avg ${formatNumber(member.averageScoreWhenPresent)} when present`}</Text>
            </View>
          </View>

          <View style={styles.twoColumn}>
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
                <Text style={styles.cardTitle}>Night-By-Night Marks</Text>
                {renderHorizontalBars(
                  member.meetings.map((meeting) => ({
                    label: formatDate(meeting.date),
                    value: meeting.attended ? meeting.score : 0,
                    helper: meeting.attended ? formatNumber(meeting.score) : 'Absent',
                  })),
                  accent.primary,
                  Math.max(...member.meetings.map((meeting) => meeting.score), 10),
                )}
              </View>
            </View>
          </View>

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
            {member.meetings.map((meeting, index) => (
              <View key={meeting.date} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]}>
                <Text style={[styles.tableCell, { width: '22%' }]}>{formatDate(meeting.date)}</Text>
                <Text style={[styles.tableCell, { width: '14%' }]}>{meeting.attended ? 'Present' : 'Absent'}</Text>
                <Text style={[styles.tableCell, { width: report.section === 'junior' ? '14%' : '64%' }]}>
                  {meeting.attended ? formatNumber(meeting.score) : '0'}
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
      ))}
    </Document>
  );
};

export default SessionReportDocument;
