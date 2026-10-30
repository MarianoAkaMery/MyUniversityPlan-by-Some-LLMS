import type { ScheduleState, StudySession, Subject } from "../types/schedule";
import { addDays, isDateKey, occurrenceKey, startOfWeekMonday, toDateKey } from "./calendar";

export const STORAGE_KEY = "unitrack-schedule-v1"; // Keep the existing key for an in-place migration.
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const kinds = ["lesson", "review", "commitment", "free"];

export function validateSession(value: unknown, subjectIds: Set<string>): value is StudySession {
  if (!record(value)) return false;
  return text(value.id) && kinds.includes(String(value.kind)) && text(value.title) && isDateKey(value.studyDate) &&
    (value.subjectId === undefined || (typeof value.subjectId === "string" && subjectIds.has(value.subjectId))) &&
    (value.kind !== "lesson" || typeof value.subjectId === "string") &&
    (value.recordingDate === undefined || isDateKey(value.recordingDate)) &&
    (value.startMinutes === undefined || integer(value.startMinutes, 0, 1439)) &&
    (value.durationMinutes === undefined || integer(value.durationMinutes, 1, 1440)) &&
    (value.startMinutes === undefined || value.durationMinutes === undefined || Number(value.startMinutes) + Number(value.durationMinutes) <= 1440) &&
    typeof value.allDay === "boolean" && (!value.allDay || (value.startMinutes === undefined && value.durationMinutes === undefined)) &&
    typeof value.notes === "string" && typeof value.completed === "boolean" && typeof value.provisional === "boolean";
}

function assertUnique(items: { id: string }[]) {
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error("Identificativi duplicati nel backup.");
}

// Fail before changing any state if a backup is malformed; never silently discard records.
export function migrateSchedule(input: unknown, now = new Date()): ScheduleState {
  if (!record(input) || !Array.isArray(input.subjects) || !Array.isArray(input.lessons)) throw new Error("Formato calendario non valido.");
  if (input.schemaVersion !== undefined && input.schemaVersion !== 1 && input.schemaVersion !== 2) throw new Error("Versione calendario non supportata.");
  const subjects: Subject[] = input.subjects.map(value => {
    if (!record(value) || !text(value.id) || !text(value.name) || typeof value.color !== "string") throw new Error("Materia non valida.");
    if (value.priorCompletedLessons !== undefined && (!Array.isArray(value.priorCompletedLessons) || !value.priorCompletedLessons.every(n => integer(n, 1, 10000)))) throw new Error("Progressi precedenti non validi.");
    return { id: value.id, name: value.name, color: value.color,
      ...(value.priorCompletedLessons ? { priorCompletedLessons: [...new Set(value.priorCompletedLessons as number[])] } : {}) };
  });
  assertUnique(subjects);
  const subjectIds = new Set(subjects.map(subject => subject.id));
  const lessons = input.lessons.map(value => {
    if (!record(value) || !text(value.id) || typeof value.subjectId !== "string" || !subjectIds.has(value.subjectId) ||
      !integer(value.dayIndex, 0, 4) || !integer(value.startMinutes, 0, 1439) || !integer(value.endMinutes, 1, 1440) || value.endMinutes <= value.startMinutes) throw new Error("Lezione ricorrente non valida.");
    return { id: value.id, subjectId: value.subjectId, dayIndex: value.dayIndex, startMinutes: value.startMinutes, endMinutes: value.endMinutes, notes: typeof value.notes === "string" ? value.notes : "" };
  });
  assertUnique(lessons);
  const completedByDate: Record<string, true> = {};
  if (input.completedByDate !== undefined && !record(input.completedByDate)) throw new Error("Storico completamenti non valido.");
  if (record(input.completedByDate)) {
    for (const [key, value] of Object.entries(input.completedByDate)) if (value === true) completedByDate[key] = true;
  }
  if (!Object.keys(completedByDate).length) {
    for (const value of input.lessons) {
      if (record(value) && value.completed === true) completedByDate[occurrenceKey(String(value.id), toDateKey(addDays(startOfWeekMonday(now), Number(value.dayIndex))))] = true;
    }
  }
  if (input.sessions !== undefined && !Array.isArray(input.sessions)) throw new Error("Sessioni non valide.");
  const sessions = (input.sessions ?? []) as StudySession[];
  if (!sessions.every(session => validateSession(session, subjectIds))) throw new Error("Sessione non valida: controlla materia, date e orari.");
  assertUnique(sessions);
  if (input.importedPlans !== undefined && (!Array.isArray(input.importedPlans) || !input.importedPlans.every(text))) throw new Error("Storico importazioni non valido.");
  return { schemaVersion: 2, subjects, lessons, completedByDate, sessions, importedPlans: (input.importedPlans ?? []) as string[] };
}

export function updateSession(state: ScheduleState, id: string, changes: Partial<Omit<StudySession, "id">>): ScheduleState {
  const sessions = state.sessions.map(session => session.id === id ? { ...session, ...changes, id } : session);
  if (!sessions.every(session => validateSession(session, new Set(state.subjects.map(subject => subject.id))))) throw new Error("Sessione non valida.");
  return { ...state, sessions };
}

export function toggleRecurring(state: ScheduleState, id: string, date: string): ScheduleState {
  const key = occurrenceKey(id, date);
  const completedByDate = { ...state.completedByDate };
  if (completedByDate[key]) delete completedByDate[key];
  else completedByDate[key] = true;
  return { ...state, completedByDate };
}

export function readBackup(input: unknown, now = new Date()): Record<string, unknown> & { schedule: ScheduleState } {
  if (!record(input) || !record(input.schedule)) throw new Error("Formato backup non valido.");
  if (input.version !== undefined && input.version !== 1 && input.version !== 2) throw new Error("Versione backup non supportata.");
  return { ...input, schedule: migrateSchedule(input.schedule, now) };
}

export function mergePersonalActivities(state: ScheduleState, input: unknown): ScheduleState {
  if (!record(input) || input.version !== 1 || !Array.isArray(input.sessions)) throw new Error("Formato attività non valido.");
  const incoming = input.sessions;
  const subjectIds = new Set(state.subjects.map(subject => subject.id));
  if (!incoming.every(session => validateSession(session, subjectIds))) throw new Error("Attività non valida: controlla date e orari.");
  assertUnique(incoming);
  const existingIds = new Set(state.sessions.map(session => session.id));
  return { ...state, sessions: [...state.sessions, ...incoming.filter(session => !existingIds.has(session.id))] };
}
