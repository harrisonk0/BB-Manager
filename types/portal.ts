import type { CalendarEvent } from '../supabase/functions/_shared/calendar';
export type CompanyEvent = CalendarEvent & {
  meeting_date: string | null;
  created_at: string;
};
export interface CalendarSettings {
  id: boolean;
  starts_on: string;
  ends_on: string;
  starts_at: string;
  ends_at: string;
  location: string;
  timezone: string;
}
export interface PortalAccount {
  member_id: string;
  user_id: string | null;
  username: string;
  activated_at: string | null;
  created_at: string;
}
export interface SetupLink {
  memberId: string;
  username: string;
  code: string;
  link: string;
}
export interface PortalSummary {
  name: string;
  squad: number;
  total: number;
  attended: number;
  recorded: number;
  companyRank: number;
  squadRank: number;
  marks: { date: string; score: number }[];
  squads: {
    number: number;
    label: string | null;
    total: number;
    attended: number;
    recorded: number;
  }[];
}
