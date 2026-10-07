# Inkwell Publication Platform

## Overview
Inkwell is a Substack-style newsletter and publication platform built as a single-page React application with rich interactivity:

- Article feed with multi-category filtering
- Reader view modal with reading time, comments, and navigation
- Interactive article editor for drafting and publishing
- Subscription tier picker (Free, Paid, Founding Member)
- Likes and bookmarks per article
- Dark theme with Tailwind CSS

## Architecture

- **src/components/App.tsx**: Main React component implementing all features. Exports pure utility functions for calculation and creation.
- **src/types/index.ts**: TypeScript interfaces for `Article`, `Comment`, and subscription tiers.
- **tests/app.test.ts**: Unit tests for pure logic (reading time, filtering, article creation) using Bun's test runner.

### Component Hierarchy

App (single component)
├── Header (buttons for writing and subscription)
├── Category & Subscription selectors
├── Article Editor panel
├── Article Feed grid
└── Reader Modal (with comments)

## Getting Started

1. Install dependencies (React, Bun, Tailwind CSS, FontAwesome CSS loaded in HTML).
2. Build the app:

   ```bash
   bun build src/components/App.tsx
   ```

3. Run tests:

   ```bash
   bun test tests/app.test.ts
   ```

## Styling

- Dark UI using Tailwind classes (bg-slate-950, text-white, slate-800 borders).
- FontAwesome 6 icons via `<i>` tags (no external icon libraries imported in JS).

## Testing

- Pure functions tested in `tests/app.test.ts`.
- No React rendering tests; focus on business logic and utility functions.

Enjoy building with Inkwell!
