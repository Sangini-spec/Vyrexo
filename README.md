# Vyrexo

> A voice-first conversational AI software engineering platform. Talk to Rex the way you would talk to a senior engineer teammate, and it plans, codes, debugs, previews, tests, and deploys your software in real time.

Vyrexo turns full-stack software development into a natural, interruptible voice conversation backed by an interactive workspace studio. Instead of wrestling with text prompts across disconnected tools, you speak naturally to **Rex**—and a dual-engine, multi-agent AI architecture coordinates real-time voice dialogue, multi-file code synthesis, live debugging, interactive app previews, local VS Code synchronization, and one-click GitHub & Vercel deployments.

---

## Table of Contents

- [What is Vyrexo](#what-is-vyrexo)
- [Dual-Engine AI Architecture](#dual-engine-ai-architecture)
- [What We Have Achieved (Key Updates)](#what-we-have-achieved-key-updates)
- [Core Features](#core-features)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Usage & Workflow](#usage--workflow)
- [Local VS Code Integration](#local-vs-code-integration)
- [GitHub & Vercel Deployment Pipeline](#github--vercel-deployment-pipeline)
- [Design Philosophy](#design-philosophy)
- [Contributing](#contributing)

---

## What is Vyrexo

Vyrexo is a voice-driven AI software engineering environment that lets developers build, debug, inspect, and ship complete software projects through natural spoken conversation. Activated by the wake word **"Rex"** (or push-to-talk), the developer can describe a product from scratch, ask architectural questions, attach screenshots or documents, debug live errors, or interrupt mid-execution to redirect the build.

Behind the voice interface is a **six-agent engineering pipeline** (**Planner**, **Coder**, **Executor**, **Tester**, **Reviewer**, and **Documenter**) paired with a live **Replit-style Workspace Studio**. As Rex speaks with you, you can watch files materialize in the File Explorer, inspect and edit code, interact with a live rendered preview of your application, open the entire folder directly in your local **VS Code** desktop editor, or push the repository to **GitHub** and **Vercel**.

---

## Dual-Engine AI Architecture

Vyrexo separates **real-time conversational intelligence & voice synthesis** from **deep code generation, debugging, and project implementation**, routing each workload to the best-in-class foundation model:

| Capability | Primary AI Engine | Role in Vyrexo |
|---|---|---|
| **Coding, Debugging & Project Implementation** | **Anthropic Claude API (`Claude Sonnet 5.5` / `claude-sonnet-5-5`)** | Synthesizes production multi-file applications (`React`, `Next.js`, `TypeScript`, `Tailwind CSS`), performs live code debugging, fixes build/deployment errors, writes automated unit tests (`bun:test`), and powers Vercel & in-studio live application implementations. |
| **Conversational Intelligence & Reasoning** | **Google Gemini API (`Gemini 2.5 Flash` & `Gemini 2.5 Pro`)** | Drives real-time conversational dialogue, wake-word intent classification, multi-turn session memory, emotion-aware response adaptation, architectural whiteboarding, and continuous action narration. |
| **Neural Voice Synthesis (TTS)** | **ElevenLabs API (`eleven_turbo_v2_5`)** + **Gemini / Edge-TTS Fallback** | Streams ultra-low-latency, human-like expressive voice responses across 8 curated voices and 4 accents (US, UK, Indian, Australian), automatically falling back to Gemini TTS / Microsoft Edge Neural TTS if quota is reached. |
| **Speech Recognition (STT)** | **Web Speech API & OpenAI Whisper** | Captures continuous hands-free speech with wake-word detection (`"Rex"`), noise gating, and mid-sentence interruption handling. |

---

## What We Have Achieved (Key Updates)

Compared to the initial prototype, Vyrexo has evolved into a complete, production-ready voice-first software engineering studio:

1. **Anthropic Claude Sonnet 5.5 (`claude-sonnet-5-5`) for Coding, Debugging & Vercel Implementation**
   - Integrated dedicated server-side Anthropic Claude Sonnet 5.5 coding and debugging orchestration (`frontend/src/lib/claude/coding-agent.ts`).
   - Synthesizes complete, self-contained, interactive applications (SaaS dashboards, e-commerce stores, food delivery platforms, scientific calculators, landing pages) rather than static placeholders.
   - Handles iterative debugging, code refactoring, security auditing, and automated test generation.

2. **Google Gemini + ElevenLabs Conversational Voice Pipeline**
   - Combines **Google Gemini** for fast, context-aware conversational turns and intent routing with **ElevenLabs (`eleven_turbo_v2_5`)** for expressive, natural spoken responses.
   - Includes automatic multi-provider voice failover (`ElevenLabs` $\rightarrow$ `Gemini TTS` $\rightarrow$ `Edge-TTS` $\rightarrow$ `Browser SpeechSynthesis`) so Rex never loses its voice during a session.

3. **Interactive 4-Panel Workspace Studio (`Chat`, `Files`, `Task`, `Preview`)**
   - **Chat Tab**: Full conversation transcript with Markdown formatting, image/document attachments, and high-contrast syntax-aware file and code chips optimized for both **Light Mode** and **Dark Mode**.
   - **Files Tab**: Live collapsible file tree and code inspector showing every file written or modified by Claude in real time.
   - **Task Tab**: Live multi-agent execution timeline tracking the **Planner**, **Coder**, **Executor**, **Tester**, **Reviewer**, and **Documenter**.
   - **Preview Tab**: Built-in live application sandbox (`/api/preview/[sessionId]`) that compiles and renders the generated React/Tailwind project immediately inside the browser.

4. **One-Click Local VS Code Folder Launch & Desktop Sync**
   - Clicking **VS Code** smoothly opens the local VS Code desktop editor directly to the connected project directory (`vscode://file/C:/Users/hp/OneDrive/Desktop/<project-folder>`).
   - Automatically materializes the entire project file tree and `.code-workspace` configuration onto disk, plus provides a one-click `.cmd` Desktop launcher and terminal sync command so the full folder structure appears immediately inside local VS Code.

5. **Built-In GitHub Push & CI/CD Automation**
   - Direct GitHub integration (`/api/github/push`) using the GitHub Git Trees REST API for atomic multi-file commits.
   - Automatically strips `.env` secrets, generates a `.gitignore`, and scaffolds a production `.github/workflows/ci-cd.yml` pipeline alongside `Dockerfile`, `vercel.json`, and `render.yaml`.

6. **Standalone Production Build & Cloud Deployment Readiness**
   - Unified Next.js 15 App Router server runtime (`output: "standalone"`) with automated build-artifact verification (`prepare-standalone.mjs` & `ensure-build.mjs`), ready for zero-config deployment on **Vercel**, **Google Cloud Run**, **Render**, or **Docker**.

---

## Core Features

### Voice-First Interaction & Wake Word ("Rex")
Activate Rex hands-free by saying **"Rex"** anywhere in your speech (`"Hey Rex"`, `"OK Rex"`, or `"Rex, build..."`), or use `Space` for push-to-talk. Rex listens continuously, filters background noise, and responds immediately with natural neural speech.

### Claude-Powered Multi-File Coding & Live Debugging
When you ask Rex to build a feature or fix a bug, **Anthropic Claude Sonnet 5.5 (`claude-sonnet-5-5`)** architects the domain model (`src/types/*`), builds interactive UI components (`src/components/App.tsx`), configures `package.json`, writes executable unit tests (`tests/app.test.ts`), and updates project documentation (`README.md`).

### Interruptible Execution
Speak at any point while Rex is working to redirect the task. Saying *"Wait, Rex—use OAuth instead of JWT"* or *"Add a dark mode toggle to the navbar"* pauses current execution, checkpoints state, updates the plan, and seamlessly incorporates your new instructions.

### Continuous Action Narration
Every step—planning architecture, authoring components, running unit tests, auditing security, or pushing to GitHub—is narrated concisely by Rex through ElevenLabs neural TTS while updating the visual Agent Timeline.

### Emotion-Aware Adaptation
Vyrexo analyzes conversational cues to detect frustration, confusion, urgency, or flow state:
- **Frustrated / Stuck**: Patient, step-by-step debugging explanations.
- **In Flow**: Concise, high-speed execution updates.
- **Exploring / Brainstorming**: Collaborative architectural trade-off discussions.

### Five Conversational Engineering Modes
- **Normal Mode**: Default full-stack conversational coding and project generation.
- **Debug Mode**: Focused root-cause analysis, stack-trace inspection, and live bug patching via Claude Sonnet 5.5 (`claude-sonnet-5-5`).
- **Rubber Duck Mode**: Rex listens quietly while you think out loud, interjecting only when it spots a logical flaw or edge case.
- **Ship It Mode**: Runs the end-to-end verification, security scan, test suite, and deployment pipeline.
- **Whiteboard Mode**: Interactive system architecture design and component breakdown.

### Adaptive Light & Dark Themes
Switch effortlessly between **Obsidian Dark Mode** and **High-Contrast Daylight Mode**. All chat bubbles, inline file references, code blocks, and workspace panels automatically adapt for crisp readability.

---

## How It Works

1. **Voice Capture & Transcription**: Speech enters via the browser microphone (Web Speech API / Whisper STT) or text/multimodal input bar.
2. **Intent & Emotion Analysis (Google Gemini)**: The Conversation Engine classifies whether the user is engaging in conversation, asking a codebase question, requesting a new software build, debugging an issue, or interrupting an active task.
3. **Multi-Agent Orchestration**:
   - **Planner Agent**: Deconstructs the user's request into a structured project specification and step-by-step execution plan.
   - **Coder Agent (Anthropic Claude Sonnet 5.5 / `claude-sonnet-5-5`)**: Synthesizes and debugs production TypeScript/React/Next.js source files.
   - **Executor Agent**: Materializes workspace files, manages dependencies, and updates the live preview runtime.
   - **Tester Agent**: Generates and executes unit tests (`bun:test`) against the generated logic.
   - **Reviewer Agent**: Runs static governance checks, secret redaction, and security audits (`/api/security`).
   - **Documenter Agent**: Generates comprehensive `README.md`, `vercel.json`, `Dockerfile`, and CI/CD workflows.
4. **Live Studio & Voice Feedback (ElevenLabs + Gemini)**: While files stream into the **Files** and **Preview** tabs, **Gemini** formulates a natural spoken update and **ElevenLabs** streams the neural audio back to the user, synchronized with the 3D animated Voice Orb.

---

## System Architecture

Vyrexo is built on a hybrid **Next.js 15 Full-Stack App Router + Python FastAPI** architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VYREXO FRONTEND & STUDIO UI                          │
│   Next.js 15 + React 19 + Tailwind CSS 4 + 3D Voice Orb + Light/Dark Theme  │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│  Voice Orb &     │  Chat Transcript │  File Explorer & │  Live App Preview  │
│  Wake-Word ("Rex")│  + Attachments   │  VS Code Launcher│  + Deploy Center   │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴─────────┬──────────┘
         │                  │                  │                   │
         ▼                  ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED ORCHESTRATION & API LAYER                        │
│  • /api/chat          (Conversation Routing + Multi-Agent Execution)        │
│  • /api/voice/tts     (ElevenLabs Neural TTS + Gemini/Edge-TTS Failover)    │
│  • /api/projects/*    (Workspace Materialization, Local VS Code & ZIP Sync) │
│  • /api/preview/*     (Sandboxed Live React/Tailwind Application Runner)    │
│  • /api/github/push   (Atomic Git Trees Push + Secret Guard + CI/CD Gen)    │
│  • /api/deploy        (Vercel, Render, Docker & Cloud Run Deployment)       │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│   CONVERSATION & VOICE INTELLIGENCE   │ │  CODING, DEBUGGING & EXECUTION    │
│  • Google Gemini API (2.5 Flash/Pro)  │ │  • Anthropic Claude Sonnet 5.5    │
│  • ElevenLabs API (eleven_turbo_v2_5) │ │  • Multi-File Project Synthesizer │
│  • Emotion & Intent Classifier        │ │  • Automated Test & Security Audit│
└───────────────────────────────────────┘ └───────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Coding & Debugging AI Engine** | **Anthropic Claude API (`Claude Sonnet 5.5` / `claude-sonnet-5-5`)** |
| **Conversational AI Engine** | **Google Gemini API (`Gemini 2.5 Flash` & `Gemini 2.5 Pro`)** |
| **Primary Text-to-Speech (TTS)** | **ElevenLabs API (`eleven_turbo_v2_5`)** |
| **Fallback Text-to-Speech** | **Google Gemini TTS, Microsoft Edge-TTS & Web Speech API** |
| **Speech-to-Text (STT)** | **Browser Web Speech API & OpenAI Whisper** |
| **Frontend & Full-Stack Runtime** | **Next.js 15 (App Router, Standalone Build), React 19, TypeScript 5.7** |
| **Python Multi-Agent Backend** | **Python 3.11+, FastAPI, LangGraph, Uvicorn** |
| **Styling & Theme System** | **Tailwind CSS 4 (Adaptive Dark & Light Themes)** |
| **Database & Authentication** | **Supabase (PostgreSQL + Supabase Auth with Email & OAuth)** |
| **Vector Context & RAG** | **ChromaDB + Tree-sitter AST Chunking** |
| **IDE Integration** | **VS Code (`vscode://` URI + `.code-workspace` + 1-Click Local Desktop Sync)** |
| **Deployment & CI/CD** | **Vercel, GitHub Actions CI/CD, Docker, Render, Google Cloud Run** |

---

## Project Structure

```text
Vyrexo/
├── frontend/
│   ├── scripts/
│   │   ├── prepare-standalone.mjs           # Standalone build packaging for cloud deployments
│   │   └── ensure-build.mjs                 # Build verification & artifact readiness script
│   └── src/
│       ├── app/
│       │   ├── page.tsx                     # Interactive landing page
│       │   ├── auth/                        # Supabase login & signup pages
│       │   ├── app/page.tsx                 # Main Vyrexo Voice Studio & Workspace UI
│       │   ├── settings/page.tsx            # Voice, accent, speed & AI provider settings
│       │   └── api/
│       │       ├── chat/                    # Dual-engine chat & agent orchestrator (Gemini + Claude)
│       │       ├── voice/                   # ElevenLabs TTS & voice synthesis endpoints
│       │       ├── projects/                # File tree, file reader, ZIP export & local VS Code sync
│       │       ├── preview/[sessionId]/     # Live interactive application preview renderer
│       │       ├── github/                  # GitHub status & atomic repository push API
│       │       ├── deploy/                  # Vercel, Render & Docker deployment center
│       │       ├── testing/                 # Automated unit test runner
│       │       └── security/                # Governance & secret-redaction audit API
│       ├── components/
│       │   ├── voice/                       # 3D animated WebGL/Canvas Voice Orb
│       │   ├── agents/                      # Multi-agent step timeline
│       │   └── shared/                      # RightPanel (Chat, Files, Task, Preview), Sidebar, TopBar
│       ├── hooks/                           # useVoice, useWebSocket, useAudioPlayer
│       └── lib/
│           ├── claude/coding-agent.ts       # Anthropic Claude Sonnet coding & debugging engine
│           ├── ai-provider-config.ts        # ElevenLabs & AI provider management
│           ├── project-export.ts            # Workspace materialization, CI/CD & VS Code config generator
│           ├── vscode-launcher.ts           # Local VS Code folder URI & Desktop sync helpers
│           └── security/governance.ts       # Secret redaction & environment validation
├── backend/
│   └── src/vyrexo/
│       ├── main.py                          # FastAPI multi-agent server entry point
│       ├── voice/                           # Whisper STT, TTS providers & emotion middleware
│       ├── conversation/                    # Intent classification & dialogue memory
│       ├── agents/                          # LangGraph orchestrator & 6 specialized agents
│       ├── context/                         # ChromaDB RAG indexer & file watcher
│       └── integrations/vscode.py           # Local VS Code CLI bridge
├── .env.example                             # Environment variable template (safe for GitHub)
├── package.json                             # Root workspace build & start scripts
└── README.md                                # Project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm**
- **Python 3.11+** (optional, if running the standalone FastAPI LangGraph worker)
- API Keys:
  - **Anthropic API Key** (`ANTHROPIC_API_KEY`) for Claude Sonnet coding, debugging, and project implementation
  - **Google Gemini API Key** (`GEMINI_API_KEY`) for conversational intelligence and reasoning
  - **ElevenLabs API Key** (`ELEVENLABS_API_KEY`) for neural voice synthesis
  - **Supabase Project URL & Anon Key** (optional, for cloud session persistence and authentication)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/Sangini-spec/Vyrexo.git
cd Vyrexo
```

2. **Install dependencies:**

```bash
npm install
cd frontend && npm install && cd ..
```

3. **Configure environment variables:**

```bash
cp .env.example .env
cp .env.example frontend/.env.local
```

Open `.env` (and `frontend/.env.local`) and add your `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and `ELEVENLABS_API_KEY`.

### Running Locally

Start the unified Next.js full-stack studio server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

*(Optional)* If you also want to run the Python FastAPI backend service simultaneously:

```bash
cd backend
pip install -e .
PYTHONPATH=src python -m uvicorn vyrexo.main:app --host 127.0.0.1 --port 8001 --reload
```

---

## Configuration & Environment Variables

All configuration is managed via `.env` (never committed to GitHub; `.env.example` provides the template):

### Core AI & Voice Keys

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | **Anthropic Claude API key** used for multi-file code synthesis, live debugging, test generation, and Vercel/workspace project implementation. |
| `ANTHROPIC_CODING_MODEL` | Primary Anthropic coding model identifier (default: `claude-sonnet-5-5`). |
| `GEMINI_API_KEY` | **Google Gemini API key** used for real-time voice conversation, intent classification, emotion detection, and task planning. |
| `ELEVENLABS_API_KEY` | **ElevenLabs API key** (also supports `ELEVEN_LABS_API_KEY`) for ultra-low-latency neural voice output (`eleven_turbo_v2_5`). |
| `ELEVENLABS_MODEL` | ElevenLabs voice synthesis model (default: `eleven_turbo_v2_5`). |
| `LLM_MODEL_LIGHT` | Fast conversational Gemini model (default: `gemini-2.5-flash`). |
| `LLM_MODEL_HEAVY` | Deep reasoning Gemini model (default: `gemini-2.5-pro`). |

### Database, Auth & Integrations

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for authentication and session sync. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key. |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://...`). |
| `GITHUB_TOKEN` | *(Optional)* Default GitHub Personal Access Token (`repo`, `workflow` scopes) for one-click repository pushes. |

---

## Usage & Workflow

1. **Start or Select a Session**: Open the studio at `/app` and create a new session or select a previous project from the left sidebar.
2. **Connect a Local Folder (Optional)**: Click **Connect Folder** in the top bar to link a folder from your machine (e.g., `C:\Users\hp\OneDrive\Desktop\<your-folder>`).
3. **Talk to Rex**:
   - Say **"Rex"** followed by your instruction, or type/attach files in the bottom bar.
   - Example voice commands:
     - *"Rex, build a modern SaaS analytics dashboard with KPI cards, interactive revenue charts, and a filterable customer table."*
     - *"Rex, debug the checkout modal and add promo code validation."*
     - *"Rex, run the automated test suite and tell me if anything fails."*
     - *"Rex, push this project to GitHub with a CI/CD pipeline."*
4. **Inspect, Preview & Edit**:
   - Use the **Chat** tab to read formatted explanations and click file chips.
   - Use the **Files** tab to browse the complete directory tree and inspect generated source code.
   - Use the **Preview** tab to interact with the live running application inside the studio.
5. **Customize Voice & Theme**:
   - Toggle between **Light Mode** and **Dark Mode** in the top navigation bar.
   - Visit **Settings** (`/settings`) to choose from 8 curated voices across 4 accents (US, UK, Indian, Australian) and adjust speech playback speed.

---

## Local VS Code Integration

Vyrexo lets you transition from voice conversation to your local **VS Code** desktop IDE in a single click:

- Clicking the **VS Code** button in the top bar triggers the `vscode://file/...` protocol pointed directly at your local Desktop project path (`C:\Users\hp\OneDrive\Desktop\<project-folder>`).
- If you generated a new project in the cloud/browser session, Vyrexo provides a **1-Click Local Sync (`.cmd`) Launcher** and terminal sync command that downloads and extracts the entire file tree (plus a pre-configured `<project>.code-workspace` file) directly into your Desktop folder and opens VS Code with the full file Explorer tree expanded.

---

## GitHub & Vercel Deployment Pipeline

Vyrexo includes a built-in **GitHub Push** and **Deployment Center** inside the **Files** tab:

- **Secret Protection**: Automatically filters out `.env`, `.env.local`, and runtime credential files before any commit—only `.env.example` templates are allowed.
- **Automated CI/CD Scaffolding**: Generates `.github/workflows/ci-cd.yml` for linting, TypeScript type-checking, Bun unit testing, and production build verification.
- **Vercel & Cloud Run Ready**: Every project includes `vercel.json`, `Dockerfile`, and `render.yaml` configurations, and Vyrexo itself compiles into a self-contained Next.js standalone artifact (`npm run build`).

---

## Design Philosophy

- **Voice is Primary, Visual Studio is Immediate**: Speak naturally as if pair-programming with a teammate, while having full visual control over files, diffs, terminal output, and live previews.
- **Best Model for Every Job**: Use **Google Gemini + ElevenLabs** for sub-second, emotionally intelligent voice conversation, and **Anthropic Claude Sonnet 5.5 (`claude-sonnet-5-5`)** for uncompromising code quality, debugging accuracy, and full project implementation.
- **Developer Stays in Control**: Rex narrates every action, supports instant voice interruption, protects secrets from ever being committed, and syncs cleanly with your local VS Code workflow and GitHub repositories.

---

## Contributing

Issues and pull requests are welcome! To contribute:

1. Fork the repository (`https://github.com/Sangini-spec/Vyrexo`).
2. Create a feature branch (`git checkout -b feat/your-feature`).
3. Commit your changes and ensure `npm run build` succeeds.
4. Open a Pull Request describing your changes.

---

Built for developers who want to talk to their AI teammate—and ship real software.
