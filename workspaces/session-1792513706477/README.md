# TaskFlow

A multi-theme productivity app built with React + TypeScript and Tailwind utility classes.

## Architecture
- `src/components/App.tsx` – self-contained single-page app (types, theme class maps, state, UI).
- `src/types/index.ts` – exported interfaces for reference.
- `tests/app.test.ts` – Bun unit tests for core domain logic.

## Features
- Four themes: Cyber Neon, Warm Editorial, Glass Aurora, Minimal Slate (persisted).
- Create/edit modal: title, category, priority (Urgent/High/Medium/Low), due date, subtasks.
- Toggle tasks and subtasks, delete, clear completed.
- Search, filter tabs (All/Active/Completed/High Priority), category filter, sorting.
- List and Kanban board views with status moves.
- Productivity metrics: totals, overdue count, completion ring.
- localStorage persistence with seeded tasks.

## Verify
```
bun test
bun run build
bun run dev
```
