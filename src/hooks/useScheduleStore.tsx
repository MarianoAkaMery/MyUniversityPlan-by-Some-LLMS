import React from "react";
import type { CalendarEntry, Lesson, ScheduleState, StudySession, Subject } from "../types/schedule";
import { entriesForDate, occurrenceKey, progressInRange } from "../lib/calendar";
import { mergePersonalActivities, migrateSchedule, STORAGE_KEY, toggleRecurring, updateSession, validateSession } from "../lib/schedule";
import { importQuantumPlan } from "../lib/quantumPlan";
import { seedData } from "../lib/seed";
import { createId } from "../lib/id";

type ScheduleContextValue = ScheduleState & {
  storageError: string;
  addSubject: (subject: Omit<Subject, "id">) => void;
  removeSubject: (subjectId: string) => void;
  addLesson: (lesson: Omit<Lesson, "id">) => void;
  toggleLessonCompleted: (lessonId: string, dateKey: string) => void;
  isLessonCompleted: (lessonId: string, dateKey: string) => boolean;
  getEntries: (date: string) => CalendarEntry[];
  getProgress: (start: string, end: string, subjectId?: string) => { completed: number; total: number };
  saveSession: (session: StudySession) => void;
  moveSession: (id: string, date: string) => void;
  removeSession: (id: string) => void;
  toggleEntry: (entry: CalendarEntry) => void;
  importQuantum: () => void;
  importPersonalActivities: (input: unknown) => void;
  replaceSchedule: (nextState: ScheduleState) => void;
};

const ScheduleContext = React.createContext<ScheduleContextValue | null>(null);

function loadSchedule() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return { state: raw ? migrateSchedule(JSON.parse(raw)) : seedData, error: "" };
  } catch {
    // Don't overwrite an unreadable original with seed data.
    return { state: seedData, error: "Non è stato possibile leggere i dati locali. L’originale è conservato; il salvataggio è sospeso. Ripristina un backup dalle impostazioni." };
  }
}

export const ScheduleProvider = ({ children }: { children: React.ReactNode }) => {
  const [loaded] = React.useState(loadSchedule);
  const [state, setState] = React.useState(loaded.state);
  const [loadError, setLoadError] = React.useState(loaded.error);
  const [writeError, setWriteError] = React.useState("");

  React.useEffect(() => {
    if (loadError) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setWriteError("");
    } catch {
      setWriteError("Salvataggio locale non riuscito. Scarica un backup prima di chiudere la pagina.");
    }
  }, [state, loadError]);

  const value: ScheduleContextValue = {
    ...state,
    storageError: loadError || writeError,
    addSubject: subject => setState(prev => ({ ...prev, subjects: [...prev.subjects, { ...subject, id: createId() }] })),
    removeSubject: subjectId => setState(prev => {
      const removedIds = prev.lessons.filter(lesson => lesson.subjectId === subjectId).map(lesson => lesson.id);
      return { ...prev, subjects: prev.subjects.filter(subject => subject.id !== subjectId),
        lessons: prev.lessons.filter(lesson => lesson.subjectId !== subjectId),
        sessions: prev.sessions.filter(session => session.subjectId !== subjectId),
        completedByDate: Object.fromEntries(Object.entries(prev.completedByDate).filter(([key]) => !removedIds.some(id => key.startsWith(`${id}__`)))),
      };
    }),
    addLesson: lesson => setState(prev => ({ ...prev, lessons: [...prev.lessons, { ...lesson, id: createId() }] })),
    toggleLessonCompleted: (id, date) => setState(prev => toggleRecurring(prev, id, date)),
    isLessonCompleted: (id, date) => Boolean(state.completedByDate[occurrenceKey(id, date)]),
    getEntries: date => entriesForDate(state, date),
    getProgress: (start, end, subjectId) => progressInRange(state, start, end, subjectId),
    saveSession: session => {
      if (!validateSession(session, new Set(state.subjects.map(subject => subject.id)))) throw new Error("Controlla date, materia e durata della sessione.");
      setState(prev => prev.sessions.some(item => item.id === session.id) ? updateSession(prev, session.id, session) : { ...prev, sessions: [...prev.sessions, session] });
    },
    moveSession: (id, date) => setState(prev => updateSession(prev, id, { studyDate: date })),
    removeSession: id => setState(prev => ({ ...prev, sessions: prev.sessions.filter(session => session.id !== id) })),
    toggleEntry: entry => setState(prev => entry.source === "recurring" ? toggleRecurring(prev, entry.id, entry.date) :
      updateSession(prev, entry.id, { completed: !prev.sessions.find(session => session.id === entry.id)?.completed })),
    importQuantum: () => setState(importQuantumPlan),
    importPersonalActivities: input => {
      mergePersonalActivities(state, input); // Validate synchronously, before scheduling the update.
      setState(prev => mergePersonalActivities(prev, input));
    },
    replaceSchedule: next => { setState(migrateSchedule(next)); setLoadError(""); },
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useScheduleStore = () => {
  const ctx = React.useContext(ScheduleContext);
  if (!ctx) throw new Error("useScheduleStore must be used within ScheduleProvider");
  return ctx;
};
