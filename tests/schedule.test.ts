import { describe, expect, it } from "vitest";
import { addDays, entriesForDate, fromDateKey, isDateKey, monthDays, progressInRange, shiftMonth, startOfWeekMonday, toDateKey } from "../src/lib/calendar";
import { migrateSchedule, mergePersonalActivities, readBackup, toggleRecurring, updateSession } from "../src/lib/schedule";
import { importQuantumPlan, QUANTUM_PLAN_ID } from "../src/lib/quantumPlan";
import type { StudySession } from "../src/types/schedule";
import { packLessonsForDay } from "../src/lib/packLessons";

const legacy = {
  subjects: [{ id: "math", name: "Analisi", color: "#ffb000" }],
  lessons: [{ id: "weekly", subjectId: "math", dayIndex: 0, startMinutes: 540, endMinutes: 600, notes: "Appunti esistenti" }],
  completedByDate: { "weekly__2026-10-26": true },
};
const state = () => migrateSchedule(legacy);
const activity: StudySession = { id: "personal-1", kind: "commitment", title: "Appuntamento personale", studyDate: "2030-05-14", startMinutes: 1200, durationMinutes: 120, allDay: false, notes: "", completed: false, provisional: false };

describe("calendar dates", () => {
  it("keeps overlapping recurring lessons side by side and reuses columns after a group ends", () => {
    const lesson = legacy.lessons[0];
    const packed = packLessonsForDay([
      { ...lesson, id: "a", startMinutes: 540, endMinutes: 630 },
      { ...lesson, id: "b", startMinutes: 600, endMinutes: 660 },
      { ...lesson, id: "c", startMinutes: 660, endMinutes: 720 },
    ]);
    expect(packed.map(item => [item.column, item.columnCount])).toEqual([[0, 2], [1, 2], [0, 1]]);
  });
  it("crosses month and year boundaries without overflowing month-end", () => {
    expect(toDateKey(shiftMonth(fromDateKey("2026-01-31"), 1))).toBe("2026-02-01");
    expect(toDateKey(shiftMonth(fromDateKey("2026-12-31"), 1))).toBe("2027-01-01");
    expect(toDateKey(shiftMonth(fromDateKey("2027-01-01"), -1))).toBe("2026-12-01");
  });
  it.each(["2026-11-01", "2026-02-01", "2028-02-01", "2027-08-01"])("makes complete Monday–Sunday weeks for %s", key => {
    const days = monthDays(fromDateKey(key));
    expect(days[0].getDay()).toBe(1);
    expect(days.at(-1)?.getDay()).toBe(0);
    expect(days.length % 7).toBe(0);
    expect(new Set(days.map(toDateKey)).size).toBe(days.length);
    const expected = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
    expect(days.filter(day => day.getMonth() === fromDateKey(key).getMonth())).toHaveLength(expected);
  });
  it("validates leap days and preserves local dates across DST", () => {
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-11-31")).toBe(false);
    expect(toDateKey(addDays(fromDateKey("2026-03-29"), 1))).toBe("2026-03-30");
    expect(toDateKey(startOfWeekMonday(fromDateKey("2026-11-01")))).toBe("2026-10-26");
    expect(progressInRange(state(), "2026-03-23", "2026-03-30").total).toBe(2);
  });
});

