import type { CalendarEntry, ScheduleState } from "../types/schedule";

export const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export function startOfWeekMonday(date: Date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - (copy.getDay() + 6) % 7);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function toDateKey(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= "1900-01-01" && value <= "9999-12-31" && toDateKey(fromDateKey(value)) === value;
}

export function shiftMonth(date: Date, delta: number) {
  // Start at the first to avoid Jan 31 overflowing into March.
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function monthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const start = startOfWeekMonday(first);
  const weeks = Math.ceil(((first.getDay() + 6) % 7 + last.getDate()) / 7);
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index));
}

export const occurrenceKey = (lessonId: string, dateKey: string) => `${lessonId}__${dateKey}`;
export const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const formatDate = (key: string) => fromDateKey(key).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

export function entriesForDate(state: ScheduleState, date: string): CalendarEntry[] {
  const dayIndex = (fromDateKey(date).getDay() + 6) % 7;
  const recurring: CalendarEntry[] = state.lessons.filter(lesson => lesson.dayIndex === dayIndex).map(lesson => ({
    id: lesson.id, source: "recurring", kind: "lesson", subjectId: lesson.subjectId,
    title: state.subjects.find(subject => subject.id === lesson.subjectId)?.name ?? "Lezione",
    date, startMinutes: lesson.startMinutes, durationMinutes: lesson.endMinutes - lesson.startMinutes,
    allDay: false, completed: Boolean(state.completedByDate[occurrenceKey(lesson.id, date)]),
    provisional: false, notes: lesson.notes,
  }));
  const sessions: CalendarEntry[] = state.sessions.filter(session => session.studyDate === date).map(session => ({
    ...session, source: "session", date: session.studyDate,
  }));
  return [...recurring, ...sessions].sort((a, b) => Number(b.allDay) - Number(a.allDay) ||
    (a.startMinutes ?? -1) - (b.startMinutes ?? -1) || a.title.localeCompare(b.title, "it", { numeric: true }));
}

export function progressInRange(state: ScheduleState, start: string, end: string, subjectId?: string) {
  let total = 0;
  let completed = 0;
  if (end < start) return { total, completed };
  // Use calendar dates, not elapsed milliseconds: DST days aren't always 24 hours.
  for (const lesson of state.lessons.filter(item => !subjectId || item.subjectId === subjectId)) {
    const first = fromDateKey(start);
    const delta = (lesson.dayIndex - (first.getDay() + 6) % 7 + 7) % 7;
    for (let date = addDays(first, delta); toDateKey(date) <= end; date = addDays(date, 7)) {
      total++;
      if (state.completedByDate[occurrenceKey(lesson.id, toDateKey(date))]) completed++;
    }
  }
  for (const session of state.sessions) {
    if (session.kind === "lesson" && (!subjectId || session.subjectId === subjectId) && session.studyDate >= start && session.studyDate <= end) {
      total++;
      if (session.completed) completed++;
    }
  }
  return { total, completed };
}
