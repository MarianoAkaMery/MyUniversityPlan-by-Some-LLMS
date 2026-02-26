import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useScheduleStore } from "../hooks/useScheduleStore";

const DAYS = [
  { label: "Lunedì", value: 0 },
  { label: "Martedì", value: 1 },
  { label: "Mercoledì", value: 2 },
  { label: "Giovedì", value: 3 },
  { label: "Venerdì", value: 4 },
];

const timeOptions = Array.from({ length: 24 }, (_, hour) => {
  const values = [0, 30].map((minute) => {
    const label = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    return { label, value: hour * 60 + minute };
  });
  return values;
}).flat();

const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

export const AddLessonDialog: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subjects, addSubject, addLesson } = useScheduleStore();
  const [subjectName, setSubjectName] = React.useState("");
  const [subjectColor, setSubjectColor] = React.useState("#60a5fa");
  const [selectedSubject, setSelectedSubject] = React.useState<string>(
    subjects[0]?.id ?? ""
  );
  const [selectedDay, setSelectedDay] = React.useState("0");
  const [startTime, setStartTime] = React.useState("540");
  const [endTime, setEndTime] = React.useState("600");
  const [lessonNotes, setLessonNotes] = React.useState("");
  const canAddLesson = Boolean(selectedSubject) && Number(startTime) < Number(endTime);

  React.useEffect(() => {
    if (!selectedSubject && subjects[0]) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  const handleAddSubject = () => {
    if (!subjectName.trim()) return;
    addSubject({ name: subjectName.trim(), color: subjectColor });
    setSubjectName("");
  };

  const handleAddLesson = () => {
    const start = Number(startTime);
    const end = Number(endTime);
    if (!selectedSubject || start >= end) return;
    addLesson({
      subjectId: selectedSubject,
      dayIndex: Number(selectedDay),
      startMinutes: start,
      endMinutes: end,
      notes: lessonNotes.trim(),
    });
    setLessonNotes("");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestisci Orario</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="lesson">
          <TabsList>
            <TabsTrigger value="lesson">Nuova Lezione</TabsTrigger>
            <TabsTrigger value="subjects">Materie</TabsTrigger>
          </TabsList>
          <TabsContent value="lesson">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Materia</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Giorno</label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona il giorno" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Ora inizio</label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Inizio" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Ora fine</label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Fine" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Verrà aggiunta una lezione da {formatMinutes(Number(startTime))} a{" "}
                {formatMinutes(Number(endTime))}.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Note (opzionale)</label>
                <Input
                  placeholder="Es. Portare appunti, capitolo 3"
                  value={lessonNotes}
                  onChange={(event) => setLessonNotes(event.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleAddLesson} disabled={!canAddLesson}>
                Aggiungi Lezione
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="subjects">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Nome materia</label>
                <Input
                  placeholder="Es. Economia"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Colore</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={subjectColor}
                    onChange={(event) => setSubjectColor(event.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white"
                  />
                  <div className="text-sm text-slate-500">
                    {subjectColor.toUpperCase()}
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={handleAddSubject}>
                +
              </Button>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="text-sm font-medium text-slate-700">{subject.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{subject.color}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
