# UniTrack

UniTrack is a weekly and monthly planner for university students, built with **React + TypeScript + Vite**, styled with **Tailwind CSS** and shadcn/ui-inspired components.

It is designed for fast day-to-day usage: add subjects, schedule lessons, track completion week by week, keep course notes, and backup everything to a JSON file.

## Live Features

- Week / month selector, Monday–Sunday calendars, month/year navigation and Today button
- Preferred view saved locally; day details with completion and session actions
- Weekly recurring timetable, plus dated sessions and commitments (including weekends)
- Overlapping lessons rendered side-by-side
- Click lesson to toggle completion (`Done` state)
- Subject management (name + color)
- Add lesson flow with subject/day/time/notes
- Weekly/monthly and cumulative stats by subject, using the same completion data as both calendars
- Dated lessons with separate study/recording dates, optional time and duration, notes and provisional status
- Edit, move and delete individual sessions; moving a session preserves its completion
- Distinct styles for lessons, review/exercises, commitments and days without study
- Explicit, repeatable Quantum November 2026 academic-plan import
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
- `src/components/MonthCalendar.tsx` -> Monday–Sunday month grid
- `src/components/PlannerCalendar.tsx` -> shared navigation and view selector
- `src/components/DayDetails.tsx`, `SessionEditor.tsx` -> dated activity management
- `src/components/LessonBlock.tsx` -> lesson card rendering
- `src/components/AddLessonDialog.tsx` -> lesson/subject management modal
- `src/hooks/useScheduleStore.tsx` -> central state + persistence
- `src/types/schedule.ts` -> domain types
- `src/lib/utils.ts` -> shared helpers
- `src/lib/calendar.ts` -> local calendar dates, occurrences and shared progress calculations
- `src/lib/schedule.ts` -> migration, validation and backup/personal-file import
- `src/lib/quantumPlan.ts` -> academic plan (no personal commitments)

## Data Persistence

UniTrack stores data in the browser using `localStorage`.

Saved entities include:

- subjects
- lessons
- completion-by-date map
- dated sessions (completion is attached to the stable session ID)
- previously studied lesson numbers without invented dates
- imported-plan markers and preferred calendar view
- calendar window settings
- username
- course notes

If browser storage is cleared, data is removed unless you restore from backup.

There is **no synchronization between devices** and no backend. Export a backup to transfer data manually. Private activities and backup files should not be committed to Git. `.local/`, test screenshots and test reports are ignored.

The existing `unitrack-schedule-v1` localStorage key is retained. Schema version 2 adds `sessions` and `importedPlans`; old data receives empty arrays without changing subjects, recurring lessons or completion history. The earliest boolean lesson completions migrate to the current week's occurrence. Invalid stored data is retained without overwriting it; the app displays a recovery message.

## Backup and Restore

From `Settings` you can:

- **Download backup** -> exports a full JSON snapshot
- **Upload backup** -> restores all app data

Version 2 backups include schedule data, dated sessions, private commitments, previous study, import markers, completion history, username, preferred view, calendar/cumulative windows and general course notes. Version 1 backups remain supported, including the `generalCourseNotes` field. Invalid or unsupported backups are rejected before changing the schedule. Restore replaces browser data after confirmation; personal-file import merges instead.

## Quantum plan and private activities

Click **Importa piano Quantum novembre 2026** to add L4–L22 and the four review/exercise slots. L1–L3 are recorded as already studied without assigning dates. L14–L22 have provisional recording dates. Unknown start times and durations remain unset. Existing courses are preserved, and repeating the import preserves edits, moves, completions and deletions. The plan marker also survives backup/restore.

The course progress summary includes previous study. Weekly/monthly/cumulative statistics count dated and recurring lessons within the displayed interval; previous study without a date, reviews and personal events are not counted as dated lessons.

Use **Importa impegni personali** to select a private JSON file with this structure:

```json
{
  "version": 1,
  "sessions": [
    {
      "id": "my-stable-activity-id",
      "kind": "commitment",
      "title": "Attività personale",
      "studyDate": "2030-05-14",
      "allDay": false,
      "notes": "",
      "completed": false,
      "provisional": false
    }
  ]
}
```

This is a fictional example. `kind` can be `lesson`, `review`, `commitment` or `free`. Lessons require an existing `subjectId`. Optional fields are `recordingDate` (`YYYY-MM-DD`), `startMinutes` (minutes after midnight) and `durationMinutes`. A full-day activity has `allDay: true` and no time/duration. An activity with an unknown time has `allDay: false` and no start time, so it does not imply a full-day commitment. Activities do not remove existing lessons.

Personal import merges by stable ID and leaves existing entries unchanged, even after a move. Files are read in the browser and are never uploaded. Store actual personal files outside Git, for example in `.local/`.

To add a planning note to an existing session, a private file can also contain `"sessionNotes": [{ "sessionId": "existing-session-id", "note": "Optional alternative date to evaluate" }]`. These annotations append to existing notes without duplicating text, changing the date or resetting completion. They never create another session. Import the related plan first: a missing target or invalid annotation rejects the entire import, preserving the current data. To use an alternative date, select **Sposta** on the existing session.

## Verification

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

If Chrome is already installed, set `PLAYWRIGHT_CHANNEL=chrome` instead of installing Chromium (PowerShell: `$env:PLAYWRIGHT_CHANNEL = 'chrome'`). The browser tests run desktop and mobile viewport projects with a fixed date and fictional personal data. They cover navigation, Today, persistence, session CRUD/moves, shared progress, old backups, round trips, malformed data and duplicate imports. They save local screenshots for visual inspection; these are excluded from Git.

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
