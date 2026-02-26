import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LessonBlock } from "./LessonBlock";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useScheduleStore } from "../hooks/useScheduleStore";
import { clamp } from "../lib/utils";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven"];
const MONTHS = [
  "gen",
  "feb",
  "mar",
  "apr",
  "mag",
  "giu",
  "lug",
  "ago",
  "set",
  "ott",
  "nov",
  "dic",
];

const START_HOUR = 9;
const END_HOUR = 12;
const HOUR_HEIGHT = 86;

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

const formatWeekRange = (start: Date, end: Date) => {
  const startLabel = `${start.getDate()} ${MONTHS[start.getMonth()]}`;
  const endLabel = `${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
};

const formatTimeLabel = (hour: number) => `${hour}:00`;

export type WeekCalendarProps = {
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

export const WeekCalendar: React.FC<WeekCalendarProps> = ({
  weekOffset,
  onPrevWeek,
  onNextWeek,
}) => {
  const { lessons, subjects, toggleLessonCompleted } = useScheduleStore();
  const today = new Date();
  const weekStart = startOfWeekMonday(addDays(today, weekOffset * 7));
  const weekEnd = addDays(weekStart, 4);
  const weekLabel = formatWeekRange(weekStart, weekEnd);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const totalHeight = hours.length * HOUR_HEIGHT;
  const isCurrentWeek = startOfWeekMonday(today).getTime() === weekStart.getTime();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">{weekLabel}</div>
          {isCurrentWeek && (
            <div className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Oggi
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-9 w-9 rounded-full p-0" onClick={onPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-9 w-9 rounded-full p-0" onClick={onNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[64px_repeat(5,1fr)]">
        <div />
        {DAYS.map((label, index) => {
          const dayDate = addDays(weekStart, index);
          const isToday =
            isCurrentWeek &&
            today.getDate() === dayDate.getDate() &&
            today.getMonth() === dayDate.getMonth();
          return (
            <div key={label} className="flex flex-col items-start gap-1 border-b border-slate-200 pb-3">
              <span className="text-sm font-semibold text-slate-700">{label}</span>
              <Badge variant={isToday ? "default" : "muted"}>
                {dayDate.getDate()}
              </Badge>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-[64px_repeat(5,1fr)]">
        <div className="flex flex-col justify-between text-xs text-slate-400" style={{ height: totalHeight }}>
          {hours.map((hour) => (
            <div key={hour} className="h-[86px]">
              {formatTimeLabel(hour)}
            </div>
          ))}
        </div>
        <div className="col-span-5 grid grid-cols-5 border-l border-slate-200">
          {DAYS.map((_, dayIndex) => (
            <div
              key={dayIndex}
              className="relative border-r border-slate-200"
              style={{ height: totalHeight }}
            >
              <div className="absolute inset-0 flex flex-col">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-[86px] border-b border-dashed border-slate-200/70"
                  />
                ))}
              </div>
              {lessons
                .filter((lesson) => lesson.dayIndex === dayIndex)
                .map((lesson) => {
                  const subject = subjects.find((item) => item.id === lesson.subjectId);
                  if (!subject) return null;
                  const startOffset = (lesson.startMinutes - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                  const rawHeight = (lesson.endMinutes - lesson.startMinutes) * (HOUR_HEIGHT / 60);
                  const top = clamp(startOffset, 0, totalHeight - 10);
                  const height = clamp(rawHeight, 24, totalHeight - top);
                  return (
                    <LessonBlock
                      key={lesson.id}
                      lesson={lesson}
                      subject={subject}
                      top={top + 6}
                      height={height - 12}
                      onToggle={toggleLessonCompleted}
                    />
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
