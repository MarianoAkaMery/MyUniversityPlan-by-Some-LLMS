import type { ScheduleState } from "../types/schedule";

export const seedData: ScheduleState = {
  schemaVersion: 2,
  sessions: [],
  importedPlans: [],
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
