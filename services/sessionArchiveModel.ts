import { Boy } from '../types';
import { mapBoyRow, MarkRow, MemberRow } from './dbModel';

export type ArchivedMemberRow = MemberRow & {
  session_id: string;
  source_member_id: string;
};

export type ArchivedMarkRow = Omit<MarkRow, 'member_id'> & {
  session_id: string;
  source_member_id: string;
};

export const mapArchivedBoys = (members: ArchivedMemberRow[], marks: ArchivedMarkRow[]): Boy[] => {
  const marksBySourceMember = new Map<string, MarkRow[]>();

  for (const row of marks) {
    const mapped: MarkRow = {
      id: row.id,
      member_id: row.source_member_id,
      section: row.section,
      date: row.date,
      score: row.score,
      uniform_score: row.uniform_score,
      behaviour_score: row.behaviour_score,
      present: row.present,
    };
    const existing = marksBySourceMember.get(row.source_member_id) || [];
    existing.push(mapped);
    marksBySourceMember.set(row.source_member_id, existing);
  }

  return members.map((member) =>
    mapBoyRow(
      {
        id: member.id,
        name: member.name,
        squad: member.squad,
        section: member.section,
        school_year: member.school_year,
        is_squad_leader: member.is_squad_leader,
      },
      marksBySourceMember.get(member.source_member_id) || [],
    ),
  );
};

export const getDefaultClosedSessionLabel = (now = new Date()): string => {
  const endYear = now.getFullYear();
  const startYear = endYear - 1;
  return `${startYear}/${String(endYear).slice(-2)}`;
};

export const NEW_SESSION_CONFIRMATION_PHRASE = 'START NEW SESSION';
