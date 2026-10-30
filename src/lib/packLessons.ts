import type { Lesson } from "../types/schedule";

type PackedLesson = {
  lesson: Lesson;
  column: number;
  columnCount: number;
};

export const packLessonsForDay = (dayLessons: Lesson[]): PackedLesson[] => {
  const sorted = [...dayLessons].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.endMinutes - b.endMinutes;
  });

  const packed: Array<{ lesson: Lesson; column: number; groupId: number }> = [];
  const groupColumns = new Map<number, number>();
  let groupId = -1;
  let active: Array<{ endMinutes: number; column: number }> = [];

  for (const lesson of sorted) {
    active = active.filter((item) => item.endMinutes > lesson.startMinutes);
    if (active.length === 0) {
      groupId += 1;
    }

    const usedColumns = new Set(active.map((item) => item.column));
    let column = 0;
    while (usedColumns.has(column)) {
      column += 1;
    }

    active.push({ endMinutes: lesson.endMinutes, column });
    const requiredColumns = Math.max(...active.map((item) => item.column)) + 1;
    groupColumns.set(groupId, Math.max(groupColumns.get(groupId) ?? 1, requiredColumns));
    packed.push({ lesson, column, groupId });
  }

  return packed.map((item) => ({
    lesson: item.lesson,
    column: item.column,
    columnCount: groupColumns.get(item.groupId) ?? 1,
  }));
};
