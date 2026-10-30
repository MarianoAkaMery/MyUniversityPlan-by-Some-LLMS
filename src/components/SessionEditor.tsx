import * as React from "react";
import { useScheduleStore } from "../hooks/useScheduleStore";
import { createId } from "../lib/id";
import type { SessionKind, StudySession } from "../types/schedule";
import { formatTime } from "../lib/calendar";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { kindLabels } from "./EntrySummary";

const fieldClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800";

export function SessionEditor({ session, date, onClose, onSaved }: {
  session?: StudySession; date: string; onClose: () => void; onSaved: (date: string) => void;
}) {
  const { subjects, saveSession } = useScheduleStore();
  const [kind, setKind] = React.useState<SessionKind>(session?.kind ?? "lesson");
  const [subjectId, setSubjectId] = React.useState(session?.subjectId ?? subjects[0]?.id ?? "");
  const [title, setTitle] = React.useState(session?.title ?? "");
  const [studyDate, setStudyDate] = React.useState(session?.studyDate ?? date);
  const [recordingDate, setRecordingDate] = React.useState(session?.recordingDate ?? "");
  const [start, setStart] = React.useState(session?.startMinutes === undefined ? "" : formatTime(session.startMinutes));
  const [duration, setDuration] = React.useState(session?.durationMinutes?.toString() ?? "");
  const [allDay, setAllDay] = React.useState(session?.allDay ?? false);
  const [notes, setNotes] = React.useState(session?.notes ?? "");
  const [completed, setCompleted] = React.useState(session?.completed ?? false);
  const [provisional, setProvisional] = React.useState(session?.provisional ?? false);
  const [error, setError] = React.useState("");
  const isStudy = kind === "lesson" || kind === "review";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const [hours, minutes] = start.split(":").map(Number);
    try {
      saveSession({ id: session?.id ?? createId(), kind, title: title.trim(), studyDate,
        subjectId: isStudy && subjectId ? subjectId : undefined,
        recordingDate: isStudy && recordingDate ? recordingDate : undefined,
        startMinutes: !allDay && start ? hours * 60 + minutes : undefined,
        durationMinutes: !allDay && duration ? Number(duration) : undefined,
        allDay, notes: notes.trim(), completed, provisional,
      });
      onSaved(studyDate);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Controlla i dati inseriti."); }
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent aria-describedby="session-help">
      <DialogHeader><DialogTitle>{session ? "Modifica sessione" : "Nuova sessione"}</DialogTitle></DialogHeader>
      <p id="session-help" className="mb-4 text-sm text-slate-500">Un’attività su una data precisa. Orario e durata possono restare da definire.</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Tipo attività<select className={fieldClass} value={kind} onChange={event => setKind(event.target.value as SessionKind)}>
            {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          {isStudy && <label className="text-sm font-medium">Materia<select className={fieldClass} value={subjectId} required={kind === "lesson"} onChange={event => setSubjectId(event.target.value)}>
            <option value="">{kind === "lesson" ? "Seleziona materia" : "Nessuna materia"}</option>
            {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select></label>}
        </div>
        {isStudy && !subjects.length && <p className="text-sm text-amber-800">Aggiungi una materia da “Orario e materie” prima di creare una lezione.</p>}
        <label className="block text-sm font-medium">Titolo<Input className="mt-1" value={title} onChange={event => setTitle(event.target.value)} placeholder="Es. Lezione 4" required maxLength={200} /></label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">{isStudy ? "Data di studio" : "Data attività"}<Input className="mt-1" type="date" min="1900-01-01" max="9999-12-31" required value={studyDate} onChange={event => setStudyDate(event.target.value)} /></label>
          {isStudy && <label className="text-sm font-medium">Data registrazione (facoltativa)<Input className="mt-1" type="date" min="1900-01-01" max="9999-12-31" value={recordingDate} onChange={event => setRecordingDate(event.target.value)} /></label>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={event => setAllDay(event.target.checked)} />Giornata intera</label>
        {!allDay && <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">Orario (facoltativo)<Input className="mt-1" type="time" value={start} onChange={event => setStart(event.target.value)} /></label>
          <label className="text-sm font-medium">Durata in minuti<Input className="mt-1" type="number" min="1" max="1440" step="1" placeholder="Da definire" value={duration} onChange={event => setDuration(event.target.value)} /></label>
        </div>}
        <label className="block text-sm font-medium">Note<textarea className={fieldClass} rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <div className="flex flex-wrap gap-5">
          {isStudy && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} />Completata</label>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={provisional} onChange={event => setProvisional(event.target.checked)} />Provvisoria</label>
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Annulla</Button><Button type="submit">Salva sessione</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
