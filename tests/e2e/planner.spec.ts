import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const storageKey = "unitrack-schedule-v1";
const planButton = "Importa piano Quantum novembre 2026";
const oldSchedule = {
  subjects: [{ id: "old-subject", name: "Corso esistente", color: "#fbbf24" }],
  lessons: [{ id: "old-lesson", subjectId: "old-subject", dayIndex: 0, startMinutes: 540, endMinutes: 600, notes: "Note mantenute" }],
  completedByDate: { "old-lesson__2026-11-02": true },
};
const personalActivity = { id: "test-personal", kind: "commitment", title: "Appuntamento personale", studyDate: "2030-05-14", startMinutes: 1200, durationMinutes: 90, allDay: false, notes: "Nota di prova", completed: false, provisional: false };
const file = (data: unknown) => ({ name: "test-data.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) });
const readState = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
const calendarView = (page: Page, name: string) => page.getByRole("group", { name: "Vista calendario" }).getByRole("button", { name, exact: true });
const closeDay = (page: Page) => page.getByRole("dialog").getByRole("button", { name: "Chiudi", exact: true }).click();

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-30T12:00:00+01:00"));
  await page.goto("/");
});

test("navigates months, years and today; remembers the view and fits the screen", async ({ page }, testInfo) => {
  await calendarView(page, "Mese").click();
  await expect(page.getByRole("heading", { name: "ottobre 2026" })).toBeVisible();
  await expect(page.locator('[aria-current="date"]')).toHaveAttribute("data-date", "2026-10-30");
  await page.getByLabel("Vai al mese").fill("2026-12");
  await page.getByRole("button", { name: "Mese successivo" }).click();
  await expect(page.getByRole("heading", { name: "gennaio 2027" })).toBeVisible();
  await page.getByRole("button", { name: "Mese precedente" }).click();
  await expect(page.getByRole("heading", { name: "dicembre 2026" })).toBeVisible();
  await page.getByRole("button", { name: "Oggi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ottobre 2026" })).toBeVisible();
  await page.reload();
  await expect(calendarView(page, "Mese")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: planButton }).click();
  await expect(page.getByLabel("Calendario mensile").locator("[data-date]")).toHaveCount(42);
  await expect(page.getByTestId("quantum-progress")).toContainText("3/22");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("region", { name: "novembre 2026" }).screenshot({ path: testInfo.outputPath("month.png") });
});

test("completion, movement, editing and deletion stay coherent across views and reloads", async ({ page }) => {
  await page.getByRole("button", { name: planButton }).click();
  await page.locator('[data-date="2026-11-02"]').click();
  const lesson = page.getByRole("article", { name: "Quantum Physics · Lezione 4", exact: true });
  await expect(lesson).toContainText("Registrazione: 25 settembre 2026");
  await expect(lesson).toContainText("Orario da definire");
  await lesson.getByRole("button", { name: "Segna completata" }).click();
  await lesson.getByRole("button", { name: "Sposta", exact: true }).click();
  await lesson.getByLabel("Nuova data").fill("2026-12-05");
  await lesson.getByRole("button", { name: "Conferma spostamento" }).click();
  await expect(page.getByRole("dialog")).toContainText("5 dicembre 2026");
  await expect(lesson.getByRole("button", { name: "✓ Completata" })).toHaveAttribute("aria-pressed", "true");
  await lesson.getByRole("button", { name: "Modifica", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Modifica sessione" });
  await editor.getByLabel("Note", { exact: true }).fill("Esercizi da rivedere");
  await editor.getByLabel("Durata in minuti").fill("90");
  await editor.getByRole("button", { name: "Salva sessione" }).click();
  await expect(lesson).toContainText("90 min");
  await expect(lesson).toContainText("Esercizi da rivedere");
  await closeDay(page);
  await expect(page.getByTestId("quantum-progress")).toContainText("4/22");
  const stats = page.locator("section").filter({ has: page.getByText("Stats lezioni", { exact: true }) });
  await expect(stats).toContainText("Completate: 1/2");
  await calendarView(page, "Settimana").click();
  await expect(page.locator('[data-date="2026-12-05"]')).toContainText("Lezione 4");
  await expect(stats).toContainText("Completate: 1/3");
  await page.reload();
  await expect(calendarView(page, "Settimana")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: planButton }).click();
  expect((await readState(page)).sessions).toHaveLength(23);
  await page.getByLabel("Vai al mese").fill("2026-12");
  await page.locator('[data-date="2026-12-05"]').click();
  await expect(lesson.getByRole("button", { name: "✓ Completata" })).toHaveAttribute("aria-pressed", "true");
  page.once("dialog", dialog => dialog.accept());
  await lesson.getByRole("button", { name: "Elimina", exact: true }).click();
  await expect(lesson).toHaveCount(0);
  await closeDay(page);
  await page.getByRole("button", { name: planButton }).click();
  expect((await readState(page)).sessions).toHaveLength(22);
});

test("adds dated sessions and distinguishes short commitments from full days", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "+ Nuova sessione", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "Nuova sessione" });
  await editor.getByLabel("Titolo", { exact: true }).fill("Lezione 99");
  await editor.getByLabel("Data di studio", { exact: true }).fill("2030-05-14");
  await editor.getByLabel("Data registrazione (facoltativa)").fill("2030-05-10");
  await editor.getByLabel("Provvisoria", { exact: true }).check();
  await editor.getByRole("button", { name: "Salva sessione" }).click();
  await expect(page.getByRole("article", { name: "Analisi 1 · Lezione 99" })).toContainText("Provvisoria");
  await closeDay(page);
  await page.getByLabel("File impegni personali").setInputFiles(file({ version: 1, sessions: [personalActivity] }));
  await page.getByLabel("File impegni personali").setInputFiles(file({ version: 1, sessions: [personalActivity] }));
  expect((await readState(page)).sessions).toHaveLength(2);
  await calendarView(page, "Mese").click();
  await page.locator('[data-date="2030-05-14"]').click();
  await expect(page.getByRole("article", { name: "Appuntamento personale" })).toContainText("20:00 · 90 min");
  await expect(page.getByRole("article", { name: "Analisi 1 · Lezione 99" })).toBeVisible();
  await page.getByRole("button", { name: "+ Aggiungi attività in questo giorno" }).click();
  editor = page.getByRole("dialog", { name: "Nuova sessione" });
  await editor.getByLabel("Tipo attività").selectOption("free");
  await editor.getByLabel("Titolo", { exact: true }).fill("Giornata libera");
  await editor.getByLabel("Data attività").fill("2030-05-15");
  await editor.getByLabel("Giornata intera", { exact: true }).check();
  await editor.getByRole("button", { name: "Salva sessione" }).click();
  await expect(page.getByRole("article", { name: "Giornata libera" })).toContainText("Giornata intera");
  expect((await readState(page)).sessions.find((s: { title: string }) => s.title === "Giornata libera").startMinutes).toBeUndefined();
  await page.getByRole("dialog").screenshot({ path: testInfo.outputPath("day-details.png") });
});