describe("migration and backups", () => {
  it("preserves old subjects, recurring lessons, notes and completion history", () => {
    const migrated = readBackup({ version: 1, username: "Test", generalCourseNotes: "Note", schedule: legacy });
    expect(migrated.schedule).toMatchObject({ ...legacy, schemaVersion: 2, sessions: [], importedPlans: [] });
    expect(migrated.generalCourseNotes).toBe("Note");
    expect(migrated.username).toBe("Test");
  });
  it("migrates the original boolean completion to the current occurrence once", () => {
    const migrated = migrateSchedule({ ...legacy, completedByDate: undefined, lessons: [{ ...legacy.lessons[0], completed: true }] }, fromDateKey("2026-11-04"));
    expect(migrated.completedByDate).toEqual({ "weekly__2026-11-02": true });
    expect(migrateSchedule(migrated, fromDateKey("2026-11-11"))).toEqual(migrated);
  });
  it("round trips sessions, prior study, preferences, markers and completion", () => {
    const imported = importQuantumPlan(state());
    const moved = updateSession(imported, `${QUANTUM_PLAN_ID}-L4`, { completed: true, studyDate: "2026-12-05" });
    const backup = { version: 2, calendarView: "month", username: "Test", courseNotes: "**Esame**", calendarWindow: { startHour: 8, endHour: 18 }, cumulativeWindow: { startDate: "2026-09-01" }, schedule: moved };
    expect(readBackup(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
  });
  it("rejects invalid or future backups instead of silently dropping data", () => {
    expect(() => readBackup({ version: 9, schedule: legacy })).toThrow();
    expect(() => migrateSchedule({ ...legacy, sessions: [{ ...activity, studyDate: "2030-02-30" }] })).toThrow();
    expect(() => migrateSchedule({ ...legacy, sessions: [activity, activity] })).toThrow();
    expect(() => migrateSchedule({ ...legacy, lessons: [{ ...legacy.lessons[0], subjectId: "missing" }] })).toThrow();
  });
});

describe("Quantum plan", () => {
  it("imports exactly the supplied study and recording dates, without invented hours", () => {
    const plan = importQuantumPlan(state());
    const expected = [
      [4, "2026-11-02", "2026-09-25"], [5, "2026-11-02", "2026-10-01"], [6, "2026-11-03", "2026-10-02"],
      [7, "2026-11-04", "2026-10-08"], [8, "2026-11-05", "2026-10-09"], [9, "2026-11-05", "2026-10-15"],
      [10, "2026-11-06", "2026-10-16"], [11, "2026-11-09", "2026-10-22"], [12, "2026-11-09", "2026-10-23"],
      [13, "2026-11-10", "2026-10-29"], [14, "2026-11-11", "2026-10-30"], [15, "2026-11-13", "2026-11-05"],
      [16, "2026-11-13", "2026-11-06"], [17, "2026-11-16", "2026-11-12"], [18, "2026-11-17", "2026-11-13"],
      [19, "2026-11-19", "2026-11-19"], [20, "2026-11-23", "2026-11-20"], [21, "2026-11-30", "2026-11-26"],
      [22, "2026-12-01", "2026-11-27"],
    ];
    expect(plan.sessions.filter(item => item.kind === "lesson")).toHaveLength(19);
    for (const [number, studyDate, recordingDate] of expected) {
      expect(plan.sessions.find(item => item.title === `Lezione ${number}`)).toMatchObject({ studyDate, recordingDate, provisional: Number(number) >= 14, completed: false });
    }
    expect(plan.sessions.every(item => item.startMinutes === undefined && item.durationMinutes === undefined)).toBe(true);
    expect(plan.subjects.find(subject => subject.name === "Quantum Physics")?.priorCompletedLessons).toEqual([1, 2, 3]);
    expect(plan.lessons).toEqual(legacy.lessons);
    expect(plan.completedByDate).toEqual(legacy.completedByDate);
    expect(plan.sessions.filter(item => item.kind === "review")).toHaveLength(4);
    expect(plan.sessions.every(item => item.kind === "lesson" || item.kind === "review")).toBe(true);
  });
  it("reuses an existing subject and repeated import preserves moves, edits and deletions", () => {
    const initial = state();
    initial.subjects.push({ id: "my-course", name: " Quantum Physics ", color: "#123456" });
    let imported = importQuantumPlan(initial);
    expect(imported.subjects).toHaveLength(2);
    expect(imported.sessions[0].subjectId).toBe("my-course");
    imported = updateSession(imported, imported.sessions[0].id, { studyDate: "2026-12-05", completed: true, notes: "Modificata" });
    imported.sessions = imported.sessions.slice(0, -1);
    expect(importQuantumPlan(imported)).toEqual(imported);
    expect(importQuantumPlan(readBackup({ version: 2, schedule: imported }).schedule)).toEqual(imported);
  });
});

describe("progress and personal activities", () => {
  it("keeps completion when moving between months; recurring and dated progress agree with entries", () => {
    let data = importQuantumPlan(state());
    data = toggleRecurring(data, "weekly", "2026-11-02");
    data = updateSession(data, `${QUANTUM_PLAN_ID}-L4`, { completed: true });
    expect(progressInRange(data, "2026-11-02", "2026-11-08")).toEqual({ total: 8, completed: 2 });
    expect(entriesForDate(data, "2026-11-02").filter(entry => entry.completed)).toHaveLength(2);
    data = updateSession(data, `${QUANTUM_PLAN_ID}-L4`, { studyDate: "2026-12-05" });
    expect(progressInRange(data, "2026-11-02", "2026-11-08")).toEqual({ total: 7, completed: 1 });
    expect(progressInRange(data, "2026-12-01", "2026-12-31", "quantum-physics")).toEqual({ total: 2, completed: 1 });
    expect(entriesForDate(data, "2026-12-05")[0].completed).toBe(true);
    expect(progressInRange(data, "2026-12-01", "2026-11-01")).toEqual({ total: 0, completed: 0 });
  });
  it("supports short, unknown-time and all-day events without blocking other entries or counting them as lessons", () => {
    const data = importQuantumPlan(state());
    const before = progressInRange(data, "2026-11-01", "2026-11-30");
    const withEvents = mergePersonalActivities(data, { version: 1, sessions: [
      { ...activity, studyDate: "2026-11-02" },
      { ...activity, id: "unknown", studyDate: "2026-11-02", startMinutes: undefined, durationMinutes: undefined },
      { ...activity, id: "free", kind: "free", studyDate: "2026-11-02", allDay: true, startMinutes: undefined, durationMinutes: undefined },
    ] });
    expect(entriesForDate(withEvents, "2026-11-02")).toHaveLength(6);
    expect(progressInRange(withEvents, "2026-11-01", "2026-11-30")).toEqual(before);
    expect(() => mergePersonalActivities(data, { version: 1, sessions: [{ ...activity, allDay: true }] })).toThrow();
    expect(() => mergePersonalActivities(data, { version: 1, sessions: [{ ...activity, durationMinutes: 300 }] })).toThrow();
  });
  it("merges personal files without replacing courses or duplicating moved events", () => {
    const data = mergePersonalActivities(state(), { version: 1, sessions: [activity] });
    const moved = updateSession(data, activity.id, { studyDate: "2030-05-15" });
    expect(mergePersonalActivities(moved, { version: 1, sessions: [activity] })).toEqual(moved);
    expect(data.subjects).toEqual(legacy.subjects);
    expect(data.lessons).toEqual(legacy.lessons);
  });
});
