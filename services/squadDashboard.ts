import type { PortalSquadMember } from '../types/portal';

export interface SquadPeriodStats {
  total: number;
  attended: number;
  recorded: number;
  attendance: number | null;
  averageMarks: number | null;
}

const summarize = (scores: number[]): SquadPeriodStats => {
  const attended = scores.filter((score) => score >= 0).length;
  const total = scores.reduce((sum, score) => sum + Math.max(0, score), 0);
  return {
    total,
    attended,
    recorded: scores.length,
    attendance: scores.length
      ? Math.round((attended / scores.length) * 100)
      : null,
    averageMarks: attended ? Math.round((total / attended) * 10) / 10 : null,
  };
};

export const buildSquadDashboard = (members: PortalSquadMember[]) => {
  const totals = members.map((member) => ({
    ...member,
    ...summarize(member.marks.map((mark) => mark.score)),
  }));
  const dates = [
    ...new Set(
      members.flatMap((member) => member.marks.map((mark) => mark.date)),
    ),
  ];
  const weeks = dates
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      ...summarize(
        members.flatMap((member) => {
          const mark = member.marks.find((entry) => entry.date === date);
          return mark ? [mark.score] : [];
        }),
      ),
    }));
  return {
    overall: summarize(
      members.flatMap((member) => member.marks.map((mark) => mark.score)),
    ),
    members: totals
      .map((member) => ({
        ...member,
        rank: member.recorded
          ? 1 + totals.filter((other) => other.total > member.total).length
          : null,
      }))
      .sort(
        (a, b) =>
          b.total - a.total ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      ),
    weeks,
  };
};
