import { LessonBlock } from "./LessonBlock";
import { useScheduleStore } from "../hooks/useScheduleStore";
import { clamp, cn } from "../lib/utils";
import { addDays, DAYS, formatDate, startOfWeekMonday, toDateKey } from "../lib/calendar";
import { packLessonsForDay } from "../lib/packLessons";
import { EntrySummary } from "./EntrySummary";

const HOUR_HEIGHT = 86;
const LESSON_GAP_X = 6;

export function WeekCalendar({ date, visibleStartHour, visibleEndHour, onSelectDate }: {
  date: Date; visibleStartHour: number; visibleEndHour: number; onSelectDate: (date: string) => void;
}) {
  const { lessons, subjects, getEntries, isLessonCompleted, toggleLessonCompleted } = useScheduleStore();
  const startHour = Math.max(0, Math.min(23, visibleStartHour));
  const endHour = Math.max(startHour + 1, Math.min(24, visibleEndHour));
  const today = toDateKey(new Date());
  const weekStart = startOfWeekMonday(date);
  const dates = DAYS.map((_, index) => toDateKey(addDays(weekStart, index)));
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const totalHeight = hours.length * HOUR_HEIGHT;
  const subjectsById = new Map(subjects.map(subject => [subject.id, subject]));

  return <div aria-label="Calendario settimanale" className="space-y-5">
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Sessioni e impegni della settimana</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {dates.map((key, index) => {
          const entries = getEntries(key).filter(entry => entry.source === "session");
          return <button type="button" key={key} data-date={key} onClick={() => onSelectDate(key)} aria-label={`${formatDate(key)}, dettagli giorno`}
            aria-current={key === today ? "date" : undefined}
            className={cn("flex min-w-0 flex-col items-stretch rounded-xl border border-slate-200 p-2 text-left hover:bg-slate-50 focus-visible:outline-violet-500", key === today && "border-sky-400 bg-sky-50/40")}>
            <span className="mb-2 block text-sm font-semibold text-slate-700">{DAYS[index]} {Number(key.slice(-2))}{key === today && " · Oggi"}</span>
            <span className="block space-y-1.5">{entries.map(entry => <EntrySummary key={entry.id} entry={entry} subjectName={subjectsById.get(entry.subjectId ?? "")?.name} color={subjectsById.get(entry.subjectId ?? "")?.color} />)}</span>
            {!entries.length && <span className="text-xs text-slate-500">Nessuna sessione</span>}
          </button>;
        })}
      </div>
    </div>
    <div>
      <h3 className="mb-1 text-sm font-semibold text-slate-700">Orario ricorrente</h3>
      <p className="mb-3 text-xs text-slate-500">Tocca una lezione per completarla. Su schermi piccoli scorri l’orario in orizzontale.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 p-3" tabIndex={0} aria-label="Orario ricorrente, scorrimento orizzontale">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[54px_repeat(7,1fr)]">
            <div />
            {dates.map((key, index) => <button type="button" key={key} onClick={() => onSelectDate(key)} className="border-b border-slate-200 pb-3 text-sm font-semibold text-slate-700" aria-label={`Dettagli ${formatDate(key)}`}>{DAYS[index]} {Number(key.slice(-2))}</button>)}
          </div>
          <div className="mt-3 grid grid-cols-[54px_repeat(7,1fr)]">
            <div className="text-xs text-slate-500" style={{ height: totalHeight }}>{hours.map(hour => <div key={hour} className="h-[86px]">{hour}:00</div>)}</div>
            <div className="col-span-7 grid grid-cols-7 border-l border-slate-200">
              {dates.map((key, dayIndex) => {
                const visibleStartMinutes = startHour * 60;
                const visibleEndMinutes = endHour * 60;
                const dayLessons = lessons.filter(lesson => lesson.dayIndex === dayIndex && lesson.endMinutes > visibleStartMinutes && lesson.startMinutes < visibleEndMinutes);
                return <div key={key} className="relative border-r border-slate-200" style={{ height: totalHeight }}>
                  <div className="absolute inset-0 flex flex-col">{hours.map(hour => <div key={hour} className="h-[86px] border-b border-dashed border-slate-200/70" />)}</div>
                  {packLessonsForDay(dayLessons).map(({ lesson, column, columnCount }) => {
                    const subject = subjectsById.get(lesson.subjectId);
                    if (!subject) return null;
                    const clippedStart = Math.max(lesson.startMinutes, visibleStartMinutes);
                    const clippedEnd = Math.min(lesson.endMinutes, visibleEndMinutes);
                    const top = clamp((clippedStart - visibleStartMinutes) * HOUR_HEIGHT / 60, 0, totalHeight - 10);
                    const height = clamp((clippedEnd - clippedStart) * HOUR_HEIGHT / 60, 24, totalHeight - top);
                    const width = `calc((100% - ${(columnCount + 1) * LESSON_GAP_X}px) / ${columnCount})`;
                    const left = `calc(${LESSON_GAP_X}px + ${column} * ((100% - ${(columnCount + 1) * LESSON_GAP_X}px) / ${columnCount} + ${LESSON_GAP_X}px))`;
                    return <LessonBlock key={lesson.id} lesson={lesson} subject={subject} top={top + 3} height={Math.max(20, height - 6)} left={left} width={width}
                      completed={isLessonCompleted(lesson.id, key)} onToggle={() => toggleLessonCompleted(lesson.id, key)} />;
                  })}
                </div>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
