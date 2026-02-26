import React from "react";
import type { Lesson, ScheduleState, Subject } from "../types/schedule";

const STORAGE_KEY = "unitrack-schedule-v1";

type ScheduleContextValue = {
  subjects: Subject[];
  lessons: Lesson[];
  addSubject: (subject: Omit<Subject, "id">) => void;
  removeSubject: (subjectId: string) => void;
  addLesson: (lesson: Omit<Lesson, "id" | "completed">) => void;
  toggleLessonCompleted: (lessonId: string) => void;
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
      completed: false,
    },
    {
      id: "les-2",
      subjectId: "sub-2",
      dayIndex: 1,
      startMinutes: 600,
      endMinutes: 660,
      notes: "",
      completed: false,
    },
    {
      id: "les-3",
      subjectId: "sub-3",
      dayIndex: 2,
      startMinutes: 540,
      endMinutes: 600,
      notes: "Portare laptop",
      completed: true,
    },
    {
      id: "les-4",
      subjectId: "sub-1",
      dayIndex: 3,
      startMinutes: 600,
      endMinutes: 660,
      notes: "",
      completed: false,
    },
    {
      id: "les-5",
      subjectId: "sub-2",
      dayIndex: 4,
      startMinutes: 540,
      endMinutes: 600,
      notes: "",
      completed: false,
    },
  ],
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
    const parsed = JSON.parse(raw) as ScheduleState;
    if (!parsed || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.lessons)) {
      return seedData;
    }
    return {
      subjects: parsed.subjects,
      lessons: parsed.lessons.map((lesson) => ({
        ...lesson,
        notes: typeof lesson.notes === "string" ? lesson.notes : "",
      })),
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
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((subject) => subject.id !== subjectId),
      lessons: prev.lessons.filter((lesson) => lesson.subjectId !== subjectId),
    }));
  };

  const addLesson = (lesson: Omit<Lesson, "id" | "completed">) => {
    setState((prev) => ({
      ...prev,
      lessons: [
        ...prev.lessons,
        {
          ...lesson,
          id: createId(),
          completed: false,
        },
      ],
    }));
  };

  const toggleLessonCompleted = (lessonId: string) => {
    setState((prev) => ({
      ...prev,
      lessons: prev.lessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, completed: !lesson.completed } : lesson
      ),
    }));
  };

  const value: ScheduleContextValue = {
    subjects: state.subjects,
    lessons: state.lessons,
    addSubject,
    removeSubject,
    addLesson,
    toggleLessonCompleted,
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
