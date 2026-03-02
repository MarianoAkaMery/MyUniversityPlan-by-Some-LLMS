export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type Lesson = {
  id: string;
  subjectId: string;
  dayIndex: number; // 0-4 (Mon-Fri)
  startMinutes: number;
  endMinutes: number;
  notes: string;
};

export type ScheduleState = {
  subjects: Subject[];
  lessons: Lesson[];
  completedByDate: Record<string, true>;
};
