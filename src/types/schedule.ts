export type Subject = {
  id: string;
  name: string;
  color: string;
  // Lessons already studied, with no invented study/recording dates.
  priorCompletedLessons?: number[];
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
  schemaVersion: 2;
  subjects: Subject[];
  lessons: Lesson[];
  completedByDate: Record<string, true>;
  sessions: StudySession[];
  importedPlans: string[];
};

export type CalendarView = "week" | "month";
export type SessionKind = "lesson" | "review" | "commitment" | "free";

export type StudySession = {
  id: string;
  kind: SessionKind;
  subjectId?: string;
  title: string;
  studyDate: string;
  recordingDate?: string;
  startMinutes?: number;
  durationMinutes?: number;
  allDay: boolean;
  notes: string;
  completed: boolean;
  provisional: boolean;
};

export type CalendarEntry = {
  id: string;
  source: "recurring" | "session";
  kind: SessionKind;
  subjectId?: string;
  title: string;
  date: string;
  startMinutes?: number;
  durationMinutes?: number;
  allDay: boolean;
  completed: boolean;
  provisional: boolean;
  notes: string;
  recordingDate?: string;
};
