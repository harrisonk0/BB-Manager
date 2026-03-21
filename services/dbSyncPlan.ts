import { Mark, Section } from '../types';
import { toStoredMark } from './dbModel';

type BuildMemberMarkSyncPlanArgs = {
  existingDates: Iterable<string>;
  marks: Mark[];
  memberId: string;
  createdBy: string;
  section: Section;
};

export const buildMemberMarkSyncPlan = ({
  existingDates,
  marks,
  memberId,
  createdBy,
  section,
}: BuildMemberMarkSyncPlanArgs) => {
  const existingDateSet = new Set(existingDates);
  const desiredDateSet = new Set(marks.map((mark) => mark.date));
  const datesToDelete = [...existingDateSet].filter((date) => !desiredDateSet.has(date));
  const markRows = marks.map((mark) => ({
    member_id: memberId,
    created_by: createdBy,
    ...toStoredMark(mark, section),
  }));

  return { datesToDelete, markRows };
};
