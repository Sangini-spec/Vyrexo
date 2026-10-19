# Pomodoro Focus Timer: Quick Sprint Preset

A React + TypeScript Pomodoro timer with task management. This update adds a **15-minute Quick Sprint** preset to the timer controls.

## What's new

- **Quick Sprint 15m** button in the timer controls: one click switches to sprint mode, loads 15:00, and starts the countdown immediately.
- New **Quick Sprint** mode tab alongside Focus, Short Break, and Long Break (violet theme, bolt icon).
- Sprint counts as a work session: it increments the session counter, credits the active task's pomodoro count, adds 15 minutes (not a hard-coded 25) to the Focused-time stat, and triggers the normal break cycle (long break after every 4th session).
- Task detail modal gains a **Sprint on this** action that sets the task active and launches a Quick Sprint.

## Architecture

- `src/components/App.tsx`: self-contained client component (timer, tasks, filters, modal, toasts) using `useState`, `useEffect`, `useMemo`, `useCallback`. Tailwind utility classes plus FontAwesome 6 via CDN.
- `src/types/index.ts`: shared domain types (`Mode`, `Priority`, `Task`, `TimerState`, `TaskFilter`).
- `tests/app.test.ts`: pure-logic unit tests (formatting, sprint preset state, session accounting, progress, filtering, duration invariants).

## Features

- Four timer modes with start/pause/resume/reset and progress bar
- Quick Sprint one-click preset
- Task CRUD with priority, notes, active-task selection, completion toggle
- Search plus status and priority filtering
- Detail modal with editable notes
- Toast feedback and live document title countdown

## Verification

```bash
bun install
bun test tests/app.test.ts
bun build src/components/App.tsx
```
