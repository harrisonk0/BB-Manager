import { Boy, Mark, Section, WeeklyMarksSnapshotEntry } from '../types';

export type JuniorMarkState = { uniform: number | ''; behaviour: number | '' };
export type CompanyMarkState = number | string;
export type WeeklyMarkState = CompanyMarkState | JuniorMarkState | undefined;
export type AttendanceStatus = 'present' | 'absent' | undefined;
type EditableMarkLike = {
  date: string;
  score: number | '';
  uniformScore?: number | '';
  behaviourScore?: number | '';
};

const sortMarksByDate = (marks: Mark[]) =>
  [...marks].sort((a, b) => a.date.localeCompare(b.date));

const marksEqual = (left: Mark | null, right: Mark | null) => {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.date === right.date &&
    left.score === right.score &&
    left.uniformScore === right.uniformScore &&
    left.behaviourScore === right.behaviourScore
  );
};

const normalizeCompanySnapshotMark = (
  selectedDate: string,
  attendanceStatus: AttendanceStatus,
  markState: WeeklyMarkState,
) => {
  if (attendanceStatus === 'absent') {
    return { date: selectedDate, score: -1 };
  }

  if (markState === '' || markState === undefined) {
    return null;
  }

  if (typeof markState !== 'string' && typeof markState !== 'number') {
    return null;
  }

  const parsedScore = typeof markState === 'string' ? parseFloat(markState) : markState;

  if (Number.isNaN(parsedScore)) {
    return null;
  }

  return { date: selectedDate, score: parsedScore };
};

const normalizeJuniorSnapshotMark = (
  selectedDate: string,
  attendanceStatus: AttendanceStatus,
  markState: WeeklyMarkState,
) => {
  if (attendanceStatus === 'absent') {
    return { date: selectedDate, score: -1 };
  }

  const juniorState =
    typeof markState === 'object' && markState !== null && 'uniform' in markState && 'behaviour' in markState
      ? markState
      : { uniform: '', behaviour: '' };
  const noUniformScore = juniorState.uniform === '' || juniorState.uniform === undefined;
  const noBehaviourScore = juniorState.behaviour === '' || juniorState.behaviour === undefined;

  if (noUniformScore && noBehaviourScore) {
    return null;
  }

  const uniformScore = noUniformScore ? 0 : parseFloat(String(juniorState.uniform));
  const behaviourScore = noBehaviourScore ? 0 : parseFloat(String(juniorState.behaviour));

  if (Number.isNaN(uniformScore) || Number.isNaN(behaviourScore)) {
    return null;
  }

  return {
    date: selectedDate,
    score: uniformScore + behaviourScore,
    uniformScore,
    behaviourScore,
  };
};

export const normalizeEditableMarksForSave = (
  editedMarks: EditableMarkLike[],
  activeSection: Section,
): Mark[] => {
  const normalizedMarks = editedMarks.map((editableMark) => {
    if (activeSection === 'company' || editableMark.uniformScore === undefined) {
      const score = editableMark.score === '' ? 0 : parseFloat(String(editableMark.score));
      return { date: editableMark.date, score };
    }

    if (Number(editableMark.score) < 0) {
      return { date: editableMark.date, score: -1 };
    }

    const uniformScore = editableMark.uniformScore === '' ? 0 : parseFloat(String(editableMark.uniformScore));
    const behaviourScore = editableMark.behaviourScore === '' ? 0 : parseFloat(String(editableMark.behaviourScore));
    const score = uniformScore + behaviourScore;
    return { date: editableMark.date, score, uniformScore, behaviourScore };
  });

  return sortMarksByDate(normalizedMarks);
};

export const areMarkListsEqual = (left: Mark[], right: Mark[]) => {
  const normalizedLeft = sortMarksByDate(left);
  const normalizedRight = sortMarksByDate(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((mark, index) => marksEqual(mark, normalizedRight[index]));
};

export const buildWeeklyMarksSnapshot = ({
  boys,
  selectedDate,
  attendance,
  marks,
  activeSection,
}: {
  boys: Boy[];
  selectedDate: string;
  attendance: Record<string, 'present' | 'absent'>;
  marks: Record<string, CompanyMarkState | JuniorMarkState>;
  activeSection: Section;
}): WeeklyMarksSnapshotEntry[] => {
  const snapshot: WeeklyMarksSnapshotEntry[] = [];

  boys.forEach((boy) => {
    if (!boy.id) {
      return;
    }

    const desiredMark =
      activeSection === 'company'
        ? normalizeCompanySnapshotMark(selectedDate, attendance[boy.id], marks[boy.id])
        : normalizeJuniorSnapshotMark(selectedDate, attendance[boy.id], marks[boy.id]);

    const existingMark = boy.marks.find((mark) => mark.date === selectedDate) || null;
    if (!marksEqual(existingMark, desiredMark)) {
      snapshot.push({ memberId: boy.id, mark: desiredMark });
    }
  });

  return snapshot;
};
