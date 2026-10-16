import type { Boy, MemberRank, Section } from '../types';

export const MEMBER_RANKS = [
  { value: 'lance_corporal', label: 'Lance Corporal', chevrons: 1 },
  { value: 'corporal', label: 'Corporal', chevrons: 2 },
  { value: 'sergeant', label: 'Sergeant', chevrons: 3 },
  { value: 'staff_sergeant', label: 'Staff Sergeant', chevrons: 4 },
] as const;

export const rankDefinition = (rank: MemberRank) =>
  MEMBER_RANKS.find((item) => item.value === rank);
export const parseMemberRank = (value: unknown): MemberRank | null =>
  MEMBER_RANKS.some((item) => item.value === value)
    ? (value as MemberRank)
    : null;

export const isRankEligible = (section: Section, year: Boy['year']) =>
  section === 'company' &&
  typeof year === 'number' &&
  Number.isInteger(year) &&
  year >= 11 &&
  year <= 14;

export const validateMemberRank = (
  rank: MemberRank | null | undefined,
  section: Section,
  year: Boy['year'],
) => {
  if (rank == null) return;
  if (!rankDefinition(rank)) throw new Error('Choose a valid rank.');
  if (!isRankEligible(section, year))
    throw new Error(
      'Ranks can only be assigned to Company boys in Year 11 or above.',
    );
};

// BB uniform regulations: 1–3 chevrons point down; Staff Sergeant has four pointing up.
// Shared vector geometry keeps browser and PDF insignia consistent.
export const rankChevronPaths = (rank: MemberRank): string[] => {
  const definition = rankDefinition(rank);
  if (!definition) return [];
  const top = (26 - (definition.chevrons * 5 + 3)) / 2;
  return Array.from({ length: definition.chevrons }, (_, index) => {
    const y = top + index * 5;
    return rank === 'staff_sergeant'
      ? `M3 ${y + 5} L12 ${y} L21 ${y + 5} L21 ${y + 8} L12 ${y + 3} L3 ${y + 8} Z`
      : `M3 ${y} L12 ${y + 5} L21 ${y} L21 ${y + 3} L12 ${y + 8} L3 ${y + 3} Z`;
  });
};
