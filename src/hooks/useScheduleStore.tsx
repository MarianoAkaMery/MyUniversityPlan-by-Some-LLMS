import React from "react";
import type { Lesson, ScheduleState, Subject } from "../types/schedule";

const STORAGE_KEY = "unitrack-schedule-v1";

const startOfWeekMonday = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const occurrenceKey = (lessonId: string, dateKey: string) => `${lessonId}__${dateKey}`;

type ScheduleContextValue = {
  subjects: Subject[];
  lessons: Lesson[];
  addSubject: (subject: Omit<Subject, "id">) => void;
  removeSubject: (subjectId: string) => void;
  addLesson: (lesson: Omit<Lesson, "id">) => void;
  toggleLessonCompleted: (lessonId: string, dateKey: string) => void;
  isLessonCompleted: (lessonId: string, dateKey: string) => boolean;
  getWeekProgress: (weekOffset: number) => { completed: number; total: number };
};

const ScheduleContext = React.createContext<ScheduleContextValue | null>(null);

const seedData: ScheduleState = {
  subjects: [
    { id: "sub-1", name: "Analisi 1", color: "#f97316" },
    { id: "sub-2", name: "Fisica", color: "#38bdf8" },
    { id: "sub-3", name: "Informatica", color: "#a78bfa" },
  ],
  lessons: [
    {
      id: "les-1",
      subjectId: "sub-1",
      dayIndex: 0,
      startMinutes: 540,
      endMinutes: 630,
      notes: "Ripassare limiti prima della lezione",
    },
    {
      id: "les-2",
      subjectId: "sub-2",
      dayIndex: 1,
      startMinutes: 600,
      endMinutes: 660,
      notes: "",
    },
    {
      id: "les-3",
      subjectId: "sub-3",
      dayIndex: 2,
      startMinutes: 540,
      endMinutes: 600,
      notes: "Portare laptop",
    },
    {
      id: "les-4",
      subjectId: "sub-1",
      dayIndex: 3,
      startMinutes: 600,
      endMinutes: 660,
      notes: "",
    },
    {
      id: "les-5",
      subjectId: "sub-2",
      dayIndex: 4,
      startMinutes: 540,
      endMinutes: 600,
      notes: "",
    },
  ],
  completedByDate: {},
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const loadSchedule = (): ScheduleState => {
  if (typeof window === "undefined") return seedData;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedData;

  try {
    const parsed = JSON.parse(raw) as {
      subjects?: Subject[];
      lessons?: Array<Lesson & { completed?: boolean }>;
      completedByDate?: Record<string, true>;
    };

    if (!parsed || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.lessons)) {
      return seedData;
    }

    let completedByDate: Record<string, true> =
      parsed.completedByDate && typeof parsed.completedByDate === "object"
        ? parsed.completedByDate
        : {};

    if (Object.keys(completedByDate).length === 0) {
      const currentWeek = startOfWeekMonday(new Date());
      for (const lesson of parsed.lessons) {
        if (lesson.completed) {
          const dateKey = toDateKey(addDays(currentWeek, lesson.dayIndex));
          completedByDate[occurrenceKey(lesson.id, dateKey)] = true;
        }
      }
    }

    return {
      subjects: parsed.subjects,
      lessons: parsed.lessons.map((lesson) => ({
        id: lesson.id,
        subjectId: lesson.subjectId,
        dayIndex: lesson.dayIndex,
        startMinutes: lesson.startMinutes,
        endMinutes: lesson.endMinutes,
        notes: typeof lesson.notes === "string" ? lesson.notes : "",
      })),
      completedByDate,
    };
  } catch {
    return seedData;
  }
};

export const ScheduleProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = React.useState<ScheduleState>(() => loadSchedule());

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addSubject = (subject: Omit<Subject, "id">) => {
    setState((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { ...subject, id: createId() }],
    }));
  };

  const removeSubject = (subjectId: string) => {
    setState((prev) => {
      const removedLessonIds = new Set(
        prev.lessons.filter((lesson) => lesson.subjectId === subjectId).map((lesson) => lesson.id)
      );

      const nextCompletedByDate: Record<string, true> = {};
      for (const key of Object.keys(prev.completedByDate)) {
        const lessonId = key.split("__")[0];
        if (!removedLessonIds.has(lessonId)) {
          nextCompletedByDate[key] = true;
        }
      }

      return {
        ...prev,
        subjects: prev.subjects.filter((subject) => subject.id !== subjectId),
        lessons: prev.lessons.filter((lesson) => lesson.subjectId !== subjectId),
        completedByDate: nextCompletedByDate,
      };
    });
  };

  const addLesson = (lesson: Omit<Lesson, "id">) => {
    setState((prev) => ({
      ...prev,
      lessons: [...prev.lessons, { ...lesson, id: createId() }],
    }));
  };

  const toggleLessonCompleted = (lessonId: string, dateKey: string) => {
    const key = occurrenceKey(lessonId, dateKey);
    setState((prev) => {
      const nextCompletedByDate = { ...prev.completedByDate };
      if (nextCompletedByDate[key]) {
        delete nextCompletedByDate[key];
      } else {
        nextCompletedByDate[key] = true;
      }
      return {
        ...prev,
        completedByDate: nextCompletedByDate,
      };
    });
  };

  const isLessonCompleted = (lessonId: string, dateKey: string) => {
    return Boolean(state.completedByDate[occurrenceKey(lessonId, dateKey)]);
  };

  const getWeekProgress = (weekOffset: number) => {
    const weekStart = startOfWeekMonday(addDays(new Date(), weekOffset * 7));
    const completed = state.lessons.reduce((count, lesson) => {
      const dateKey = toDateKey(addDays(weekStart, lesson.dayIndex));
      return count + (state.completedByDate[occurrenceKey(lesson.id, dateKey)] ? 1 : 0);
    }, 0);

    return {
      completed,
      total: state.lessons.length,
    };
  };

  const value: ScheduleContextValue = {
    subjects: state.subjects,
    lessons: state.lessons,
    addSubject,
    removeSubject,
    addLesson,
    toggleLessonCompleted,
    isLessonCompleted,
    getWeekProgress,
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useScheduleStore = () => {
  const ctx = React.useContext(ScheduleContext);
  if (!ctx) {
    throw new Error("useScheduleStore must be used within ScheduleProvider");
  }
  return ctx;
};
