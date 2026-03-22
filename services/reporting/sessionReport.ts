import type { Boy, Mark, Section } from '../../types';
import type {
  BuildSessionReportInput,
  MeetingSummary,
  MemberMeetingRecord,
  MemberSessionSummary,
  MonthlySummary,
  ReportDateRange,
  SessionHeadlineStats,
  SessionReportData,
  SquadSessionSummary,
} from '../../types/reporting';

const SECTION_LABELS: Record<Section, string> = {
  company: 'Company Section',
  junior: 'Junior Section',
};

const round = (value: number) => Math.round(value * 100) / 100;

const isMarkWithinRange = (mark: Mark, range: ReportDateRange) =>
  mark.date >= range.startDate && mark.date <= range.endDate;

const sortByDateAsc = <T extends { date: string }>(items: T[]) =>
  [...items].sort((left, right) => left.date.localeCompare(right.date));

const sortMembersForReport = (members: MemberSessionSummary[]) =>
  [...members].sort((left, right) => {
    if (right.totalMarks !== left.totalMarks) {
      return right.totalMarks - left.totalMarks;
    }

    if (right.attendanceRate !== left.attendanceRate) {
      return right.attendanceRate - left.attendanceRate;
    }

    return left.name.localeCompare(right.name);
  });

const buildMemberMeetingRecords = (marks: Mark[]): MemberMeetingRecord[] =>
  sortByDateAsc(marks).map((mark) => ({
    date: mark.date,
    attended: mark.score >= 0,
    score: mark.score >= 0 ? mark.score : 0,
    uniformScore: mark.score >= 0 ? mark.uniformScore : undefined,
    behaviourScore: mark.score >= 0 ? mark.behaviourScore : undefined,
  }));

const buildMemberSummary = (boy: Boy, section: Section, range: ReportDateRange): MemberSessionSummary => {
  const sessionMarks = sortByDateAsc(boy.marks.filter((mark) => isMarkWithinRange(mark, range)));
  const meetings = buildMemberMeetingRecords(sessionMarks);
  const presentMarks = sessionMarks.filter((mark) => mark.score >= 0);
  const absentMarks = sessionMarks.filter((mark) => mark.score < 0);
  const totalMarks = round(presentMarks.reduce((sum, mark) => sum + mark.score, 0));
  const attendanceCount = presentMarks.length;
  const absenceCount = absentMarks.length;
  const attendanceRate = sessionMarks.length > 0 ? round((attendanceCount / sessionMarks.length) * 100) : 0;
  const averageScoreWhenPresent = attendanceCount > 0 ? round(totalMarks / attendanceCount) : 0;
  const bestNight = [...presentMarks].sort((left, right) => right.score - left.score || left.date.localeCompare(right.date))[0];
  const uniformTotal = section === 'junior'
    ? round(presentMarks.reduce((sum, mark) => sum + (mark.uniformScore ?? 0), 0))
    : undefined;
  const behaviourTotal = section === 'junior'
    ? round(presentMarks.reduce((sum, mark) => sum + (mark.behaviourScore ?? 0), 0))
    : undefined;

  return {
    id: boy.id ?? boy.name,
    name: boy.name,
    squad: boy.squad,
    year: boy.year,
    isSquadLeader: boy.isSquadLeader ?? false,
    attendanceCount,
    absenceCount,
    attendanceRate,
    totalMarks,
    averageScoreWhenPresent,
    bestNightScore: bestNight?.score ?? 0,
    bestNightDate: bestNight?.date,
    lastAttendedDate: presentMarks.at(-1)?.date,
    uniformTotal,
    behaviourTotal,
    meetings,
  };
};

const buildHeadlineStats = (members: MemberSessionSummary[], meetingDates: string[]): SessionHeadlineStats => {
  const attendanceCount = members.reduce((sum, member) => sum + member.attendanceCount, 0);
  const absenceCount = members.reduce((sum, member) => sum + member.absenceCount, 0);
  const totalMarks = round(members.reduce((sum, member) => sum + member.totalMarks, 0));
  const totalRecords = attendanceCount + absenceCount;

  return {
    memberCount: members.length,
    meetingCount: meetingDates.length,
    attendanceCount,
    absenceCount,
    attendanceRate: totalRecords > 0 ? round((attendanceCount / totalRecords) * 100) : 0,
    totalMarks,
    averageMarksWhenPresent: attendanceCount > 0 ? round(totalMarks / attendanceCount) : 0,
  };
};

