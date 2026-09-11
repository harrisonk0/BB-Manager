import { Boy, JuniorYear, SchoolYear, Section, SectionSettings, SectionSquad } from '../types';

export const MAX_SECTION_SQUADS = 20;
export const MAX_SQUAD_LABEL_LENGTH = 40;

export const COMPANY_YEARS: SchoolYear[] = [8, 9, 10, 11, 12, 13, 14];
export const JUNIOR_YEARS: JuniorYear[] = ['P4', 'P5', 'P6', 'P7'];

export const DEFAULT_COMPANY_SQUADS: SectionSquad[] = [
  { number: 1, label: null },
  { number: 2, label: null },
  { number: 3, label: null },
];

export const DEFAULT_JUNIOR_SQUADS: SectionSquad[] = [
  { number: 1, label: null },
  { number: 2, label: null },
  { number: 3, label: null },
  { number: 4, label: null },
];

const COMPANY_TEXT_COLORS: Record<number, string> = {
  1: 'text-red-600',
  2: 'text-green-600',
  3: 'text-yellow-600',
};

const JUNIOR_TEXT_COLORS: Record<number, string> = {
  1: 'text-red-600',
  2: 'text-green-600',
  3: 'text-blue-600',
  4: 'text-yellow-600',
};

const EXTRA_TEXT_COLORS = [
  'text-purple-600',
  'text-orange-600',
  'text-teal-600',
  'text-pink-600',
  'text-indigo-600',
  'text-cyan-600',
];

const COMPANY_CHART_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#22c55e',
  3: '#eab308',
};

const JUNIOR_CHART_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#22c55e',
  3: '#3b82f6',
  4: '#eab308',
};

const EXTRA_CHART_COLORS = ['#a855f7', '#f97316', '#14b8a6', '#ec4899', '#6366f1', '#06b6d4'];

export const defaultSquadsForSection = (section: Section): SectionSquad[] =>
  section === 'company' ? DEFAULT_COMPANY_SQUADS.map((squad) => ({ ...squad })) : DEFAULT_JUNIOR_SQUADS.map((squad) => ({ ...squad }));

export const normalizeSquadLabel = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_SQUAD_LABEL_LENGTH);
};

export const parseSquads = (raw: unknown, section: Section): SectionSquad[] => {
  if (raw == null) {
    return defaultSquadsForSection(section);
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Settings for the ${section} section have an invalid squads list.`);
  }

  const seen = new Set<number>();
  const squads: SectionSquad[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new Error(`Settings for the ${section} section have an invalid squads list.`);
    }

    const record = item as { number?: unknown; label?: unknown };
    const number = typeof record.number === 'number' ? record.number : Number(record.number);

    if (!Number.isInteger(number) || number < 1 || number > 99 || seen.has(number)) {
      throw new Error(`Settings for the ${section} section have an invalid squads list.`);
    }

    seen.add(number);
    squads.push({
      number,
      label: typeof record.label === 'string' ? normalizeSquadLabel(record.label) : null,
    });
  }

  if (squads.length > MAX_SECTION_SQUADS) {
    throw new Error(`A section can have at most ${MAX_SECTION_SQUADS} squads.`);
  }

  return squads.sort((left, right) => left.number - right.number);
};

export const serializeSquads = (squads: SectionSquad[]): SectionSquad[] =>
  parseSquads(squads, 'company').map((squad) => ({
    number: squad.number,
    label: squad.label,
  }));

export const nextSquadNumber = (squads: SectionSquad[]): number => {
  const used = new Set(squads.map((squad) => squad.number));
  for (let number = 1; number <= 99; number += 1) {
    if (!used.has(number)) return number;
  }
  throw new Error('No unused squad numbers remain.');
};

export const addSquad = (squads: SectionSquad[], label?: string | null): SectionSquad[] => {
  if (squads.length >= MAX_SECTION_SQUADS) {
    throw new Error(`A section can have at most ${MAX_SECTION_SQUADS} squads.`);
  }

  return serializeSquads([...squads, { number: nextSquadNumber(squads), label: normalizeSquadLabel(label) }]);
};

export const renameSquad = (squads: SectionSquad[], number: number, label: string | null): SectionSquad[] => {
  if (!squads.some((squad) => squad.number === number)) {
    throw new Error(`Squad ${number} is not in this section.`);
  }

  return serializeSquads(
    squads.map((squad) => (squad.number === number ? { ...squad, label: normalizeSquadLabel(label) } : squad)),
  );
};

export const removeSquad = (squads: SectionSquad[], number: number): SectionSquad[] => {
  if (squads.length <= 1) {
    throw new Error('A section must keep at least one squad.');
  }

  if (!squads.some((squad) => squad.number === number)) {
    throw new Error(`Squad ${number} is not in this section.`);
  }

  return serializeSquads(squads.filter((squad) => squad.number !== number));
};

export const assignedMemberCount = (boys: Boy[], squadNumber: number): number =>
  boys.filter((boy) => boy.squad === squadNumber).length;

export const squadDisplayName = (squads: SectionSquad[], number: number): string => {
  const match = squads.find((squad) => squad.number === number);
  const label = match?.label?.trim();
  return label || `Squad ${number}`;
};

export const squadTextClass = (section: Section, number: number): string => {
  const mapped = section === 'company' ? COMPANY_TEXT_COLORS[number] : JUNIOR_TEXT_COLORS[number];
  if (mapped) return mapped;
  return EXTRA_TEXT_COLORS[(Math.max(1, number) - 1) % EXTRA_TEXT_COLORS.length];
};

export const squadChartColor = (section: Section, number: number): string => {
  const mapped = section === 'company' ? COMPANY_CHART_COLORS[number] : JUNIOR_CHART_COLORS[number];
  if (mapped) return mapped;
  return EXTRA_CHART_COLORS[(Math.max(1, number) - 1) % EXTRA_CHART_COLORS.length];
};

export const resolveSquadNumber = (squads: SectionSquad[], preferred: number | null | undefined): number => {
  if (preferred != null && squads.some((squad) => squad.number === preferred)) {
    return preferred;
  }
  if (squads[0]) return squads[0].number;
  return 1;
};

export const schoolYearsForSection = (section: Section): Array<SchoolYear | JuniorYear> =>
  section === 'company' ? COMPANY_YEARS : JUNIOR_YEARS;

export const formatSchoolYear = (section: Section, year: SchoolYear | JuniorYear): string =>
  section === 'company' ? `Year ${year}` : String(year);

export const withSettingsSquads = (
  settings: SectionSettings | null,
  section: Section,
): SectionSquad[] => settings?.squads?.length ? settings.squads : defaultSquadsForSection(section);

export const rosterSquadNumbers = (squads: SectionSquad[], boys: Boy[]): number[] => {
  const numbers = new Set(squads.map((squad) => squad.number));
  for (const boy of boys) {
    numbers.add(boy.squad);
  }
  return Array.from(numbers).sort((left, right) => left - right);
};
