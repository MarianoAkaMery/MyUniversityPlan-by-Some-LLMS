import * as React from "react";
import { Download, Eye, SlidersHorizontal, Upload } from "lucide-react";
import { ScheduleProvider, useScheduleStore } from "./hooks/useScheduleStore";
import { PlannerCalendar } from "./components/PlannerCalendar";
import { DayDetails } from "./components/DayDetails";
import { SessionEditor } from "./components/SessionEditor";
import { addDays, fromDateKey, isDateKey, startOfWeekMonday, toDateKey } from "./lib/calendar";
import { readBackup } from "./lib/schedule";
import { QUANTUM_PLAN_ID } from "./lib/quantumPlan";
import { AddLessonDialog } from "./components/AddLessonDialog";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import type { CalendarView, ScheduleState, StudySession } from "./types/schedule";

const CALENDAR_VIEW_STORAGE_KEY = "unitrack-calendar-view-v1";
const CALENDAR_WINDOW_STORAGE_KEY = "unitrack-calendar-window-v1";
const USERNAME_STORAGE_KEY = "unitrack-username-v1";
const COURSE_NOTES_STORAGE_KEY = "unitrack-course-notes-v1";
const CUMULATIVE_WINDOW_STORAGE_KEY = "unitrack-cumulative-window-v1";
const MIN_VISIBLE_HOUR = 6;
const MAX_VISIBLE_HOUR = 23;

type CalendarWindow = { startHour: number; endHour: number };
type CumulativeWindow = { startDate: string };

type BackupPayload = {
  version: 2;
  calendarView: CalendarView;
  exportedAt: string;
  username: string;
  courseNotes: string;
  generalCourseNotes: string;
  calendarWindow: CalendarWindow | null;
  cumulativeWindow: CumulativeWindow | null;
  schedule: ScheduleState;
};

const formatHourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const HOURS = Array.from({ length: MAX_VISIBLE_HOUR - MIN_VISIBLE_HOUR + 1 }, (_, i) =>
  MIN_VISIBLE_HOUR + i
);

const isValidCalendarWindow = (value: unknown): value is CalendarWindow => {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { startHour?: unknown; endHour?: unknown };
  return (
    typeof maybe.startHour === "number" &&
    typeof maybe.endHour === "number" &&
    maybe.startHour >= 0 &&
    maybe.startHour <= 23 &&
    maybe.endHour > maybe.startHour &&
    maybe.endHour <= 24
  );
};

const sanitizeFilename = (raw: string) => {
  const cleaned = raw.trim().replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "");
  return cleaned || "unitrack-backup";
};

const isValidCumulativeWindow = (value: unknown): value is CumulativeWindow => {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { startDate?: unknown };
  return isDateKey(maybe.startDate);
};

