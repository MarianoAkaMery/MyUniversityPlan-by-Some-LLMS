import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { ScheduleProvider, useScheduleStore } from "./hooks/useScheduleStore";
import { WeekCalendar } from "./components/WeekCalendar";
import { AddLessonDialog } from "./components/AddLessonDialog";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";

const CALENDAR_WINDOW_STORAGE_KEY = "unitrack-calendar-window-v1";
const MIN_VISIBLE_HOUR = 6;
const MAX_VISIBLE_HOUR = 23;

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

const AppContent = () => {
  const { subjects, lessons, isLessonCompleted, getWeekProgress } = useScheduleStore();
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [calendarWindow, setCalendarWindow] = React.useState<{ startHour: number; endHour: number } | null>(null);
  const [draftStartHour, setDraftStartHour] = React.useState("9");
  const [draftEndHour, setDraftEndHour] = React.useState("15");

  const MIN_WEEK_OFFSET = -52;
  const MAX_WEEK_OFFSET = 52;
  const { completed, total } = getWeekProgress(weekOffset);
  const weekStart = startOfWeekMonday(addDays(new Date(), weekOffset * 7));

  React.useEffect(() => {
    const raw = window.localStorage.getItem(CALENDAR_WINDOW_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { startHour?: number; endHour?: number };
      if (
        typeof parsed.startHour === "number" &&
        typeof parsed.endHour === "number" &&
        parsed.startHour >= 0 &&
        parsed.startHour <= 23 &&
        parsed.endHour > parsed.startHour &&
        parsed.endHour <= 24
      ) {
        setCalendarWindow({ startHour: parsed.startHour, endHour: parsed.endHour });
      }
    } catch {
      // Ignore malformed settings and keep auto mode.
    }
  }, []);

  const autoStartHour =
    lessons.length > 0
      ? Math.max(MIN_VISIBLE_HOUR, Math.min(MAX_VISIBLE_HOUR, Math.floor(Math.min(...lessons.map((lesson) => lesson.startMinutes)) / 60)))
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
    }
  }, [isSettingsOpen, visibleStartHour, visibleEndHour]);

  const saveWindowSettings = () => {
    const start = Number(draftStartHour);
    const end = Number(draftEndHour);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return;
    }

    const nextWindow = { startHour: start, endHour: end };
    setCalendarWindow(nextWindow);
    window.localStorage.setItem(CALENDAR_WINDOW_STORAGE_KEY, JSON.stringify(nextWindow));
    setIsSettingsOpen(false);
  };

  const resetWindowSettings = () => {
    setCalendarWindow(null);
    window.localStorage.removeItem(CALENDAR_WINDOW_STORAGE_KEY);
    setIsSettingsOpen(false);
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
            <div className="font-display text-2xl font-bold text-slate-900">UniTrack</div>
            <div className="text-sm text-slate-500">
              {completed}/{total} lezioni questa settimana
            </div>
            <div className="text-xs text-slate-400">
              Vista calendario: {formatHourLabel(visibleStartHour)} - {formatHourLabel(visibleEndHour)}
              {calendarWindow ? " (manuale)" : " (automatica)"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-10" onClick={() => setIsSettingsOpen(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Finestra
            </Button>
            <AddLessonDialog>
              <Button className="h-10">+ Aggiungi</Button>
            </AddLessonDialog>
          </div>
        </header>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finestra Calendario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                      {Array.from({ length: MAX_VISIBLE_HOUR - MIN_VISIBLE_HOUR + 2 }, (_, i) => MIN_VISIBLE_HOUR + i)
                        .map((hour) => (
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
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" onClick={resetWindowSettings}>
                  Usa Automatico
                </Button>
                <Button
                  type="button"
                  onClick={saveWindowSettings}
                  disabled={Number(draftEndHour) <= Number(draftStartHour)}
                >
                  Salva
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
