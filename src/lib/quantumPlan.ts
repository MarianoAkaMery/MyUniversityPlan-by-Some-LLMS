import type { ScheduleState, StudySession } from "../types/schedule";
import { createId } from "./id";

export const QUANTUM_PLAN_ID = "quantum-november-2026-v1";

const recordingDates = ["2026-09-25", "2026-10-01", "2026-10-02", "2026-10-08", "2026-10-09", "2026-10-15", "2026-10-16", "2026-10-22", "2026-10-23", "2026-10-29", "2026-10-30", "2026-11-05", "2026-11-06", "2026-11-12", "2026-11-13", "2026-11-19", "2026-11-20", "2026-11-26", "2026-11-27"];
const studyDates = ["2026-11-02", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-05", "2026-11-06", "2026-11-09", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-13", "2026-11-13", "2026-11-16", "2026-11-17", "2026-11-19", "2026-11-23", "2026-11-30", "2026-12-01"];

export function importQuantumPlan(state: ScheduleState): ScheduleState {
  // The marker survives edits, moves, deletions and backup/restore.
  if (state.importedPlans.includes(QUANTUM_PLAN_ID)) return state;
  const existing = state.subjects.find(subject => subject.name.trim().toLowerCase() === "quantum physics");
  const subjectId = existing?.id ?? (state.subjects.some(subject => subject.id === "quantum-physics") ? createId() : "quantum-physics");
  const priorCompletedLessons = [...new Set([...(existing?.priorCompletedLessons ?? []), 1, 2, 3])];
  const subjects = existing ? state.subjects.map(subject => subject.id === subjectId ? { ...subject, priorCompletedLessons } : subject) :
    [...state.subjects, { id: subjectId, name: "Quantum Physics", color: "#7c3aed", priorCompletedLessons }];
  const base = { allDay: false, completed: false, provisional: false, notes: "" };
  const sessions: StudySession[] = studyDates.map((studyDate, index) => ({
    ...base, id: `${QUANTUM_PLAN_ID}-L${index + 4}`, kind: "lesson", subjectId,
    title: `Lezione ${index + 4}`, studyDate, recordingDate: recordingDates[index], provisional: index + 4 >= 14,
    notes: index + 4 === 18 ? "Obiettivo: recupero completato." : "",
  }));
  const extras: Array<[string, string, StudySession["kind"], string, boolean, string]> = [
    ["ripasso-breve", "2026-11-12", "review", "Eventuale ripasso breve", false, "Facoltativo."],
    ["margine", "2026-11-18", "review", "Margine · recuperi o esercizi", false, ""],
    ["esercizi", "2026-11-24", "review", "Esercizi", false, ""],
    ["ripasso", "2026-11-25", "review", "Ripasso o recuperi", false, ""],
  ];
  sessions.push(...extras.map(([id, studyDate, kind, title, allDay, notes]) => ({
    ...base, id: `${QUANTUM_PLAN_ID}-${id}`, studyDate, kind, title, allDay, notes,
    ...(kind === "review" ? { subjectId } : {}),
  })));
  const existingIds = new Set(state.sessions.map(session => session.id));
  return { ...state, subjects, sessions: [...state.sessions, ...sessions.filter(session => !existingIds.has(session.id))], importedPlans: [...state.importedPlans, QUANTUM_PLAN_ID] };
}
