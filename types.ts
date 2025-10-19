export type Squad = 1 | 2 | 3;
export type SchoolYear = 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Mark {
  date: string; // YYYY-MM-DD
  score: number;
}

export interface Boy {
  id?: string;
  name: string;
  squad: Squad;
  year: SchoolYear;
  marks: Mark[];
  isSquadLeader?: boolean;
}

export type AuditLogActionType = 'CREATE_BOY' | 'UPDATE_BOY' | 'DELETE_BOY' | 'REVERT_ACTION';

export interface AuditLog {
  id?: string;
  timestamp: number; // Unix milliseconds
  userEmail: string;
  actionType: AuditLogActionType;
  description: string;
  revertData: any;
  reverted?: boolean;
}
