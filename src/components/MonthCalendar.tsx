import { useScheduleStore } from "../hooks/useScheduleStore";
import { DAYS, formatDate, monthDays, toDateKey } from "../lib/calendar";
import { cn } from "../lib/utils";
import { EntrySummary } from "./EntrySummary";

export function MonthCalendar({ date, selectedDate, onSelectDate }: {
  date: Date; selectedDate: string | null; onSelectDate: (date: string) => void;
}) {
  const { getEntries, subjects } = useScheduleStore();
  const today = toDateKey(new Date());
  return <div aria-label="Calendario mensile" className="overflow-hidden rounded-xl border border-slate-200">
    <div className="grid grid-cols-7 bg-slate-50">
      {DAYS.map(day => <div key={day} className="py-3 text-center text-xs font-semibold text-slate-600">{day}</div>)}
    </div>
    <div className="grid grid-cols-7">
      {monthDays(date).map(day => {
        const key = toDateKey(day);
        const entries = getEntries(key);
        const isToday = key === today;
        return <button type="button" key={key} data-date={key} aria-label={`${formatDate(key)}, ${entries.length} attività`}
          aria-current={isToday ? "date" : undefined} aria-pressed={key === selectedDate}
          onClick={() => onSelectDate(key)}
          className={cn("flex min-h-28 min-w-0 flex-col items-stretch justify-start border-r border-t border-slate-200 p-1 text-left transition hover:bg-slate-50 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 sm:min-h-36 sm:p-2",
            day.getMonth() !== date.getMonth() && "bg-slate-50/80", key === selectedDate && "bg-violet-50/60", isToday && "bg-sky-50/50")}>
          <span className={cn("mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold sm:mb-2 sm:h-8 sm:w-8 sm:text-sm",
            isToday ? "bg-slate-900 text-white" : day.getMonth() === date.getMonth() ? "text-slate-800" : "text-slate-500")}>
            {day.getDate()}
          </span>
          <span className="block space-y-1">
            {entries.slice(0, 3).map(entry => {
              const subject = subjects.find(item => item.id === entry.subjectId);
              return <EntrySummary key={`${entry.source}-${entry.id}`} entry={entry} subjectName={subject?.name} color={subject?.color} compact />;
            })}
            {entries.length > 3 && <span className="block px-1 text-[10px] font-semibold text-slate-600 sm:text-xs">+{entries.length - 3} altre</span>}
          </span>
        </button>;
      })}
    </div>
  </div>;
}
