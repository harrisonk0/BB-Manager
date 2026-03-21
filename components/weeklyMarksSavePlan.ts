import { Boy, Mark, Section } from '../types';

export type JuniorMarkState = { uniform: number | ''; behaviour: number | '' };
export type CompanyMarkState = number | string;
export type WeeklyMarkState = CompanyMarkState | JuniorMarkState | undefined;
export type AttendanceStatus = 'present' | 'absent' | undefined;

type BuildWeeklyMarkUpdateArgs = {
  boy: Boy;
  selectedDate: string;
  attendanceStatus: AttendanceStatus;
  markState: WeeklyMarkState;
  activeSection: Section;
};

export const buildUpdatedMarksForBoy = ({
  boy,
  selectedDate,
  attendanceStatus,
  markState,
  activeSection,
}: BuildWeeklyMarkUpdateArgs): Mark[] | null => {
  const markIndex = boy.marks.findIndex((mark) => mark.date === selectedDate);
  const updatedMarks = [...boy.marks];

  if (attendanceStatus === 'absent') {
    if (markIndex > -1) {
      if (updatedMarks[markIndex].score !== -1) {
        updatedMarks[markIndex] = { date: selectedDate, score: -1 };
        return updatedMarks;
      }

      return null;
    }

    updatedMarks.push({ date: selectedDate, score: -1 });
    return updatedMarks;
  }

  if (activeSection === 'company') {
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

    if (markIndex > -1) {
      if (updatedMarks[markIndex].score !== parsedScore || updatedMarks[markIndex].uniformScore !== undefined) {
        updatedMarks[markIndex] = { date: selectedDate, score: parsedScore };
        return updatedMarks;
      }

      return null;
    }

    updatedMarks.push({ date: selectedDate, score: parsedScore });
    return updatedMarks;
  }

  const juniorState = (markState as JuniorMarkState | undefined) ?? { uniform: '', behaviour: '' };
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

  const finalScore = uniformScore + behaviourScore;

  if (markIndex > -1) {
    const existingMark = updatedMarks[markIndex];

    if (
      existingMark.score !== finalScore ||
      existingMark.uniformScore !== uniformScore ||
      existingMark.behaviourScore !== behaviourScore
    ) {
      updatedMarks[markIndex] = {
        date: selectedDate,
        score: finalScore,
        uniformScore,
        behaviourScore,
      };
      return updatedMarks;
    }

    return null;
  }

  updatedMarks.push({
    date: selectedDate,
    score: finalScore,
    uniformScore,
    behaviourScore,
  });

  return updatedMarks;
};
