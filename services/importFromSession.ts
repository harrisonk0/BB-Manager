import { Boy, JuniorYear, SchoolYear, Section, SectionSquad } from '../types';
import { createBoy } from './db';
import { formatSchoolYear, resolveSquadNumber, schoolYearsForSection } from './sectionSquads';

export type SchoolYearPlan =
  | { status: 'returning'; section: Section; year: SchoolYear | JuniorYear }
  | { status: 'promote'; section: 'company'; year: 8 }
  | { status: 'left'; reason: string };

export type ArchivedMemberSnapshot = {
  id: string;
  name: string;
  squad: number;
  section: Section;
  year: SchoolYear | JuniorYear;
  isSquadLeader: boolean;
};

export type ImportCandidate = {
  archivedMemberId: string;
  name: string;
  sourceSection: Section;
  sourceYear: SchoolYear | JuniorYear;
  sourceSquad: number;
  plan: SchoolYearPlan;
  eligible: boolean;
  ineligibleReason: string | null;
  alreadyImported: boolean;
  nameConflict: boolean;
  suggestedSquad: number;
  suggestedIsSquadLeader: boolean;
};

export type ImportSelection = {
  archivedMemberId: string;
  squad: number;
  year: SchoolYear | JuniorYear;
  isSquadLeader: boolean;
};

const JUNIOR_YEAR_SEQUENCE: JuniorYear[] = ['P4', 'P5', 'P6', 'P7'];

export const normalizeMemberName = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase();

export const planNextSchoolYear = (section: Section, year: SchoolYear | JuniorYear): SchoolYearPlan => {
  if (section === 'junior') {
    const index = JUNIOR_YEAR_SEQUENCE.indexOf(year as JuniorYear);
    if (index === -1) {
      return { status: 'left', reason: 'Unrecognised junior year' };
    }
    if (year === 'P7') {
      return { status: 'promote', section: 'company', year: 8 };
    }
    return { status: 'returning', section: 'junior', year: JUNIOR_YEAR_SEQUENCE[index + 1] };
  }

  if (typeof year === 'number' && Number.isInteger(year)) {
    if (year >= 8 && year <= 13) {
      return { status: 'returning', section: 'company', year: (year + 1) as SchoolYear };
    }
    if (year === 14) {
      return { status: 'left', reason: 'Finished Year 14' };
    }
  }

  return { status: 'left', reason: 'Unrecognised company year' };
};

export const destinationSectionForPlan = (plan: SchoolYearPlan): Section | null => {
  if (plan.status === 'returning' || plan.status === 'promote') {
    return plan.section;
  }
  return null;
};

const ineligibleReasonFor = (plan: SchoolYearPlan, activeSection: Section): string | null => {
  if (plan.status === 'left') {
    return plan.reason;
  }
  if (plan.status === 'promote' && activeSection === 'junior') {
    return 'Moving to Company as Year 8. Switch to Company to import.';
  }
  if (plan.status === 'returning' && plan.section !== activeSection) {
    return `Staying in ${plan.section === 'company' ? 'Company' : 'Junior'}. Switch section to import.`;
  }
  return null;
};

export const describeYearChange = (candidate: ImportCandidate): string => {
  const { plan, sourceSection, sourceYear } = candidate;
  const from = formatSchoolYear(sourceSection, sourceYear);
  if (plan.status === 'returning') {
    return `${from} → ${formatSchoolYear(plan.section, plan.year)}`;
  }
  if (plan.status === 'promote') {
    return `${from} → Company Year 8`;
  }
  return from;
};

export const buildImportCandidates = ({
  activeSection,
  archivedMembers,
  liveBoys,
  destinationSquads,
}: {
  activeSection: Section;
  archivedMembers: ArchivedMemberSnapshot[];
  liveBoys: Boy[];
  destinationSquads: SectionSquad[];
}): ImportCandidate[] => {
  const importedIds = new Set(
    liveBoys
      .map((boy) => boy.importedFromArchivedMemberId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  const liveNames = new Set(liveBoys.map((boy) => normalizeMemberName(boy.name)));

  return archivedMembers
    .map((member) => {
      const plan = planNextSchoolYear(member.section, member.year);
      const destination = destinationSectionForPlan(plan);
      const alreadyImported = importedIds.has(member.id);
      const reason = alreadyImported ? 'Already on this year’s roster' : ineligibleReasonFor(plan, activeSection);
      const eligible = !alreadyImported && destination === activeSection && reason == null;

      return {
        archivedMemberId: member.id,
        name: member.name,
        sourceSection: member.section,
        sourceYear: member.year,
        sourceSquad: member.squad,
        plan,
        eligible,
        ineligibleReason: reason,
        alreadyImported,
        nameConflict: liveNames.has(normalizeMemberName(member.name)),
        suggestedSquad: resolveSquadNumber(destinationSquads, member.squad),
        suggestedIsSquadLeader: member.isSquadLeader,
      };
    })
    .sort((left, right) => {
      if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
};

export const importArchivedMembers = async ({
  activeSection,
  archivedMembers,
  selections,
}: {
  activeSection: Section;
  archivedMembers: ArchivedMemberSnapshot[];
  selections: ImportSelection[];
}): Promise<{ importedNames: string[]; skipped: string[] }> => {
  const byId = new Map(archivedMembers.map((member) => [member.id, member]));
  const importedNames: string[] = [];
  const skipped: string[] = [];
  const allowedYears = new Set(schoolYearsForSection(activeSection).map(String));

  for (const selection of selections) {
    const source = byId.get(selection.archivedMemberId);
    if (!source) {
      skipped.push('Unknown archived member');
      continue;
    }

    const plan = planNextSchoolYear(source.section, source.year);
    const destination = destinationSectionForPlan(plan);
    if (destination !== activeSection) {
      skipped.push(`${source.name}: not joining this section`);
      continue;
    }

    if (!allowedYears.has(String(selection.year))) {
      skipped.push(`${source.name}: year is not valid for this section`);
      continue;
    }

    try {
      await createBoy(
        {
          name: source.name,
          squad: selection.squad,
          year: selection.year,
          marks: [],
          isSquadLeader: selection.isSquadLeader,
          importedFromArchivedMemberId: source.id,
        },
        activeSection,
      );
      importedNames.push(source.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import';
      if (/duplicate|unique/i.test(message)) {
        skipped.push(`${source.name}: already imported`);
      } else {
        skipped.push(`${source.name}: ${message}`);
      }
    }
  }

  return { importedNames, skipped };
};
