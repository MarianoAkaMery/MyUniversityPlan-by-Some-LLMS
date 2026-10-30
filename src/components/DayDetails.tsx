import * as React from "react";
import type { StudySession } from "../types/schedule";
import { useScheduleStore } from "../hooks/useScheduleStore";
import { formatDate, formatTime, isDateKey } from "../lib/calendar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { kindLabels, kindStyles } from "./EntrySummary";
import { cn } from "../lib/utils";

export function DayDetails({ date, onClose, onEdit, onAdd, onMoved }: {
  date: string; onClose: () => void; onEdit: (session: StudySession) => void; onAdd: () => void; onMoved: (date: string) => void;
}) {
  const { getEntries, subjects, sessions, toggleEntry, removeSession, moveSession } = useScheduleStore();
  const [movingId, setMovingId] = React.useState<string | null>(null);
  const [moveDate, setMoveDate] = React.useState(date);
  const entries = getEntries(date);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent aria-describedby="day-help">
      <DialogHeader><DialogTitle>{formatDate(date)}</DialogTitle></DialogHeader>
      <p id="day-help" className="mb-4 text-sm text-slate-500">Lezioni, impegni e tempo per te.</p>
      <div className="space-y-3">
        {!entries.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nessuna attività pianificata.</p>}
        {entries.map(entry => {
          const subject = subjects.find(item => item.id === entry.subjectId);
          return <article key={`${entry.source}-${entry.id}`} className={cn("rounded-xl border p-4", kindStyles[entry.kind])} aria-label={subject && entry.source === "session" ? `${subject.name} · ${entry.title}` : entry.title}>
            <div className="text-xs font-medium">{kindLabels[entry.kind]}{entry.source === "recurring" && " · Ricorrente"}{entry.provisional && " · Provvisoria"}</div>
            <h3 className="mt-1 break-words text-base font-bold">{subject && entry.source === "session" ? `${subject.name} · ${entry.title}` : entry.title}</h3>
            <div className="mt-1 text-sm">{entry.allDay ? "Giornata intera" : entry.startMinutes !== undefined ? formatTime(entry.startMinutes) : "Orario da definire"}{entry.durationMinutes !== undefined && ` · ${entry.durationMinutes} min`}</div>
            {entry.recordingDate && <p className="mt-1 text-sm">Registrazione: {formatDate(entry.recordingDate)}</p>}
            {entry.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(entry.kind === "lesson" || entry.kind === "review") && <Button variant="secondary" aria-pressed={entry.completed} onClick={() => toggleEntry(entry)}>{entry.completed ? "✓ Completata" : "Segna completata"}</Button>}
              {entry.source === "session" && <>
                <Button variant="ghost" onClick={() => { const session = sessions.find(item => item.id === entry.id); if (session) onEdit(session); }}>Modifica</Button>
                <Button variant="ghost" onClick={() => { setMovingId(entry.id); setMoveDate(date); }}>Sposta</Button>
                <Button variant="ghost" className="text-rose-700" onClick={() => { if (window.confirm(`Eliminare “${entry.title}”?`)) removeSession(entry.id); }}>Elimina</Button>
              </>}
            </div>
            {movingId === entry.id && <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); if (isDateKey(moveDate)) { moveSession(entry.id, moveDate); setMovingId(null); onMoved(moveDate); } }}>
              <label className="text-sm">Nuova data<Input className="mt-1" type="date" min="1900-01-01" max="9999-12-31" required value={moveDate} onChange={event => setMoveDate(event.target.value)} /></label>
              <Button type="submit">Conferma spostamento</Button><Button type="button" variant="ghost" onClick={() => setMovingId(null)}>Annulla</Button>
            </form>}
          </article>;
        })}
      </div>
      <Button className="mt-4 w-full" onClick={onAdd}>+ Aggiungi attività in questo giorno</Button>
    </DialogContent>
  </Dialog>;
}