const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={`${match.index}-b`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={`${match.index}-i`}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${match.index}-l`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="underline text-sky-700"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const renderMarkdownPreview = (markdown: string) => {
  const lines = markdown.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{parseInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      return;
    }
    flushList();
    if (line.trim() === "") {
      blocks.push(<div key={`sp-${index}`} className="h-2" />);
    } else {
      blocks.push(
        <p key={`p-${index}`} className="leading-relaxed">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  });
  flushList();

  return blocks;
};

const AppContent = () => {
  const { subjects, lessons, sessions, importedPlans, getProgress, replaceSchedule, completedByDate, importQuantum, importPersonalActivities, storageError } = useScheduleStore();
  const [calendarDate, setCalendarDate] = React.useState(() => new Date());
  const [calendarView, setCalendarView] = React.useState<CalendarView>(() => {
    try { return window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY) === "month" ? "month" : "week"; } catch { return "week"; }
  });
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ date: string; session?: StudySession } | null>(null);
  const [notice, setNotice] = React.useState("");
  const personalInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    try { window.localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, calendarView); }
    catch { setNotice("Impossibile salvare la vista preferita in questo browser."); }
  }, [calendarView]);
  const focusDate = (date: string) => { setCalendarDate(fromDateKey(date)); setSelectedDate(date); };
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [statsMode, setStatsMode] = React.useState<"week" | "semester">("week");
  const [calendarWindow, setCalendarWindow] = React.useState<CalendarWindow | null>(null);
  const [cumulativeWindow, setCumulativeWindow] = React.useState<CumulativeWindow | null>(null);
  const [username, setUsername] = React.useState("Studente");
  const [courseNotes, setCourseNotes] = React.useState("");
  const [draftStartHour, setDraftStartHour] = React.useState("9");
  const [draftEndHour, setDraftEndHour] = React.useState("15");
  const [draftUsername, setDraftUsername] = React.useState("Studente");
  const [draftCumulativeStartDate, setDraftCumulativeStartDate] = React.useState("");
  const [notesViewMode, setNotesViewMode] = React.useState<"editor" | "formatted">("formatted");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const notesTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const weekStart = startOfWeekMonday(calendarDate);
  const periodStart = calendarView === "month" ? new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1) : weekStart;
  const periodEnd = calendarView === "month" ? new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0) : addDays(weekStart, 6);
  const { completed, total } = getProgress(toDateKey(periodStart), toDateKey(periodEnd));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  React.useEffect(() => {
    const rawWindow = window.localStorage.getItem(CALENDAR_WINDOW_STORAGE_KEY);
    if (rawWindow) {
      try {
        const parsed = JSON.parse(rawWindow) as unknown;
        if (isValidCalendarWindow(parsed)) {
          setCalendarWindow(parsed);
        }
      } catch {
        // Keep default/auto mode.
      }
    }

    const storedUsername = window.localStorage.getItem(USERNAME_STORAGE_KEY);
    if (storedUsername && storedUsername.trim()) {
      setUsername(storedUsername);
      setDraftUsername(storedUsername);
    }

    const storedCourseNotes = window.localStorage.getItem(COURSE_NOTES_STORAGE_KEY);
    if (storedCourseNotes) {
      setCourseNotes(storedCourseNotes);
    }

    const rawCumulativeWindow = window.localStorage.getItem(CUMULATIVE_WINDOW_STORAGE_KEY);
    if (rawCumulativeWindow) {
      try {
        const parsed = JSON.parse(rawCumulativeWindow) as unknown;
        if (isValidCumulativeWindow(parsed)) {
          setCumulativeWindow(parsed);
        }
      } catch {
        // Keep default range.
      }
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(USERNAME_STORAGE_KEY, username);
  }, [username]);

  React.useEffect(() => {
    window.localStorage.setItem(COURSE_NOTES_STORAGE_KEY, courseNotes);
  }, [courseNotes]);

  const autoStartHour =
    lessons.length > 0
      ? Math.max(
          MIN_VISIBLE_HOUR,
          Math.min(MAX_VISIBLE_HOUR, Math.floor(Math.min(...lessons.map((lesson) => lesson.startMinutes)) / 60))
        )
      : 9;
  const autoEndHour =
    lessons.length > 0
      ? Math.max(
          autoStartHour + 1,
          Math.min(24, Math.ceil(Math.max(...lessons.map((lesson) => lesson.endMinutes)) / 60))
        )
      : 15;

  const visibleStartHour = calendarWindow?.startHour ?? autoStartHour;
  const visibleEndHour = calendarWindow?.endHour ?? autoEndHour;

  React.useEffect(() => {
    if (isSettingsOpen) {
      setDraftStartHour(String(visibleStartHour));
      setDraftEndHour(String(visibleEndHour));
      setDraftUsername(username);
      setDraftCumulativeStartDate(cumulativeWindow?.startDate ?? "");
    }
  }, [isSettingsOpen, visibleStartHour, visibleEndHour, username, cumulativeWindow]);

  const saveSettings = () => {
    const start = Number(draftStartHour);
    const end = Number(draftEndHour);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return;
    }

    const trimmedUsername = draftUsername.trim() || "Studente";
    setUsername(trimmedUsername);

    const nextWindow = { startHour: start, endHour: end };
    setCalendarWindow(nextWindow);
    window.localStorage.setItem(CALENDAR_WINDOW_STORAGE_KEY, JSON.stringify(nextWindow));

    if (draftCumulativeStartDate) {
      const nextCumulativeWindow = {
        startDate: draftCumulativeStartDate,
      };
      setCumulativeWindow(nextCumulativeWindow);
      window.localStorage.setItem(CUMULATIVE_WINDOW_STORAGE_KEY, JSON.stringify(nextCumulativeWindow));
    } else {
      setCumulativeWindow(null);
      window.localStorage.removeItem(CUMULATIVE_WINDOW_STORAGE_KEY);
    }

    setIsSettingsOpen(false);
  };

  const resetWindowSettings = () => {
    setCalendarWindow(null);
    window.localStorage.removeItem(CALENDAR_WINDOW_STORAGE_KEY);
  };

  const resetCumulativeWindowSettings = () => {
    setCumulativeWindow(null);
    setDraftCumulativeStartDate("");
    window.localStorage.removeItem(CUMULATIVE_WINDOW_STORAGE_KEY);
  };

  const exportBackup = () => {
    const payload: BackupPayload = {
      version: 2,
      calendarView,
      exportedAt: new Date().toISOString(),
      username,
      courseNotes,
      generalCourseNotes: courseNotes,
      calendarWindow,
      cumulativeWindow,
      schedule: { schemaVersion: 2, subjects, lessons, completedByDate, sessions, importedPlans },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `${sanitizeFilename(username)}-${datePart}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const importBackupFromFile = async (file: File) => {
    const rawText = await file.text();
    const parsed = readBackup(JSON.parse(rawText));
    replaceSchedule(parsed.schedule);
    if (parsed.calendarView === "week" || parsed.calendarView === "month") setCalendarView(parsed.calendarView);

    if (typeof parsed.username === "string" && parsed.username.trim()) {
      setUsername(parsed.username.trim());
    }

    const importedNotes =
      typeof parsed.courseNotes === "string"
        ? parsed.courseNotes
        : typeof parsed.generalCourseNotes === "string"
          ? parsed.generalCourseNotes
          : null;
    if (typeof importedNotes === "string") {
      setCourseNotes(importedNotes);
    }

    if (parsed.calendarWindow === null) {
      setCalendarWindow(null);
      window.localStorage.removeItem(CALENDAR_WINDOW_STORAGE_KEY);
    } else if (isValidCalendarWindow(parsed.calendarWindow)) {
      setCalendarWindow(parsed.calendarWindow);
      window.localStorage.setItem(CALENDAR_WINDOW_STORAGE_KEY, JSON.stringify(parsed.calendarWindow));
    }

    if (parsed.cumulativeWindow === null) {
      setCumulativeWindow(null);
      window.localStorage.removeItem(CUMULATIVE_WINDOW_STORAGE_KEY);
    } else if (isValidCumulativeWindow(parsed.cumulativeWindow)) {
      setCumulativeWindow(parsed.cumulativeWindow);
      window.localStorage.setItem(CUMULATIVE_WINDOW_STORAGE_KEY, JSON.stringify(parsed.cumulativeWindow));
    }
  };

  const onImportInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    if (!window.confirm("Ripristinare questo backup? Sostituirà i dati attuali in questo browser. Scarica prima un backup se vuoi conservarli.")) return;
    try {
      await importBackupFromFile(file);
      setIsSettingsOpen(false);
      window.alert("Backup importato correttamente.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Impossibile importare il file selezionato.");
    }
  };

  const onPersonalImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      importPersonalActivities(JSON.parse(await file.text()));
      setNotice("Attività e annotazioni importate nel browser, senza duplicati. Date e completamenti esistenti sono stati mantenuti.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Impossibile importare le attività."); }
  };

  const updateCourseNotes = (nextValue: string, selectionStart?: number, selectionEnd?: number) => {
    setCourseNotes(nextValue);
    window.requestAnimationFrame(() => {
      const textarea = notesTextareaRef.current;
      if (!textarea) return;
      if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = courseNotes.slice(start, end) || "text";
    const next = `${courseNotes.slice(0, start)}${prefix}${selected}${suffix}${courseNotes.slice(end)}`;
    const caretStart = start + prefix.length;
    const caretEnd = caretStart + selected.length;
    updateCourseNotes(next, caretStart, caretEnd);
  };

  const addBulletList = () => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = courseNotes.slice(start, end);
    const content = selected || "Item";
    const bulleted = content
      .split("\n")
      .map((line) => (line.trim() ? `- ${line}` : "- "))
      .join("\n");
    const next = `${courseNotes.slice(0, start)}${bulleted}${courseNotes.slice(end)}`;
    updateCourseNotes(next, start, start + bulleted.length);
  };

  const addLink = () => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = courseNotes.slice(start, end) || "Resource";
    const url = window.prompt("Insert URL", "https://");
    if (!url) return;
    const markdownLink = `[${selected}](${url.trim()})`;
    const next = `${courseNotes.slice(0, start)}${markdownLink}${courseNotes.slice(end)}`;
    updateCourseNotes(next, start, start + markdownLink.length);
  };

  const cumulativeStartKey = cumulativeWindow?.startDate ?? toDateKey(periodStart);
  const cumulativeStartDate = fromDateKey(cumulativeStartKey);
  const cumulativeCheckpointDate = today;
  const statsStart = statsMode === "week" ? toDateKey(periodStart) : cumulativeStartKey;
  const statsEnd = statsMode === "week" ? toDateKey(periodEnd) : toDateKey(today);
  const subjectStats = subjects.map(subject => {
    const progress = getProgress(statsStart, statsEnd, subject.id);
    return { subjectId: subject.id, subjectName: subject.name, subjectColor: subject.color,
      totalLessons: progress.total, completedLessons: progress.completed, remainingLessons: progress.total - progress.completed };
  }).filter(stat => stat.totalLessons > 0).sort((a, b) => b.remainingLessons - a.remainingLessons);
  const quantumSubject = subjects.find(subject => subject.name.trim().toLowerCase() === "quantum physics");
  const quantumSessions = sessions.filter(session => session.subjectId === quantumSubject?.id && session.kind === "lesson");
  const priorQuantumCount = quantumSubject?.priorCompletedLessons?.length ?? 0;

  return (
    <div className="app-shell min-h-screen px-2 py-4 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 px-6 py-5 shadow-soft backdrop-blur">
          <div>
            <div className="font-display text-2xl font-bold text-slate-900">
              UniTrack - Welcome {username}
            </div>
            <div className="text-sm text-slate-500">{completed}/{total} lezioni completate nel {calendarView === "month" ? "mese" : "periodo"} visualizzato</div>
            <div className="text-xs text-slate-400">
              Vista calendario: {formatHourLabel(visibleStartHour)} - {formatHourLabel(visibleEndHour)}
              {calendarWindow ? " (manuale)" : " (automatica)"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="h-10" onClick={() => setIsSettingsOpen(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Impostazioni
            </Button>
            <AddLessonDialog>
              <Button variant="secondary" className="h-10">Orario e materie</Button>
            </AddLessonDialog>
            <Button className="h-10" onClick={() => setEditing({ date: selectedDate ?? toDateKey(calendarDate) })}>+ Nuova sessione</Button>
          </div>
        </header>

        {storageError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{storageError}</p>}
        <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-soft" aria-label="Piano Quantum">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="font-semibold text-slate-900">Quantum Physics · recupero lezioni</h2>
              <p className="mt-1 text-sm text-slate-600">Piano di studio dal 2 novembre al 1 dicembre 2026. L1–L3 già studiate; registrazioni L14–L22 provvisorie. Orari e durate da definire.</p>
              {quantumSubject && <p className="mt-2 text-sm font-semibold text-violet-900" data-testid="quantum-progress">{priorQuantumCount + quantumSessions.filter(session => session.completed).length}/{priorQuantumCount + quantumSessions.length} lezioni studiate · {priorQuantumCount} precedenti senza data</p>}
            </div>
            <Button onClick={() => { importQuantum(); setCalendarView("month"); setCalendarDate(new Date(2026, 10, 1)); setSelectedDate(null); setNotice(importedPlans.includes(QUANTUM_PLAN_ID) ? "Il piano Quantum è già presente. Modifiche e completamenti sono stati mantenuti." : "Piano Quantum importato. Puoi aggiungere separatamente i tuoi impegni personali."); }}>Importa piano Quantum novembre 2026</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={() => personalInputRef.current?.click()}>Importa impegni personali</Button>
            <input ref={personalInputRef} aria-label="File impegni personali" type="file" accept="application/json,.json" className="hidden" onChange={onPersonalImport} />
            <p className="text-xs text-slate-600">I dati restano in questo browser. Nessuna sincronizzazione tra dispositivi.</p>
          </div>
          {notice && <p role="status" className="mt-3 text-sm text-violet-900">{notice}</p>}
        </section>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Impostazioni</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <p className="text-sm text-slate-600">Salvataggio locale in questo browser, senza sincronizzazione tra dispositivi. Il backup JSON include anche sessioni e impegni personali; conservalo privatamente.</p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Nome utente</label>
                <Input
                  value={draftUsername}
                  onChange={(event) => setDraftUsername(event.target.value)}
                  placeholder="Es. Maria"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Ora inizio visibile</label>
                  <Select value={draftStartHour} onValueChange={setDraftStartHour}>
                    <SelectTrigger>
                      <SelectValue placeholder="Inizio" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((hour) => (
                        <SelectItem key={hour} value={String(hour)}>
                          {formatHourLabel(hour)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Ora fine visibile</label>
                  <Select value={draftEndHour} onValueChange={setDraftEndHour}>
                    <SelectTrigger>
                      <SelectValue placeholder="Fine" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: MAX_VISIBLE_HOUR - MIN_VISIBLE_HOUR + 2 },
                        (_, i) => MIN_VISIBLE_HOUR + i
                      ).map((hour) => (
                        <SelectItem key={hour} value={String(hour)}>
                          {formatHourLabel(hour)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {Number(draftEndHour) <= Number(draftStartHour) && (
                <p className="text-xs text-rose-600">L'ora di fine deve essere successiva all'ora di inizio.</p>
              )}

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div>
                  <div className="text-sm font-medium text-slate-700">Finestra stats cumulative</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Imposta da quando deve partire il conteggio cumulativo. La fine e sempre oggi.
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Data inizio</label>
                  <Input
                    type="date"
                    value={draftCumulativeStartDate}
                    onChange={(event) => setDraftCumulativeStartDate(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="ghost" onClick={resetCumulativeWindowSettings}>
                    Reset finestra cumulativa
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" onClick={resetWindowSettings}>
                  Usa finestra automatica
                </Button>
                <Button type="button" variant="secondary" onClick={exportBackup}>
                  <Download className="mr-2 h-4 w-4" />
                  Scarica backup
                </Button>
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Carica backup
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={onImportInputChange}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={saveSettings}
                  disabled={Number(draftEndHour) <= Number(draftStartHour)}
                >
                  Salva impostazioni
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-700">Stats lezioni</div>
              <div className="mt-1 text-xs text-slate-500">
                {statsMode === "week"
                  ? `Lezioni del ${calendarView === "month" ? "mese" : "periodo"} visualizzato: ${periodStart.toLocaleDateString("it-IT")} – ${periodEnd.toLocaleDateString("it-IT")}. Ripasso e impegni esclusi.`
                  : `Conteggio cumulativo dal ${cumulativeStartDate.toLocaleDateString("it-IT")} a oggi (${cumulativeCheckpointDate.toLocaleDateString("it-IT")}).`}
              </div>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setStatsMode("week")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statsMode === "week" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                }`}
              >
                {calendarView === "month" ? "Mese" : "Settimana"}
              </button>
              <button
                type="button"
                onClick={() => setStatsMode("semester")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statsMode === "semester" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                }`}
              >
                Cumulativa
              </button>
            </div>
          </div>

          {subjectStats.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna lezione pianificata nel periodo selezionato.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjectStats.map((stat) => (
                <div key={stat.subjectId} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stat.subjectColor }}
                    />
                    <span className="text-sm font-semibold text-slate-800">{stat.subjectName}</span>
                  </div>
                  {statsMode === "week" ? (
                    <>
                      <div className="text-sm text-slate-600">
                        Mancano {stat.remainingLessons}/{stat.totalLessons} lezioni da seguire
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Completate: {stat.completedLessons}/{stat.totalLessons}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-slate-700">
                        Mancano {stat.remainingLessons} lezioni
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Fatte fino a oggi: {stat.completedLessons}/{stat.totalLessons}
                      </div>
                    </>
                  )}
                  {statsMode === "semester" && (
                    <div className="mt-2 text-[11px] text-slate-400">
                      Lezioni previste fino a oggi: {stat.totalLessons}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <PlannerCalendar date={calendarDate} view={calendarView} selectedDate={selectedDate}
          visibleStartHour={visibleStartHour} visibleEndHour={visibleEndHour}
          onDateChange={date => { setCalendarDate(date); setSelectedDate(null); }} onViewChange={setCalendarView} onSelectDate={setSelectedDate} />
        {selectedDate && <DayDetails key={selectedDate} date={selectedDate} onClose={() => setSelectedDate(null)}
          onEdit={session => setEditing({ session, date: session.studyDate })} onAdd={() => setEditing({ date: selectedDate })} onMoved={focusDate} />}
        {editing && <SessionEditor key={editing.session?.id ?? editing.date} session={editing.session} date={editing.date} onClose={() => setEditing(null)} onSaved={focusDate} />}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-2 text-sm font-semibold text-slate-700">Note generali del corso</div>
          <p className="mb-3 text-xs text-slate-500">
            Scrivi qui informazioni utili su esame, criteri di valutazione e consigli del docente.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => wrapSelection("**", "**")}>
              Bold
            </Button>
            <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => wrapSelection("*", "*")}>
              Italic
            </Button>
            <Button type="button" variant="secondary" className="h-8 px-3" onClick={addBulletList}>
              Bullet List
            </Button>
            <Button type="button" variant="secondary" className="h-8 px-3" onClick={addLink}>
              Link
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3"
              onClick={() => setNotesViewMode((prev) => (prev === "editor" ? "formatted" : "editor"))}
            >
              <Eye className="mr-2 h-4 w-4" />
              {notesViewMode === "editor" ? "Formattato" : "Editor"}
            </Button>
          </div>
          {notesViewMode === "editor" ? (
            <textarea
              ref={notesTextareaRef}
              value={courseNotes}
              onChange={(event) => setCourseNotes(event.target.value)}
              placeholder="Es. **Written + oral exam**, minimum 18/30, - attendance bonus"
              className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          ) : (
            <div className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
              {courseNotes.trim() ? (
                <div className="space-y-1">{renderMarkdownPreview(courseNotes)}</div>
              ) : (
                <p className="text-slate-400">No formatted content yet.</p>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Formatting shortcuts: <span className="font-mono">**bold**</span>,{" "}
            <span className="font-mono">*italic*</span>, <span className="font-mono">- list item</span>,{" "}
            <span className="font-mono">[label](https://...)</span>
          </p>
        </section>

        <footer className="pb-2 pt-1 text-center text-xs text-slate-500">
          <a
            href="https://github.com/MarianoAkaMery/MyUniversityPlan-by-Some-LLMS"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            GitHub Repo
          </a>
          {"  |  "}
          <a
            href="https://www.linkedin.com/in/salvatore-mariano-librici-0aaab3202/"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            LinkedIn
          </a>
        </footer>
      </div>
    </div>
  );
};

const App = () => (
  <ScheduleProvider>
    <AppContent />
  </ScheduleProvider>
);

export default App;
