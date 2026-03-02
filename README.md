# UniTrack

UniTrack is a weekly lesson planner for university students, built with **React + TypeScript + Vite**, styled with **Tailwind CSS** and shadcn/ui-inspired components.

It is designed for fast day-to-day usage: add subjects, schedule lessons, track completion week by week, keep course notes, and backup everything to a JSON file.

## Live Features

- Weekly calendar (Mon-Fri) with week navigation
- Overlapping lessons rendered side-by-side
- Click lesson to toggle completion (`Done` state)
- Subject management (name + color)
- Add lesson flow with subject/day/time/notes
- Weekly stats by subject
- General course notes with mini markdown editor (`bold`, `italic`, bullets, links)
- Notes view switch (`Editor` / `Formatted`)
- Configurable visible calendar time window
- User greeting in header (`Welcome <Name>`)
- Full backup/export and restore/import

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI primitives (Dialog, Tabs, Select, etc.)
- localStorage persistence (no backend)

## Project Structure

- `src/components/ui/*` -> reusable UI primitives
- `src/components/WeekCalendar.tsx` -> weekly timetable grid
- `src/components/LessonBlock.tsx` -> lesson card rendering
- `src/components/AddLessonDialog.tsx` -> lesson/subject management modal
- `src/hooks/useScheduleStore.tsx` -> central state + persistence
- `src/types/schedule.ts` -> domain types
- `src/lib/utils.ts` -> shared helpers

## Data Persistence

UniTrack stores data in the browser using `localStorage`.

Saved entities include:

- subjects
- lessons
- completion-by-date map
- calendar window settings
- username
- course notes

If browser storage is cleared, data is removed unless you restore from backup.

## Backup and Restore

From `Settings` you can:

- **Download backup** -> exports a full JSON snapshot
- **Upload backup** -> restores all app data

The backup includes schedule data, completion history, username, calendar window, and general course notes.

The exported filename is generated from the username, for example:

- `Maria-2026-03-02.json`

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Deploy on Vercel

This is a standard Vite SPA and can be deployed directly on Vercel.

1. Push repository to GitHub.
2. Import project in Vercel.
3. Framework preset: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.

## Notes

- No backend/database is used.
- All data is local-first.
- Use regular backups if you rely on browser-only storage.

## Links

- Repository: https://github.com/MarianoAkaMery/MyUniversityPlan-by-Some-LLMS
- LinkedIn: https://www.linkedin.com/in/salvatore-mariano-librici-0aaab3202/
