import { describe, expect, it } from 'vitest';

import {
  addSquad,
  assignedMemberCount,
  defaultSquadsForSection,
  nextSquadNumber,
  parseSquads,
  removeSquad,
  renameSquad,
  resolveSquadNumber,
  rosterSquadNumbers,
  squadDisplayName,
  squadTextClass,
} from './sectionSquads';
import type { Boy } from '../types';

const boy = (squad: number): Boy => ({
  name: 'Test',
  squad,
  year: 8,
  marks: [],
});

describe('sectionSquads', () => {
  it('parses stored squad JSON and sorts by number', () => {
    expect(
      parseSquads(
        [
          { number: 3, label: ' Lions ' },
          { number: 1, label: '' },
        ],
        'company',
      ),
    ).toEqual([
      { number: 1, label: null },
      { number: 3, label: 'Lions' },
    ]);
  });

  it('falls back to historic defaults when squads are missing', () => {
    expect(parseSquads(null, 'company')).toEqual(defaultSquadsForSection('company'));
    expect(parseSquads(undefined, 'junior').map((squad) => squad.number)).toEqual([1, 2, 3, 4]);
  });

  it('rejects duplicate or empty squad lists', () => {
    expect(() => parseSquads([], 'company')).toThrow(/invalid squads list/i);
    expect(() => parseSquads([{ number: 1 }, { number: 1 }], 'junior')).toThrow(/invalid squads list/i);
  });

  it('adds the next unused squad number', () => {
    const current = parseSquads([{ number: 1 }, { number: 3 }], 'company');
    expect(nextSquadNumber(current)).toBe(2);
    expect(addSquad(current)).toEqual([
      { number: 1, label: null },
      { number: 2, label: null },
      { number: 3, label: null },
    ]);
  });

  it('renames and removes squads with guards', () => {
    const current = defaultSquadsForSection('company');
    expect(renameSquad(current, 2, 'Red')).toEqual([
      { number: 1, label: null },
      { number: 2, label: 'Red' },
      { number: 3, label: null },
    ]);
    expect(removeSquad(current, 3).map((squad) => squad.number)).toEqual([1, 2]);
    expect(() => removeSquad([{ number: 1, label: null }], 1)).toThrow(/at least one squad/i);
  });

  it('blocks deleting a squad that still has members', () => {
    expect(assignedMemberCount([boy(1), boy(1), boy(2)], 1)).toBe(2);
    expect(assignedMemberCount([boy(2)], 1)).toBe(0);
  });

  it('uses nicknames when present and keeps historic colours for 1–3', () => {
    const squads = renameSquad(defaultSquadsForSection('company'), 2, 'Eagles');
    expect(squadDisplayName(squads, 2)).toBe('Eagles');
    expect(squadDisplayName(squads, 1)).toBe('Squad 1');
    expect(squadTextClass('company', 1)).toBe('text-red-600');
    expect(squadTextClass('junior', 3)).toBe('text-blue-600');
  });

  it('falls back to the first configured squad when the old number is gone', () => {
    const squads = defaultSquadsForSection('company');
    expect(resolveSquadNumber(squads, 2)).toBe(2);
    expect(resolveSquadNumber(squads, 9)).toBe(1);
    expect(rosterSquadNumbers(squads, [boy(9)])).toEqual([1, 2, 3, 9]);
  });
});
