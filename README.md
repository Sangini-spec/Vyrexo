# Vyrexo

> A voice-first conversational AI coding assistant. Talk to it the way you would talk to a teammate, and it builds your software for you.

Vyrexo turns software development into a conversation. Instead of typing prompts into a chat box or wrestling with text editors, you speak naturally, and a multi-agent AI system plans, codes, tests, reviews, and documents your project while narrating every step. Think of it as a JARVIS for developers, built entirely on free and open-source technology.

---

## Table of Contents

- [What is Vyrexo](#what-is-vyrexo)
- [Why It Exists](#why-it-exists)
- [Core Features](#core-features)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Design Philosophy](#design-philosophy)
- [Contributing](#contributing)

---

## What is Vyrexo

Vyrexo is a voice-driven AI coding assistant that lets developers build complete software projects through natural conversation. The system is activated by saying "Rex" (its assistant name), after which the developer can describe what they want, ask questions about their codebase, interrupt mid-task to redirect, or simply think out loud while Rex listens.

Behind the voice interface is a multi-agent orchestration system. Six specialized AI agents work together under the hood, each handling a different part of the development workflow. There is a Planner that breaks down high-level instructions into concrete steps, a Coder that writes the actual source files, an Executor that runs terminal commands and installs packages, a Tester that generates and runs test suites, a Reviewer that audits the code for security and quality issues, and a Documenter that produces README files and API documentation as you go.

What makes Vyrexo different from existing voice tools is that voice is the primary interface, not an afterthought. Tools like Wispr Flow or Willow are speech-to-text input layers that still rely on a text-based AI underneath. Cursor and Aider treat voice as a side feature on top of text-first products. Vyrexo flips this around. The voice layer drives everything, including a full multi-agent orchestrator with real-time interruption, narration, and emotion-aware adaptation.

## Why It Exists

Modern AI coding assistants have made software development significantly faster, but they all share the same limitation. They are text-based. You type a prompt, you get code back, you type another prompt, you wait again. This works, but it does not feel collaborative. It does not feel like having a teammate.

Voice changes that. When you can talk to your coding agent the way you would talk to another developer, the interaction becomes natural. You can interrupt. You can think out loud. You can hear what the AI is doing and react in real time. The cognitive overhead drops, and software development starts to feel less like operating a tool and more like working with a partner.

Vyrexo was built to make that vision real, and to do it without requiring expensive subscriptions. Every component in the stack is free or open source, from the speech recognition to the AI reasoning to the database. The total API cost is zero.

## Core Features

### Voice-First Interaction
The developer activates Rex with the wake word "Rex" anywhere in their speech, then talks normally. The system listens continuously, transcribes through Whisper running locally on the developer's machine, and responds through Microsoft Edge's neural voices. There is no typing involved at any point in the core workflow.

### Multi-Agent Orchestration
Six AI agents coordinate through LangGraph to handle different aspects of development. The Planner decomposes voice instructions into structured task plans. The Coder writes and modifies source code. The Executor runs commands and manages dependencies. The Tester generates test cases and runs them. The Reviewer audits for security vulnerabilities and quality issues. The Documenter creates README files and architecture summaries.

### Interruptible Execution
At any point during a task, the developer can speak and the system stops what it is doing, re-plans based on the new input, and continues. If Rex is in the middle of writing authentication code and the developer says "Wait, use OAuth instead of JWT", the system pauses, updates the plan, and resumes with the new approach. This makes the interaction feel like real pair programming rather than rigid command execution.

### Continuous Action Narration
Rex narrates what it is doing as it does it. When it installs a dependency, it says so. When it runs a test, it announces the result. When it commits code, it tells the developer. There are no silent operations. The developer always knows what is happening, which builds trust and makes it easy to step in if something goes wrong.

### Codebase Context Awareness
The system indexes the entire project directory into a ChromaDB vector database using AST-aware chunking. This means when the developer asks "where is the authentication logic?", Rex returns the precise files and functions that handle authentication, even in a large codebase. Context retrieval is incremental, with a file watcher updating the index as files change.

### Emotion-Aware Adaptation
Rex analyzes vocal cues and conversational patterns to detect frustration, confusion, or urgency, then adapts its response style accordingly. A frustrated developer gets clearer, more patient explanations. A developer in flow gets terse, fast responses. A confused developer gets step-by-step breakdowns. This is built into the conversation manager and applies across all agent interactions.

### Conversational Modes
The interaction state machine supports five distinct modes that change how Rex behaves. Normal mode is the default conversational coding flow. Debug mode focuses on live troubleshooting. Rubber Duck mode has Rex listen silently while the developer thinks out loud, only interjecting on detected logical flaws. Ship It mode runs the full deployment pipeline end to end. Whiteboard mode generates architecture diagrams in real time as the developer describes the system.

### IDE Integration
Vyrexo connects to VS Code so developers can visually inspect code as it is being written. Files open automatically, changes appear in real time, and the developer can switch fluidly between speaking to Rex and looking at the actual code.

### Git Workflow
Voice commands handle all common git operations. Saying "commit the changes" creates a commit with a generated message. Saying "push to main" pushes the branch. Saying "review my changes" walks through the diff verbally. Branching, merging, and pull request creation all work the same way.

### Automated Documentation
As features are built, the Documenter agent generates README files, API documentation, and architecture summaries automatically. This means projects built with Vyrexo come with complete documentation by default rather than as an afterthought.

## How It Works

The user flow is simple. The developer launches the system, connects it to a project directory, and starts talking. Behind the scenes, the system goes through this loop on every voice command.

Speech enters through the microphone and is captured by the browser. The audio stream travels over a WebSocket to the FastAPI backend, where the Voice Pipeline runs it through Whisper for transcription. The transcribed text passes through a middleware chain that filters noise, detects emotional state, and checks for interruption signals.

The Conversation Manager classifies the intent. Is this a command to build something, a question about the codebase, casual conversation, a mode switch, or an interrupt request? Based on intent, the system either responds directly or routes the request to the Agent Orchestrator.

The Agent Orchestrator runs a LangGraph DAG. The Planner agent runs first, decomposing the request into a structured plan. A router examines each step in the plan and dispatches it to the appropriate specialized agent. Each agent calls Gemini through the LangChain integration, executes any required tools (file operations, shell commands, git actions), and returns updated state.

As the agents work, the system publishes events to a central Event Bus. The frontend subscribes to these events through the WebSocket connection, updating the agent timeline, narration display, and orb animation in real time. The backend simultaneously generates a TTS response that streams back to the browser for playback.

If the developer interrupts at any point, the InterruptMiddleware detects speech during execution, the Orchestrator checkpoints its current state, and the new instruction gets processed as a redirect. The system can resume from the checkpoint or replan entirely depending on how different the new instruction is.

## System Architecture

Vyrexo follows a layered, event-driven architecture designed to support all current features while remaining extensible for future enhancements without breaking existing code.

At the highest level, the developer interacts with a Next.js frontend through voice. The frontend captures audio via the Web Speech API and maintains a persistent WebSocket connection to a Python FastAPI backend. The backend acts as the central coordinator, receiving voice input, managing sessions, and routing all communication through an asynchronous Event Bus that uses pub/sub semantics with pattern matching.

Five core modules subscribe to events on the bus. The Voice Pipeline handles speech-to-text and text-to-speech with a composable middleware chain in between. The Conversation Manager tracks dialogue state, classifies intent, and maintains memory across turns. The Agent Orchestrator runs the LangGraph multi-agent pipeline. The Context Engine indexes the codebase and provides semantic search through ChromaDB. The Mode State Machine governs interaction modes.

At the bottom of the stack, six specialized agents call out to Google's Gemini 2.5 model and operate through thirteen development tools that act on the developer's local machine. External services include Gemini for AI reasoning, Supabase for PostgreSQL persistence, ChromaDB for vector storage, and VS Code for IDE integration.

The architecture's key insight is that components do not call each other directly. They communicate through the Event Bus, which means new features can be added by subscribing to events without modifying existing code. Agents register through a plugin decorator pattern, so adding a new agent type requires creating one Python file. The LLM provider is abstracted behind a factory, so swapping from Gemini to another model means changing one configuration variable.

## Tech Stack

The entire stack is free or open source. Total API cost is zero.

| Layer | Technology |
|-------|-----------|
| AI Engine (heavy reasoning) | Gemini 2.5 Pro (free tier, 100 RPD) |
| AI Engine (light tasks) | Gemini 2.5 Flash (free tier, 500 RPD) |
| Agent Framework | LangGraph + langchain-google-genai |
| Backend Framework | Python 3.11+, FastAPI, Uvicorn |
| Speech-to-Text | Whisper (local) |
| Text-to-Speech | Edge-TTS (Microsoft Neural Voices) |
| Vector Database | ChromaDB |
| Relational Database | Supabase PostgreSQL |
| Frontend Framework | Next.js 15, React 19 |
| Styling | Tailwind CSS 4 |
| State Management | Zustand |
| Authentication | Supabase Auth (Email + OAuth) |
| Real-time Transport | WebSocket |
| File Watching | watchdog |
| Code Parsing | tree-sitter |
| IDE Integration | VS Code CLI |

## Project Structure

```
vyrexo/
├── backend/
│   └── src/vyrexo/
│       ├── main.py                          # FastAPI app entry point
│       ├── config.py                        # Pydantic settings
│       ├── api/
│       │   ├── routes/                      # REST endpoints
│       │   └── websocket/                   # WebSocket handler + protocol
│       ├── voice/
│       │   ├── pipeline.py                  # Voice pipeline orchestrator
│       │   ├── stt/                         # Whisper STT provider
│       │   ├── tts/                         # Edge-TTS provider
│       │   └── middleware/                  # Noise gate, emotion, interrupt
│       ├── conversation/
│       │   ├── manager.py                   # Conversation manager
│       │   ├── intent.py                    # Intent classifier
│       │   └── memory/                      # Memory store implementations
│       ├── agents/
│       │   ├── registry.py                  # Plugin-based agent registry
│       │   ├── orchestrator.py              # LangGraph orchestrator
│       │   ├── llm_factory.py               # Model-agnostic LLM factory
│       │   ├── tools/                       # File ops, terminal, git
│       │   └── implementations/             # 6 agent implementations
│       ├── context/
│       │   ├── engine.py                    # Context engine
│       │   ├── indexer.py                   # ChromaDB indexer
│       │   ├── retriever.py                 # RAG retriever
│       │   └── watcher.py                   # File system watcher
│       ├── events/
│       │   └── bus.py                       # Async event bus
│       ├── modes/
│       │   ├── machine.py                   # Interaction state machine
│       │   └── implementations/             # Mode implementations
│       ├── integrations/
│       │   └── vscode.py                    # VS Code workspace sync
│       └── storage/
│           ├── database.py                  # PostgreSQL connection
│           ├── models.py                    # SQLAlchemy models
│           └── repositories/                # Data access layer
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                     # JARVIS-style landing page
│       │   ├── auth/                        # Login and signup pages
│       │   ├── app/                         # Main application
│       │   └── settings/                    # Voice settings page
│       ├── components/
│       │   ├── voice/                       # Animated voice orb
│       │   ├── agents/                      # Agent timeline
│       │   └── shared/                      # Sidebar, status bar, mode indicator
│       ├── hooks/                           # useVoice, useWebSocket, useAudioPlayer
│       └── lib/                             # Supabase client, auth context, ws-protocol
├── shared/                                  # Shared schemas
├── .env.example                             # Environment variable template
└── README.md                                # This file
```

## Getting Started

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- A Google AI Studio account for a free Gemini API key
- A Supabase account for the free PostgreSQL database

### Installation

Clone the repository.

```bash
git clone https://github.com/Sangini-spec/Vyrexo.git
cd Vyrexo
```

Install backend dependencies.

```bash
cd backend
pip install -e .
```

Install frontend dependencies.

```bash
cd ../frontend
npm install
```

Set up environment variables. Copy `.env.example` to `.env` in the project root, then fill in your credentials.

```bash
cp .env.example .env
```

You will need to add your Gemini API key, your Supabase database URL, your Supabase project URL, and your Supabase anonymous key. The `.env.example` file documents all required variables with comments.

### Running the Servers

Start the backend (port 8001).

```bash
cd backend
PYTHONPATH=src python -m uvicorn vyrexo.main:app --host 127.0.0.1 --port 8001 --reload
```

Start the frontend in a separate terminal (port 3001).

```bash
cd frontend
npx next dev -p 3001
```

Open `http://localhost:3001` in your browser. Sign up with an email or Google account, click into a session, and say "Rex" followed by what you want to build.

## Configuration

Vyrexo is configured through environment variables loaded from `.env`. The most important settings are documented below.

### Required

- `GEMINI_API_KEY` is your Google AI Studio API key for Gemini access
- `DATABASE_URL` is your Supabase PostgreSQL connection string with the `postgresql+asyncpg://` prefix
- `NEXT_PUBLIC_SUPABASE_URL` is your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is your Supabase anonymous public key

### Optional

- `LLM_MODEL_HEAVY` sets the Gemini model for heavy reasoning (default `gemini-2.5-pro`)
- `LLM_MODEL_LIGHT` sets the Gemini model for light tasks (default `gemini-2.5-flash`)
- `STT_PROVIDER` chooses speech-to-text engine, `local` for Whisper local or `api` for OpenAI Whisper API (default `local`)
- `WHISPER_MODEL_SIZE` sets the Whisper model size (default `base`, options include `tiny`, `small`, `medium`, `large`)
- `TTS_PROVIDER` chooses text-to-speech engine, `edge` for Edge-TTS (default), `chatterbox` for local, or `pyttsx3` for offline
- `TTS_VOICE` selects a specific voice ID (default `en-US-GuyNeural`)
- `HOST` sets the server host (default `127.0.0.1`)
- `PORT` sets the server port (default `8001`)

The frontend reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `frontend/.env.local` rather than the root `.env`.

## Usage

After signing in, the workflow looks like this.

You start a new session by clicking the plus icon or selecting an existing session from the sidebar. The connection status indicator turns green once the WebSocket connects to the backend. The voice orb begins its idle pulse.

You activate Rex by saying its name anywhere in your speech. Phrases like "Hey Rex", "OK Rex", "Rex, listen", or just "Rex" all trigger activation. The orb shifts to its listening state, indicating that the system is now in active conversation mode.

You speak naturally. Examples of commands that work include:

- "Create a FastAPI authentication service with JWT tokens and Google OAuth"
- "Add rate limiting to the login endpoint"
- "Run the test suite and tell me what fails"
- "Where is the database connection logic?"
- "Refactor the user model to use UUID primary keys"
- "Commit these changes with a sensible message and push to main"

Rex breaks the request into a plan, displays it in the agent timeline, and starts executing. As each agent completes its step, the timeline updates. Rex narrates progress through the speakers.

You can interrupt at any time by speaking. If you say "Wait, also add password reset", Rex pauses, updates the plan, and continues with the new requirement included.

To end a session, say "Goodbye Rex" or "Stop listening". The orb returns to its dormant state and the WebSocket disconnects cleanly. Sessions persist in Supabase, so you can return later and continue where you left off.

The Settings page lets you customize the voice. There are eight curated voices across four accents (American, British, Indian, Australian) for both male and female options, plus speed controls for slow, normal, and fast playback. Each voice can be previewed before selection.

Pressing Space at any time triggers push-to-talk mode if you prefer not to use the wake word. Pressing Escape interrupts the current execution and clears the speech queue.

## Roadmap

### Phase 1: MVP (Current)

- Voice-first conversational interaction with wake word activation
- Six specialized AI agents orchestrated through LangGraph
- Interruptible execution with state checkpointing
- Continuous action narration through TTS
- Codebase context awareness via ChromaDB RAG
- Emotion-aware response adaptation
- Five interaction modes including Normal, Debug, Rubber Duck, Ship It, and Whiteboard
- VS Code integration for visual code inspection
- Voice-driven git workflow operations
- Automated test generation and execution
- Continuous code review for security and quality
- Automated documentation generation
- Frontend dashboard with session management
- Supabase authentication and persistence

### Phase 2: Differentiating Features

These features are planned for the next development cycle and the architecture is already designed to support them without breaking existing code.

- **Live Collaborative Debugging** where Rex sets breakpoints, inspects runtime state, and walks through stack traces verbally while the developer guides the investigation
- **Context Streaming** as an ambient awareness mode where references like "that auth bug from yesterday" resolve through git history and conversation memory without explicit file paths
- **Voice-Driven Architecture Whiteboarding** where verbal descriptions of system architecture generate live Mermaid diagrams that update as you talk, then convert into actual implementations
- **Rubber Duck Mode** with intelligent listening, where Rex stays silent while the developer thinks out loud and only speaks up when it detects a logical flaw or critical missing piece
- **Multi-Session Project Memory** building a persistent developer profile that remembers coding style preferences, past architectural decisions, recurring patterns, and project-specific vocabulary
- **Ship It Mode** as a voice-to-deployment pipeline where saying "ship it" runs the full sequence of tests, linting, security checks, PR generation, and merge approval
- **Real-Time Voice Tone Adaptation** that goes beyond emotion detection to actual behavioral adaptation, where uncertain developers get more explanation and developers in flow get terse responses
- **Conflict-Aware Multi-Agent Transparency** exposing internal agent disagreements as natural conversation so the developer can arbitrate when, for example, the Reviewer flags a security issue in code the Coder just wrote

## Design Philosophy

Vyrexo is built around a few core principles that influence every architectural decision.

**Voice is the primary interface, not a side feature.** Most voice tools treat speech as a fancy input method on top of a text-first product. Vyrexo inverts this. The voice layer drives the orchestrator, and text-based interaction is not part of the user experience.

**Components communicate through events, not direct calls.** The Event Bus is the architectural backbone. This means the system can grow without breaking. Phase 2 features plug in by subscribing to events that already exist, with no modifications to current code.

**Agents are plugins, not hardcoded.** Adding a new agent type requires creating a single Python file with a registration decorator. The LangGraph DAG is built dynamically from the registry at startup.

**The LLM provider is abstracted.** Switching from Gemini to another model means changing one configuration variable. No code changes required. This protects against vendor lock-in and rate limit surprises.

**Cost stays at zero.** Every component in the stack is free or open source. The Gemini free tier, Whisper running locally, Edge-TTS through Microsoft's free service, Supabase's free tier, and ChromaDB self-hosted all combine into a system that costs nothing to run.

**The developer stays in control.** Rex narrates everything, can be interrupted at any point, and never executes destructive commands without confirmation. The IDE remains visible at all times so the developer can see exactly what is being built.

## Contributing

This is currently a final-year project under active development. Issues and pull requests are welcome. If you spot a bug or have a feature suggestion, open an issue and describe what you observed.

For larger changes, please open a discussion first to align on the approach. The architecture is intentionally modular to make contributions straightforward.

When contributing code, follow the existing patterns. New agents go in `backend/src/vyrexo/agents/implementations/` with the `@AgentRegistry.register` decorator. New voice middleware goes in `backend/src/vyrexo/voice/middleware/` and implements the `VoiceMiddleware` ABC. New interaction modes implement the `InteractionMode` ABC and register in the state machine.

## License

This project is provided as is for educational and personal use. Commercial licensing terms will be defined when the project moves out of academic scope.

## Acknowledgments

Vyrexo was built with significant help from the open-source community. Whisper from OpenAI provides world-class speech recognition that runs locally. Edge-TTS gives access to Microsoft's neural voices for free. ChromaDB makes vector search trivial to set up. LangGraph from LangChain handles the multi-agent orchestration elegantly. FastAPI and Next.js provide modern, productive frameworks for backend and frontend respectively. Supabase makes database hosting and authentication painless on the free tier.

Most importantly, Google's Gemini API made this entire project possible. Without a free, capable AI model accessible to students, none of this would exist.

---

Built for developers who would rather talk than type.
