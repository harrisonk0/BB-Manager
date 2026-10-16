import { describe, expect, it } from 'vitest';
import {
  isRankEligible,
  MEMBER_RANKS,
  parseMemberRank,
  rankChevronPaths,
  validateMemberRank,
} from './memberRanks';

describe('Member ranks', () => {
  it('keeps ranks optional for every year and section', () => {
    expect(() => validateMemberRank(null, 'company', 8)).not.toThrow();
    expect(() => validateMemberRank(undefined, 'junior', 'P4')).not.toThrow();
    expect(parseMemberRank(undefined)).toBeNull();
    expect(parseMemberRank('unknown')).toBeNull();
  });
  it.each(MEMBER_RANKS)(
    'allows $label for Company Year 11–14 only',
    ({ value }) => {
      for (const year of [11, 12, 13, 14] as const) {
        expect(isRankEligible('company', year)).toBe(true);
        expect(() => validateMemberRank(value, 'company', year)).not.toThrow();
      }
      for (const year of [8, 9, 10] as const) {
        expect(() => validateMemberRank(value, 'company', year)).toThrow(
          /Year 11/,
        );
      }
      expect(() => validateMemberRank(value, 'junior', 'P7')).toThrow(
        /Year 11/,
      );
    },
  );
  it('rejects invalid ranks and unrecognised years rather than saving them', () => {
    expect(() => validateMemberRank('captain' as never, 'company', 11)).toThrow(
      /valid rank/,
    );
    expect(isRankEligible('company', 15 as never)).toBe(false);
    expect(isRankEligible('company', '11' as never)).toBe(false);
  });
  it('uses one to three downward chevrons and four upward Staff Sergeant chevrons', () => {
    expect(
      MEMBER_RANKS.map(({ value }) => rankChevronPaths(value).length),
    ).toEqual([1, 2, 3, 4]);
    expect(rankChevronPaths('staff_sergeant')[0]).toContain('L12 1.5');
    expect(rankChevronPaths('sergeant')[0]).toContain('L12 9');
  });
});
