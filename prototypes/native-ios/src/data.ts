export type Section = "company" | "junior";
export type Role = "staff" | "leader" | "boy";
export type Page = "members" | "marks" | "squad" | "more" | "calendar" | "mine";
export type Attendance = "unrecorded" | "present" | "absent";
export interface Entry {
  attendance: Attendance;
  score: string;
  uniform: string;
  behaviour: string;
}
export interface Member {
  id: string;
  name: string;
  year: number;
  squad: number;
  leader: boolean;
  attended: number;
  total: number;
  history: number[];
}
export const squads = [
  { id: 1, name: "Falcons" },
  { id: 2, name: "Rangers" },
  { id: 3, name: "Pioneers" },
];
const names = [
  "Alex Morgan",
  "Charlie Wilson",
  "Daniel Clarke",
  "Ethan Moore",
  "Finn Roberts",
  "Harry Bennett",
  "James Taylor",
  "Logan Harris",
  "Oliver Scott",
  "Oscar Evans",
  "Noah Williams",
  "Jacob Lee",
  "Leo Thompson",
  "Lucas Martin",
  "Max Anderson",
  "Morgan Alexander-Williams",
  "Samuel Lewis",
  "Theo Walker",
];
export const initialMembers: Member[] = names.map((name, index) => {
  const history = Array.from({ length: 8 }, (_, week) =>
    week === 7
      ? index >= 12
        ? -2
        : index === 3
          ? -1
          : 5 + (index % 6)
      : (index + week) % 9 === 0
        ? -1
        : 5 + ((index + week * 3) % 6),
  );
  return {
    id: `demo-${index + 1}`,
    name,
    year: 8 + (index % 6),
    squad: Math.floor(index / 6) + 1,
    leader: index % 6 === 0,
    attended: history.filter((score) => score >= 0).length,
    total: history.reduce((sum, score) => sum + Math.max(0, score), 0),
    history,
  };
});
export const emptyEntry = (): Entry => ({
  attendance: "unrecorded",
  score: "",
  uniform: "",
  behaviour: "",
});
export const seedEntries = (
  members: Member[],
  date = "2026-10-16",
): Record<string, Entry> =>
  Object.fromEntries(
    members.map((member) => {
      const index = weeks.indexOf(date);
      const score = index < 0 ? -2 : member.history[index];
      return [
        member.id,
        score === -2
          ? emptyEntry()
          : score < 0
            ? { ...emptyEntry(), attendance: "absent" }
            : {
                attendance: "present",
                score: String(score),
                uniform: String(Math.min(10, score)),
                behaviour: String(Math.min(5, score)),
              },
      ];
    }),
  );
export const initialDate = "2026-10-16";
export const weeks = [
  "2026-08-28",
  "2026-09-04",
  "2026-09-11",
  "2026-09-18",
  "2026-09-25",
  "2026-10-02",
  "2026-10-09",
  "2026-10-16",
];
export const events = [
  {
    id: 1,
    date: "2026-10-16",
    title: "Company night",
    time: "19:00 – 21:00",
    place: "Church hall",
    detail: "A night of team challenges, games and time together.",
    kind: "Weekly night",
  },
  {
    id: 2,
    date: "2026-10-23",
    title: "Adventure evening",
    time: "19:00 – 21:00",
    place: "Church hall",
    detail:
      "Bring a coat and a sense of adventure. Team activities outdoors, weather permitting.",
    kind: "Activities",
  },
  {
    id: 3,
    date: "2026-10-30",
    title: "Half-term break",
    time: "No meeting",
    place: "",
    detail: "Enjoy the break. We will see everyone next Friday.",
    kind: "Notice",
  },
];
export const formatDate = (
  value: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  },
) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );
export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
export const yearLabel = (member: Member, section: Section) =>
  section === "company"
    ? `Year ${member.year}`
    : `P${4 + ((member.year - 8) % 4)}`;
export const attendancePercent = (member: Member) =>
  Math.round(
    (member.attended /
      Math.max(1, member.history.filter((score) => score >= -1).length)) *
      100,
  );
export const squadName = (number: number) =>
  squads.find((squad) => squad.id === number)?.name || `Squad ${number}`;
export function entryError(entry: Entry, section: Section): string | null {
  if (entry.attendance !== "present") return null;
  const valid = (value: string, max: number) =>
    value === "" ||
    (/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value) &&
      Number(value) >= 0 &&
      Number(value) <= max);
  if (section === "company")
    return valid(entry.score, 10)
      ? null
      : "Enter a score from 0 to 10, with up to 2 decimal places.";
  return valid(entry.uniform, 10) && valid(entry.behaviour, 5)
    ? null
    : "Uniform is 0–10 and behaviour is 0–5, with up to 2 decimal places.";
}
