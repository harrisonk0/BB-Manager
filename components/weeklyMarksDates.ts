export const getNearestMeetingDay = (meetingDay: number, baseDate = new Date()): string => {
  const nextMeetingDate = new Date(baseDate);
  const currentDay = nextMeetingDate.getDay();
  let diff = meetingDay - currentDay;

  if (diff < 0) {
    diff += 7;
  }

  nextMeetingDate.setDate(nextMeetingDate.getDate() + diff);
  return nextMeetingDate.toISOString().split('T')[0];
};
