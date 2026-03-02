import * as React from "react";
import { ScheduleProvider, useScheduleStore } from "./hooks/useScheduleStore";
import { WeekCalendar } from "./components/WeekCalendar";
import { AddLessonDialog } from "./components/AddLessonDialog";
import { Button } from "./components/ui/button";

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

const AppContent = () => {
  const { subjects, lessons, isLessonCompleted, getWeekProgress } = useScheduleStore();
  const [weekOffset, setWeekOffset] = React.useState(0);
  const MIN_WEEK_OFFSET = -52;
  const MAX_WEEK_OFFSET = 52;
  const { completed, total } = getWeekProgress(weekOffset);
  const weekStart = startOfWeekMonday(addDays(new Date(), weekOffset * 7));

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
          </div>
          <AddLessonDialog>
            <Button className="h-10">+ Aggiungi</Button>
          </AddLessonDialog>
        </header>

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