const buildMeetingSummaries = (members: MemberSessionSummary[], meetingDates: string[]): MeetingSummary[] =>
  meetingDates.map((date) => {
    const records = members
      .map((member) => member.meetings.find((meeting) => meeting.date === date))
      .filter((meeting): meeting is MemberMeetingRecord => !!meeting);
    const attendanceCount = records.filter((record) => record.attended).length;
    const absenceCount = records.length - attendanceCount;
    const totalMarks = round(records.reduce((sum, record) => sum + (record.attended ? record.score : 0), 0));

    return {
      date,
      attendanceCount,
      absenceCount,
      attendanceRate: records.length > 0 ? round((attendanceCount / records.length) * 100) : 0,
      totalMarks,
      averageMarksWhenPresent: attendanceCount > 0 ? round(totalMarks / attendanceCount) : 0,
    };
  });

const buildMonthlySummaries = (meetings: MeetingSummary[]): MonthlySummary[] => {
  const months = new Map<string, MonthlySummary>();

  meetings.forEach((meeting) => {
    const month = meeting.date.slice(0, 7);
    const current = months.get(month) ?? {
      month,
      attendanceCount: 0,
      absenceCount: 0,
      attendanceRate: 0,
      totalMarks: 0,
    };

    current.attendanceCount += meeting.attendanceCount;
    current.absenceCount += meeting.absenceCount;
    current.totalMarks = round(current.totalMarks + meeting.totalMarks);
    months.set(month, current);
  });

  return [...months.values()]
    .map((month) => {
      const totalRecords = month.attendanceCount + month.absenceCount;
      return {
        ...month,
        attendanceRate: totalRecords > 0 ? round((month.attendanceCount / totalRecords) * 100) : 0,
      };
    })
    .sort((left, right) => left.month.localeCompare(right.month));
};

const buildSquadSummaries = (members: MemberSessionSummary[]): SquadSessionSummary[] => {
  const grouped = new Map<string, MemberSessionSummary[]>();

  members.forEach((member) => {
    const key = String(member.squad);
    const current = grouped.get(key) ?? [];
    current.push(member);
    grouped.set(key, current);
  });

  return [...grouped.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([squad, squadMembers]) => {
      const attendanceCount = squadMembers.reduce((sum, member) => sum + member.attendanceCount, 0);
      const absenceCount = squadMembers.reduce((sum, member) => sum + member.absenceCount, 0);
      const totalMarks = round(squadMembers.reduce((sum, member) => sum + member.totalMarks, 0));
      const topMember = sortMembersForReport(squadMembers)[0];
      const totalRecords = attendanceCount + absenceCount;

      return {
        squad,
        memberCount: squadMembers.length,
        attendanceCount,
        absenceCount,
        attendanceRate: totalRecords > 0 ? round((attendanceCount / totalRecords) * 100) : 0,
        totalMarks,
        averageScoreWhenPresent: attendanceCount > 0 ? round(totalMarks / attendanceCount) : 0,
        topMember: topMember
          ? {
              id: topMember.id,
              name: topMember.name,
              totalMarks: topMember.totalMarks,
              attendanceRate: topMember.attendanceRate,
            }
          : undefined,
        members: sortMembersForReport(squadMembers),
      };
    });
};

export const getSectionDateRange = (boys: Boy[]): ReportDateRange | null => {
  const dates = boys.flatMap((boy) => boy.marks.map((mark) => mark.date)).sort();

  if (dates.length === 0) {
    return null;
  }

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
  };
};

export const buildSessionReportData = ({
  boys,
  section,
  range,
  now = new Date(),
}: BuildSessionReportInput): SessionReportData => {
  const members = sortMembersForReport(boys.map((boy) => buildMemberSummary(boy, section, range)));
  const meetingDates = Array.from(
    new Set(
      members.flatMap((member) => member.meetings.map((meeting) => meeting.date)),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const meetings = buildMeetingSummaries(members, meetingDates);
  const months = buildMonthlySummaries(meetings);
  const squads = buildSquadSummaries(members);

  return {
    section,
    sectionLabel: SECTION_LABELS[section],
    generatedAt: now.toISOString(),
    range,
    meetingDates,
    headlineStats: buildHeadlineStats(members, meetingDates),
    topMembers: members.slice(0, 5).map((member) => ({
      id: member.id,
      name: member.name,
      squad: member.squad,
      totalMarks: member.totalMarks,
      attendanceRate: member.attendanceRate,
      averageScoreWhenPresent: member.averageScoreWhenPresent,
    })),
    members,
    squads,
    meetings,
    months,
  };
};
