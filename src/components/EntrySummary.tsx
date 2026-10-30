import type { CalendarEntry } from "../types/schedule";
import { cn } from "../lib/utils";
import { formatTime } from "../lib/calendar";

export const kindLabels = { lesson: "Lezione", review: "Ripasso / esercizi", commitment: "Impegno", free: "Senza studio" };
export const kindStyles = {
  lesson: "border-violet-300 bg-violet-50 text-violet-950",
  review: "border-sky-300 bg-sky-50 text-sky-950",
  commitment: "border-amber-300 bg-amber-50 text-amber-950",
  free: "border-emerald-300 bg-emerald-50 text-emerald-950",
};

export function EntrySummary({ entry, subjectName, color, compact = false }: {
  entry: CalendarEntry; subjectName?: string; color?: string; compact?: boolean;
}) {
  const lessonNumber = /^Lezione\s+(\d+)$/i.exec(entry.title)?.[1];
  const mobileLabel = lessonNumber ? `L${lessonNumber}` : entry.kind === "review" ? "Rip." : entry.kind === "free" ? entry.title.split(" · ")[0] : entry.title;
  return (
    <span className={cn("block min-w-0 rounded-lg border-l-[3px] px-1.5 py-1 text-left", kindStyles[entry.kind], entry.completed && "ring-1 ring-inset ring-emerald-400")}
      style={entry.kind === "lesson" && color ? { borderLeftColor: color } : undefined}>
      <span className={cn("block break-words font-semibold leading-snug", compact ? "text-[10px] sm:text-sm" : "text-sm")}>
        <span className={compact ? "hidden sm:inline" : ""}>
          {entry.completed && <span aria-label="Completata">✓ </span>}{entry.title}
          {entry.provisional && <span title="Provvisoria" className="ml-0.5 text-amber-800">*</span>}
        </span>
        {compact && <span className="block truncate sm:hidden">{entry.completed && "✓ "}{mobileLabel}{entry.provisional && "*"}</span>}
      </span>
      {subjectName && entry.source === "session" && <span className={cn("mt-0.5 block truncate text-[10px] text-slate-600", compact && "hidden sm:block")}>{subjectName}</span>}
      {!compact && <span className="mt-1 block text-xs font-normal">
        {entry.allDay ? "Giornata intera" : entry.startMinutes !== undefined ? formatTime(entry.startMinutes) : "Orario da definire"}
        {entry.durationMinutes !== undefined && ` · ${entry.durationMinutes} min`}
      </span>}
    </span>
  );
}

export function CalendarLegend() {
  return <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600" aria-label="Legenda calendario">
    {Object.entries(kindLabels).map(([kind, label]) => <span key={kind} className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded border", kindStyles[kind as keyof typeof kindStyles])} />{label}
    </span>)}
    <span>* Provvisoria</span><span>✓ Completata</span>
  </div>;
}
