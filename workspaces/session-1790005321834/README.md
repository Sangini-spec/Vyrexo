# RailGo — High-Speed Train & Railway Booking Platform

Production autonomous application scaffolded and verified by Vyrexo.

## Project Structure
- `src/components/App.tsx` — Primary interactive application interface and state logic
- `src/types/index.ts` — TypeScript domain interfaces and data contracts
- `src/main.tsx` — React 19 DOM hydration entry point
- `src/styles/globals.css` — Tailwind CSS stylesheet
- `tests/app.test.ts` — Automated unit test suite (`bun test`)
- `index.html` & `vite.config.ts` — Standalone local development server configuration

## Local Development in VS Code
```bash
npm install
npm run dev    # Starts local Vite server on http://localhost:5173
bun test       # Runs unit test suite
```
