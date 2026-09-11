import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Boy } from '../types';
import { defaultSquadsForSection } from './sectionSquads';

const createBoy = vi.fn();

vi.mock('./db', () => ({
  createBoy: (...args: unknown[]) => createBoy(...args),
}));

import {
  buildImportCandidates,
  describeYearChange,
  importArchivedMembers,
  planNextSchoolYear,
} from './importFromSession';

const archived = {
  id: 'arch-1',
  name: 'Sam Example',
  squad: 2,
  section: 'company' as const,
  year: 10 as const,
  isSquadLeader: true,
};

describe('importFromSession', () => {
  beforeEach(() => {
    createBoy.mockReset();
    createBoy.mockResolvedValue({ id: 'new-1' });
  });

  it('bumps company years and marks Year 14 as left', () => {
    expect(planNextSchoolYear('company', 8)).toEqual({ status: 'returning', section: 'company', year: 9 });
    expect(planNextSchoolYear('company', 13)).toEqual({ status: 'returning', section: 'company', year: 14 });
    expect(planNextSchoolYear('company', 14)).toEqual({ status: 'left', reason: 'Finished Year 14' });
  });

  it('bumps junior years and promotes P7 into Company Year 8', () => {
    expect(planNextSchoolYear('junior', 'P4')).toEqual({ status: 'returning', section: 'junior', year: 'P5' });
    expect(planNextSchoolYear('junior', 'P6')).toEqual({ status: 'returning', section: 'junior', year: 'P7' });
    expect(planNextSchoolYear('junior', 'P7')).toEqual({ status: 'promote', section: 'company', year: 8 });
  });

  it('lists returning company boys as eligible and Year 14 as not', () => {
    const candidates = buildImportCandidates({
      activeSection: 'company',
      destinationSquads: defaultSquadsForSection('company'),
      liveBoys: [],
      archivedMembers: [
        archived,
        { ...archived, id: 'arch-14', name: 'Leaver', year: 14 },
      ],
    });

    expect(candidates[0]).toMatchObject({
      archivedMemberId: 'arch-1',
      eligible: true,
      suggestedSquad: 2,
      suggestedIsSquadLeader: true,
    });
    expect(describeYearChange(candidates[0])).toBe('Year 10 → Year 11');
    expect(candidates[1]).toMatchObject({
      eligible: false,
      ineligibleReason: 'Finished Year 14',
    });
  });

  it('lets Company import Junior P7 as Year 8, and tells Junior to switch section', () => {
    const p7 = {
      id: 'arch-p7',
      name: 'Pat Example',
      squad: 4,
      section: 'junior' as const,
      year: 'P7' as const,
      isSquadLeader: false,
    };

    const companyView = buildImportCandidates({
      activeSection: 'company',
      destinationSquads: defaultSquadsForSection('company'),
      liveBoys: [],
      archivedMembers: [p7],
    });
    expect(companyView[0]).toMatchObject({
      eligible: true,
      suggestedSquad: 1,
    });
    expect(describeYearChange(companyView[0])).toBe('P7 → Company Year 8');

    const juniorView = buildImportCandidates({
      activeSection: 'junior',
      destinationSquads: defaultSquadsForSection('junior'),
      liveBoys: [],
      archivedMembers: [p7],
    });
    expect(juniorView[0].eligible).toBe(false);
    expect(juniorView[0].ineligibleReason).toMatch(/switch to company/i);
  });

  it('marks already-imported archive rows as ineligible', () => {
    const liveBoys: Boy[] = [
      {
        id: 'live-1',
        name: 'Sam Example',
        squad: 2,
        year: 11,
        marks: [],
        importedFromArchivedMemberId: 'arch-1',
      },
    ];

    const candidates = buildImportCandidates({
      activeSection: 'company',
      destinationSquads: defaultSquadsForSection('company'),
      liveBoys,
      archivedMembers: [archived],
    });

    expect(candidates[0]).toMatchObject({
      eligible: false,
      alreadyImported: true,
      nameConflict: true,
    });
  });

  it('creates live members without marks and with the bumped year', async () => {
    const result = await importArchivedMembers({
      activeSection: 'company',
      archivedMembers: [archived],
      selections: [{ archivedMemberId: 'arch-1', squad: 3, year: 11, isSquadLeader: false }],
    });

    expect(result.importedNames).toEqual(['Sam Example']);
    expect(createBoy).toHaveBeenCalledWith(
      {
        name: 'Sam Example',
        squad: 3,
        year: 11,
        marks: [],
        isSquadLeader: false,
        importedFromArchivedMemberId: 'arch-1',
      },
      'company',
    );
  });
});
