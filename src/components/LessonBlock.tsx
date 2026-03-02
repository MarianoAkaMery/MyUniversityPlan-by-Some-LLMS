import * as React from "react";
import type { Lesson, Subject } from "../types/schedule";
import { cn } from "../lib/utils";

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
};

type LessonBlockProps = {
  lesson: Lesson;
  subject: Subject;
  top: number;
  height: number;
  left: string;
  width: string;
  onToggle: (lessonId: string) => void;
};

export const LessonBlock: React.FC<LessonBlockProps> = ({
  lesson,
  subject,
  top,
  height,
  left,
  width,
  onToggle,
}) => {
  return (
    <button
      type="button"
      onClick={() => onToggle(lesson.id)}
      aria-pressed={lesson.completed}
      className={cn(
        "lesson-card absolute rounded-2xl p-3 text-left text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        lesson.completed && "opacity-70 grayscale"
      )}
      style={{
        top,
        height,
        left,
        width,
        backgroundColor: subject.color,
      }}
    >
      <div className="text-sm font-semibold">{subject.name}</div>
      <div className="text-xs opacity-90">
        {formatTime(lesson.startMinutes)} - {formatTime(lesson.endMinutes)}
      </div>
      {lesson.notes && (
        <div className="mt-1 max-h-8 overflow-hidden text-[11px] leading-snug text-white/90">
          {lesson.notes}
        </div>
      )}
      {lesson.completed && (
        <div className="mt-2 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
          ✓ Fatta
        </div>
      )}
      {lesson.completed && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-black/10" />
      )}
    </button>
  );
};
