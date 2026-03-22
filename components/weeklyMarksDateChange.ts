export type WeeklyMarksDateChangeRequest = {
  currentDate: string;
  nextDate: string;
  isDirty: boolean;
};

export const shouldConfirmWeeklyMarksDateChange = ({
  currentDate,
  nextDate,
  isDirty,
}: WeeklyMarksDateChangeRequest) => isDirty && currentDate !== nextDate;
