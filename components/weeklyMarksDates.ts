export const formatLocalYmd = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalYmd = (value: string): Date => new Date(`${value}T00:00:00`);

export const addLocalDays = (value: string, days: number): string => {
  const date = parseLocalYmd(value);
  date.setDate(date.getDate() + days);
  return formatLocalYmd(date);
};

export const getTodayString = (baseDate = new Date()): string => formatLocalYmd(baseDate);

export const getNearestMeetingDay = (meetingDay: number, baseDate = new Date()): string => {
  const nextMeetingDate = new Date(baseDate);
  const currentDay = nextMeetingDate.getDay();
  let diff = meetingDay - currentDay;

  if (diff < 0) {
    diff += 7;
  }

  nextMeetingDate.setDate(nextMeetingDate.getDate() + diff);
  return formatLocalYmd(nextMeetingDate);
};

export const getDefaultMarksDate = (meetingDay: number, baseDate = new Date()): string => {
  const today = formatLocalYmd(baseDate);
  const nextMeetingDate = getNearestMeetingDay(meetingDay, baseDate);

  if (nextMeetingDate === today) {
    return today;
  }

  const previousMeetingDate = addLocalDays(nextMeetingDate, -7);
  const daysSincePrevious = Math.round(
    (parseLocalYmd(today).getTime() - parseLocalYmd(previousMeetingDate).getTime()) / 86_400_000,
  );

  if (daysSincePrevious >= 0 && daysSincePrevious <= 2) {
    return previousMeetingDate;
  }

  return nextMeetingDate;
};
