import * as React from "react";
import { ScheduleProvider, useScheduleStore } from "./hooks/useScheduleStore";
import { WeekCalendar } from "./components/WeekCalendar";
import { AddLessonDialog } from "./components/AddLessonDialog";
import { Button } from "./components/ui/button";

const AppContent = () => {
  const { lessons } = useScheduleStore();
  const completed = lessons.filter((lesson) => lesson.completed).length;
  const total = lessons.length;
  const [weekOffset, setWeekOffset] = React.useState(0);

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

        <WeekCalendar
          weekOffset={weekOffset}
          onPrevWeek={() => setWeekOffset((prev) => prev - 1)}
          onNextWeek={() => setWeekOffset((prev) => prev + 1)}
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
