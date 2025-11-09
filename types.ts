export type Section = 'company' | 'junior';

export type Squad = 1 | 2 | 3;
export type SchoolYear = 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type JuniorSquad = 1 | 2 | 3 | 4;
export type JuniorYear = 'P4' | 'P5' | 'P6' | 'P7';

export interface Mark {
  date: string; // YYYY-MM-DD
  score: number;
  uniformScore?: number;
  behaviourScore?: number;
}

export interface Boy {
  id?: string;
  name: string;
  squad: Squad | JuniorSquad;
  year: SchoolYear | JuniorYear;
  marks: Mark[];
  isSquadLeader?: boolean;
}

export type AuditLogActionType = 'CREATE_BOY' | 'UPDATE_BOY' | 'DELETE_BOY' | 'REVERT_ACTION' | 'UPDATE_SETTINGS';

export interface AuditLog {
  id?: string;
  timestamp: number; // Unix milliseconds
  userEmail: string;
  actionType: AuditLogActionType;
  description: string;
  revertData: any;
  reverted?: boolean;
}

export type Page = 'home' | 'weeklyMarks' | 'dashboard' | 'auditLog' | 'settings';

export interface BoyMarksPageView {
  page: 'boyMarks';
  boyId: string;
}

export type View = { page: Page } | BoyMarksPageView;

export interface SectionSettings {
  meetingDay: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}