test("restores v1 backups, shares recurring completion, exports and restores all new data", async ({ page }) => {
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await page.locator('input[type="file"]').last().setInputFiles(file({ version: 1, username: "Studente test", generalCourseNotes: "Appunti precedenti", calendarWindow: { startHour: 8, endHour: 16 }, schedule: oldSchedule }));
  await expect(page.getByText("UniTrack - Welcome Studente test")).toBeVisible();
  await expect(page.getByText("Appunti precedenti", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: planButton }).click();
  await page.locator('[data-date="2026-11-02"]').click();
  const recurring = page.getByRole("article", { name: "Corso esistente", exact: true });
  await expect(recurring.getByRole("button", { name: "✓ Completata" })).toHaveAttribute("aria-pressed", "true");
  await recurring.getByRole("button", { name: "✓ Completata" }).click();
  await closeDay(page);
  await page.getByLabel("Vai al mese").fill("2026-11");
  // Focus Monday's week before checking the original timetable.
  await page.locator('[data-date="2026-11-02"]').click();
  await closeDay(page);
  await calendarView(page, "Settimana").click();
  // The month anchor is Nov 1: move to Nov 2–8.
  await page.getByRole("button", { name: "Settimana successiva" }).click();
  const block = page.getByRole("button", { name: /Corso esistente.*9:00/ });
  await expect(block).toHaveAttribute("aria-pressed", "false");
  await block.click();
  await calendarView(page, "Mese").click();
  await page.getByLabel("File impegni personali").setInputFiles(file({ version: 1, sessions: [personalActivity] }));
  const before = await readState(page);
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica backup" }).click();
  const download = await downloadPromise;
  const payload = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(payload.version).toBe(2);
  expect(payload.calendarView).toBe("month");
  expect(payload.schedule).toEqual(before);
  await page.locator('input[type="file"]').last().setInputFiles(file(payload));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await readState(page)).toEqual(before);
  await page.getByRole("button", { name: planButton }).click();
  expect((await readState(page)).sessions).toHaveLength(24);
});

test("invalid backups do not replace existing data and unreadable local data is preserved", async ({ page }) => {
  const before = await readState(page);
  const messages: string[] = [];
  page.on("dialog", async dialog => { messages.push(dialog.message()); await dialog.accept(); });
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await page.locator('input[type="file"]').last().setInputFiles(file({ version: 2, schedule: { subjects: [], lessons: [], sessions: [{ id: "bad" }] } }));
  await expect.poll(() => messages.length).toBe(2);
  expect(await readState(page)).toEqual(before);
  await page.evaluate(key => localStorage.setItem(key, "{broken"), storageKey);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("L’originale è conservato");
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe("{broken");
});
