import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarView } from "../types/schedule";
import { addDays, fromDateKey, shiftMonth, startOfWeekMonday, toDateKey } from "../lib/calendar";
import { Button } from "./ui/button";
import { MonthCalendar } from "./MonthCalendar";
import { WeekCalendar } from "./WeekCalendar";
import { CalendarLegend } from "./EntrySummary";

export function PlannerCalendar({ date, view, selectedDate, visibleStartHour, visibleEndHour, onDateChange, onViewChange, onSelectDate }: {
  date: Date; view: CalendarView; selectedDate: string | null; visibleStartHour: number; visibleEndHour: number;
  onDateChange: (date: Date) => void; onViewChange: (view: CalendarView) => void; onSelectDate: (date: string) => void;
}) {
  const start = startOfWeekMonday(date);
  const label = view === "month" ? date.toLocaleDateString("it-IT", { month: "long", year: "numeric" }) :
    `${start.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })} – ${addDays(start, 6).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}`;
  const move = (delta: number) => onDateChange(view === "month" ? shiftMonth(date, delta) : addDays(date, delta * 7));
  return <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-soft sm:p-5" aria-labelledby="calendar-heading">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
      <h2 id="calendar-heading" className="text-lg font-semibold capitalize text-slate-900">{label}</h2>
      <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Vista calendario">
        <Button variant={view === "week" ? "default" : "ghost"} aria-pressed={view === "week"} onClick={() => onViewChange("week")}>Settimana</Button>
        <Button variant={view === "month" ? "default" : "ghost"} aria-pressed={view === "month"} onClick={() => onViewChange("month")}>Mese</Button>
      </div>
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-1">
        <Button variant="secondary" aria-label={view === "month" ? "Mese precedente" : "Settimana precedente"} onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => onDateChange(new Date())}>Oggi</Button>
        <Button variant="secondary" aria-label={view === "month" ? "Mese successivo" : "Settimana successiva"} onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">Vai al mese<input aria-label="Vai al mese" className="min-w-0 rounded-lg border border-slate-200 p-2 text-sm" type="month" min="1900-01" max="9999-12" value={toDateKey(date).slice(0, 7)} onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) onDateChange(fromDateKey(`${event.target.value}-01`)); }} /></label>
    </div>
    <div className="mb-4 px-1"><CalendarLegend /></div>
    {view === "month" ? <MonthCalendar date={date} selectedDate={selectedDate} onSelectDate={onSelectDate} /> :
      <WeekCalendar date={date} visibleStartHour={visibleStartHour} visibleEndHour={visibleEndHour} onSelectDate={onSelectDate} />}
    <p className="mt-3 px-1 text-xs text-slate-500">Seleziona un giorno per vedere i dettagli e gestire le attività. Gli impegni non cancellano le lezioni già pianificate.</p>
  </section>;
}
