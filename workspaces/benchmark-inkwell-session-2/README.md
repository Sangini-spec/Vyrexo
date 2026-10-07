# Inkwell Substack Publication Platform

## Overview
Inkwell is a modern Substack-like publication platform that allows users to read, compose, and publish articles. It features an article feed, category filters, a reader view modal with reading time, an article composer, paid subscriber tiers, and comments.

## Features
- **Article Feed**: Browse articles by category.
- **Categories Filter**: Filter articles by specific categories.
- **Reader View Modal**: View articles with reading time and comments.
- **Article Composer**: Draft and publish new articles.
- **Subscription Tiers**: Choose between Free, $8/mo Paid, and Founding Member tiers.
- **Comments**: Engage with articles through comments.

## Component Hierarchy
- `App.tsx`: Main component containing the entire application logic and UI.
- `types/index.ts`: TypeScript interfaces for data models.

## Testing
- Tests are located in `tests/app.test.ts`.
- Run tests using the command: `bun test tests/app.test.ts`.

## Getting Started
1. Clone the repository.
2. Install dependencies using `bun install`.
3. Run the application with `bun build src/components/App.tsx`.
4. Open the application in your browser to explore the features.
