import * as React from "react";
import { Download, SlidersHorizontal, Upload } from "lucide-react";
import { ScheduleProvider, useScheduleStore } from "./hooks/useScheduleStore";
import { WeekCalendar } from "./components/WeekCalendar";
import { AddLessonDialog } from "./components/AddLessonDialog";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import type { ScheduleState } from "./types/schedule";

const CALENDAR_WINDOW_STORAGE_KEY = "unitrack-calendar-window-v1";
const USERNAME_STORAGE_KEY = "unitrack-username-v1";
const COURSE_NOTES_STORAGE_KEY = "unitrack-course-notes-v1";
const MIN_VISIBLE_HOUR = 6;
const MAX_VISIBLE_HOUR = 23;

type CalendarWindow = { startHour: number; endHour: number };

type BackupPayload = {
  version: 1;
  exportedAt: string;
  username: string;
  courseNotes: string;
  generalCourseNotes: string;
  calendarWindow: CalendarWindow | null;
  schedule: ScheduleState;
};

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
  const { subjects, lessons, isLessonCompleted, getWeekProgress, replaceSchedule, completedByDate } =
    useScheduleStore();
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [calendarWindow, setCalendarWindow] = React.useState<CalendarWindow | null>(null);
  const [username, setUsername] = React.useState("Studente");
  const [courseNotes, setCourseNotes] = React.useState("");
  const [draftStartHour, setDraftStartHour] = React.useState("9");
  const [draftEndHour, setDraftEndHour] = React.useState("15");
  const [draftUsername, setDraftUsername] = React.useState("Studente");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const notesTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const MIN_WEEK_OFFSET = -52;
  const MAX_WEEK_OFFSET = 52;
  const { completed, total } = getWeekProgress(weekOffset);
  const weekStart = startOfWeekMonday(addDays(new Date(), weekOffset * 7));

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
    }
  }, [isSettingsOpen, visibleStartHour, visibleEndHour, username]);

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
    setIsSettingsOpen(false);
  };

  const resetWindowSettings = () => {
    setCalendarWindow(null);
    window.localStorage.removeItem(CALENDAR_WINDOW_STORAGE_KEY);
  };

  const exportBackup = () => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      username,
      courseNotes,
      generalCourseNotes: courseNotes,
      calendarWindow,
      schedule: {
        subjects,
        lessons,
        completedByDate,
      },
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
    const parsed = JSON.parse(rawText) as Partial<BackupPayload>;

    if (!parsed || typeof parsed !== "object" || !parsed.schedule) {
      throw new Error("Formato backup non valido");
    }

    replaceSchedule(parsed.schedule as ScheduleState);

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
  };

  const onImportInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      await importBackupFromFile(file);
      setIsSettingsOpen(false);
      window.alert("Backup importato correttamente.");
    } catch {
      window.alert("Impossibile importare il file selezionato.");
    }
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

  const weeklyStats = subjects
    .map((subject) => {
      const subjectLessons = lessons.filter((lesson) => lesson.subjectId === subject.id);
      const totalLessons = subjectLessons.length;
      const completedLessons = subjectLessons.reduce((count, lesson) => {
        const dateKey = toDateKey(addDays(weekStart, lesson.dayIndex));
        return count + (isLessonCompleted(lesson.id, dateKey) ? 1 : 0);
      }, 0);

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        totalLessons,
        completedLessons,
        remainingLessons: totalLessons - completedLessons,
      };
    })
    .filter((item) => item.totalLessons > 0)
    .sort((a, b) => {
      if (b.remainingLessons !== a.remainingLessons) return b.remainingLessons - a.remainingLessons;
      return b.totalLessons - a.totalLessons;
    });

  return (
    <div className="app-shell min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 px-6 py-5 shadow-soft backdrop-blur">
          <div>
            <div className="font-display text-2xl font-bold text-slate-900">
              UniTrack - Welcome {username}
            </div>
            <div className="text-sm text-slate-500">{completed}/{total} lezioni questa settimana</div>
            <div className="text-xs text-slate-400">
              Vista calendario: {formatHourLabel(visibleStartHour)} - {formatHourLabel(visibleEndHour)}
              {calendarWindow ? " (manuale)" : " (automatica)"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-10" onClick={() => setIsSettingsOpen(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Impostazioni
            </Button>
            <AddLessonDialog>
              <Button className="h-10">+ Aggiungi</Button>
            </AddLessonDialog>
          </div>
        </header>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Impostazioni</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
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
          <div className="mb-3 text-sm font-semibold text-slate-700">Stats settimana</div>
          {weeklyStats.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna lezione pianificata in questa settimana.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weeklyStats.map((stat) => (
                <div key={stat.subjectId} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stat.subjectColor }}
                    />
                    <span className="text-sm font-semibold text-slate-800">{stat.subjectName}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Mancano {stat.remainingLessons}/{stat.totalLessons} lezioni da seguire
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Completate: {stat.completedLessons}/{stat.totalLessons}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <WeekCalendar
          weekOffset={weekOffset}
          visibleStartHour={visibleStartHour}
          visibleEndHour={visibleEndHour}
          canPrevWeek={weekOffset > MIN_WEEK_OFFSET}
          canNextWeek={weekOffset < MAX_WEEK_OFFSET}
          onPrevWeek={() => setWeekOffset((prev) => Math.max(MIN_WEEK_OFFSET, prev - 1))}
          onNextWeek={() => setWeekOffset((prev) => Math.min(MAX_WEEK_OFFSET, prev + 1))}
        />

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
          </div>
          <textarea
            ref={notesTextareaRef}
            value={courseNotes}
            onChange={(event) => setCourseNotes(event.target.value)}
            placeholder="Es. **Written + oral exam**, minimum 18/30, - attendance bonus"
            className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</div>
            <div className="space-y-1 text-sm text-slate-700">
              {courseNotes.trim() ? (
                renderMarkdownPreview(courseNotes)
              ) : (
                <p className="text-slate-400">Nothing to preview yet.</p>
              )}
            </div>
          </div>
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
