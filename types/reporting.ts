import type { Boy, Mark, Section } from '../types';

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface MemberMeetingRecord {
  date: string;
  attended: boolean;
  score: number;
  uniformScore?: number;
  behaviourScore?: number;
}

export interface MemberSessionSummary {
  id: string;
  name: string;
  squad: Boy['squad'];
  year: Boy['year'];
  isSquadLeader: boolean;
  attendanceCount: number;
  absenceCount: number;
  attendanceRate: number;
  totalMarks: number;
  averageScoreWhenPresent: number;
  bestNightScore: number;
  bestNightDate?: string;
  lastAttendedDate?: string;
  uniformTotal?: number;
  behaviourTotal?: number;
  meetings: MemberMeetingRecord[];
}

export interface SquadSessionSummary {
  squad: string;
  memberCount: number;
  attendanceCount: number;
  absenceCount: number;
  attendanceRate: number;
  totalMarks: number;
  averageScoreWhenPresent: number;
  topMember?: Pick<MemberSessionSummary, 'id' | 'name' | 'totalMarks' | 'attendanceRate'>;
  members: MemberSessionSummary[];
}

export interface MeetingSummary {
  date: string;
  attendanceCount: number;
  absenceCount: number;
  attendanceRate: number;
  totalMarks: number;
  averageMarksWhenPresent: number;
}

export interface MonthlySummary {
  month: string;
  attendanceCount: number;
  absenceCount: number;
  attendanceRate: number;
  totalMarks: number;
}

export interface SessionHeadlineStats {
  memberCount: number;
  meetingCount: number;
  attendanceCount: number;
  absenceCount: number;
  attendanceRate: number;
  totalMarks: number;
  averageMarksWhenPresent: number;
}

export interface SessionReportData {
  section: Section;
  sectionLabel: string;
  generatedAt: string;
  range: ReportDateRange;
  meetingDates: string[];
  headlineStats: SessionHeadlineStats;
  topMembers: Pick<MemberSessionSummary, 'id' | 'name' | 'squad' | 'totalMarks' | 'attendanceRate' | 'averageScoreWhenPresent'>[];
  members: MemberSessionSummary[];
  squads: SquadSessionSummary[];
  meetings: MeetingSummary[];
  months: MonthlySummary[];
}

export interface BuildSessionReportInput {
  boys: Boy[];
  section: Section;
  range: ReportDateRange;
  now?: Date;
}

export type SessionMark = Mark;
