import { Boy, Mark, Section } from '../types';

export type MemberRow = {
  id: string;
  name: string;
  squad: number;
  section: Section;
  school_year: string;
  is_squad_leader: boolean | null;
};

export type MarkRow = {
  id: string;
  member_id: string;
  section: Section;
  date: string;
  score: number | null;
  uniform_score: number | null;
  behaviour_score: number | null;
  present: boolean | null;
};

export const parseSchoolYear = (section: Section, schoolYear: string): Boy['year'] => {
  if (section === 'company' && /^\d+$/.test(schoolYear)) {
    return Number(schoolYear) as Boy['year'];
  }

  return schoolYear as Boy['year'];
};

export const toStoredMark = (mark: Mark, section: Section) => {
  if (mark.score < 0) {
    return {
      date: mark.date,
      section,
      score: null,
      uniform_score: null,
      behaviour_score: null,
      present: false,
    };
  }

  return {
    date: mark.date,
    section,
    score: mark.score,
    uniform_score: section === 'junior' ? (mark.uniformScore ?? null) : null,
    behaviour_score: section === 'junior' ? (mark.behaviourScore ?? null) : null,
    present: true,
  };
};

export const mapMarkRow = (row: MarkRow): Mark => {
  if (row.present === false || row.score === null) {
    return { date: row.date, score: -1 };
  }

  const mark: Mark = {
    date: row.date,
    score: Number(row.score),
  };

  if (row.uniform_score !== null) {
    mark.uniformScore = Number(row.uniform_score);
  }

  if (row.behaviour_score !== null) {
    mark.behaviourScore = Number(row.behaviour_score);
  }

  return mark;
};

export const mapBoyRow = (member: MemberRow, marks: MarkRow[]): Boy => ({
  id: member.id,
  name: member.name,
  squad: member.squad as Boy['squad'],
  year: parseSchoolYear(member.section, member.school_year),
  marks: [...marks]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(mapMarkRow),
  isSquadLeader: member.is_squad_leader ?? false,
});

export const validateMarksForSection = (marks: Mark[], section: Section, subject = 'Member') => {
  if (!Array.isArray(marks)) {
    throw new Error('Marks must be an array.');
  }

  const validateDecimalPlaces = (value: number, fieldName: string, date: string) => {
    if (value < 0) return;

    const valueString = value.toString();
    const decimalPart = valueString.split('.')[1];

    if (decimalPart && decimalPart.length > 2) {
      throw new Error(`${fieldName} for ${subject} on ${date} has more than 2 decimal places.`);
    }
  };

  for (const mark of marks) {
    if (typeof mark.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(mark.date)) {
      throw new Error(`Invalid date format for mark: ${mark.date}`);
    }

    if (typeof mark.score !== 'number') {
      throw new Error(`Invalid score type for mark on ${mark.date}. Score must be a number.`);
    }

    if (mark.score === -1) {
      continue;
    }

    validateDecimalPlaces(mark.score, 'Total score', mark.date);

    if (section === 'company') {
      if (mark.score < 0 || mark.score > 10) {
        throw new Error(`Company section score for ${subject} on ${mark.date} is out of range (0-10).`);
      }

      if (mark.uniformScore !== undefined || mark.behaviourScore !== undefined) {
        throw new Error(`Company section boy ${subject} on ${mark.date} has junior-specific scores.`);
      }
    } else {
      if (typeof mark.uniformScore !== 'number' || mark.uniformScore < 0 || mark.uniformScore > 10) {
        throw new Error(`Junior section uniform score for ${subject} on ${mark.date} is invalid or out of range (0-10).`);
      }

      if (typeof mark.behaviourScore !== 'number' || mark.behaviourScore < 0 || mark.behaviourScore > 5) {
        throw new Error(`Junior section behaviour score for ${subject} on ${mark.date} is invalid or out of range (0-5).`);
      }

      validateDecimalPlaces(mark.uniformScore, 'Uniform score', mark.date);
      validateDecimalPlaces(mark.behaviourScore, 'Behaviour score', mark.date);

      const calculatedTotal = mark.uniformScore + mark.behaviourScore;

      if (Math.abs(mark.score - calculatedTotal) > 0.001) {
        throw new Error(`Junior section total score for ${subject} on ${mark.date} does not match sum of uniform and behaviour scores.`);
      }
    }
  }
};

export const validateBoyMarks = (boy: Boy, section: Section) => {
  validateMarksForSection(boy.marks, section, boy.name);
};
