# Agent System

A self-hosted AI coding orchestrator that coordinates task execution between Gemini (planning) and Claude Code (implementation). Tasks are managed as markdown files in an Obsidian vault with YAML frontmatter, progressing through a state machine. A React dashboard (NEXUS) provides real-time monitoring with three switchable design themes.

## Architecture

```
                     ┌──────────────┐
                     │  NEXUS UI    │  React dashboard
                     │  (Vite)      │  with theme system
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │ Orchestrator │  Express API + cron scheduler
                     │  (Node.js)   │
                     └──┬───────┬───┘
                        │       │
               ┌────────▼──┐ ┌─▼──────────┐
               │  Gemini   │ │ Claude Code │  Isolated Docker
               │  Planner  │ │  Agents     │  containers
               └────────┬──┘ └─┬──────────┘
                        │      │
                     ┌──▼──────▼───┐
                     │ Obsidian    │  File-based task state
                     │ Vault       │  machine (markdown + YAML)
                     └─────────────┘
```

### Workflow

1. Tasks are submitted via API or dropped into the vault's `pending/` directory
2. Gemini decomposes high-level tasks into 2-4 subtasks
3. Claude Code executes each subtask in an isolated Docker container
4. Results are appended to the task file; tasks move through `pending → in-progress → done/failed`
5. A cron job polls every 2 minutes for new tasks, sorted by priority

## Repository Structure

```
agent-system/
├── orchestrator/
│   ├── src/
│   │   ├── index.js           # Express server, REST endpoints, cron scheduler
│   │   ├── runner.js           # Docker agent spawner, git automation
│   │   ├── vault.js            # Obsidian vault state machine (file moves + frontmatter)
│   │   ├── gemini.js           # Gemini CLI wrapper for task decomposition
│   │   └── logger.js           # Winston logger (console + file)
│   ├── client/                 # NEXUS dashboard (React 19 + Vite)
│   │   ├── src/
│   │   │   ├── App.jsx
│   │   │   ├── ThemeContext.jsx # Theme provider (SIGNAL, FORGE, MERIDIAN)
│   │   │   ├── components/     # Header, StatCard, TaskCard, LogViewer, etc.
│   │   │   └── hooks/useApi.js # Polling hook (5s interval)
│   │   └── vite.config.js
│   └── Dockerfile              # Multi-stage: Node 22 slim + Gemini CLI
├── claude-agent/
│   └── Dockerfile              # Claude Code CLI agent image
├── design-system/              # Theme design documents
├── docker-compose.yml
├── bootstrap-server.sh         # Server setup script
└── .github/workflows/build.yml # CI: build → GHCR → deploy
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 22, Express 4.18 |
| Frontend | React 19.1, Vite 6 (JSX, no TypeScript) |
| Testing | Vitest, React Testing Library |
| Infrastructure | Docker, Docker Compose |
| CI/CD | GitHub Actions → GHCR → Portainer webhook |
| AI | Gemini CLI (planning), Claude Code CLI (execution) |
| State | File-based with YAML frontmatter (gray-matter) |
| Logging | Winston (JSON, console + file) |

## Dashboard Themes

NEXUS includes three distinct design themes, selectable via a dropdown in the header:

| Theme | Style | Accent Color |
|-------|-------|-------------|
| **SIGNAL** | Tactical HUD — corner brackets, monospace data, scanline overlay | Phosphor green `#00FF88` |
| **FORGE** | Neo-Brutalist — cream background, hard offset shadows, thick black borders | Blue `#3B82F6` |
| **MERIDIAN** | Observatory — deep navy, serif headings (Playfair Display), soft rounded corners | Warm amber `#F5A623` |

Theme choice persists in localStorage. Design documents are in `design-system/`.

## Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for local development)
- An Anthropic API key or Claude Code OAuth credentials
- Gemini CLI credentials (for task decomposition)
- An Obsidian vault directory (or any directory for file-based task storage)

### 1. Clone and configure

```bash
git clone <repo-url>
cd agent-system
```

### 2. Set environment variables

Create a `.env` file or configure via your deployment tool:

```env
ANTHROPIC_API_KEY=sk-ant-...        # For Claude Code agents
VAULT_PATH=/path/to/obsidian-vault  # Where tasks are stored
BASIC_AUTH_USER=your-username        # Optional: HTTP basic auth
BASIC_AUTH_PASS=your-password        # Optional: HTTP basic auth
```

### 3. Start the stack

```bash
docker compose up -d --build
```

### 4. Verify

```bash
curl http://localhost:3000/health
# {"status":"ok","authMode":"api-key","timestamp":"..."}
```

### Local Development

```bash
# Backend
cd orchestrator
npm install
npm run dev          # Express with --watch

# Frontend
cd orchestrator/client
npm install
npm run dev          # Vite dev server, proxies API to localhost:3000
npm run build        # Production build → orchestrator/src/public/
npm test             # Vitest (60 tests)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/run` | Submit a task: `{ task, project, title, priority }` |
| `GET` | `/tasks/pending` | List pending tasks |
| `GET` | `/tasks/inProgress` | List in-progress tasks |
| `GET` | `/tasks/done` | List completed tasks |
| `GET` | `/tasks/failed` | List failed tasks |
| `GET` | `/containers` | List running Docker agent containers |
| `GET` | `/logs` | Tail orchestrator logs |
| `GET` | `/health` | System status + auth mode |

## Vault Structure

Tasks are markdown files with YAML frontmatter, moved between directories as they progress:

```
vault/AgentSystem/
├── tasks/
│   ├── pending/        # New tasks awaiting processing
│   ├── in-progress/    # Currently being executed
│   ├── done/           # Successfully completed
│   └── failed/         # Errored tasks
├── memory/
│   └── project-*.md    # Per-project learnings (grows over time)
├── context/
│   └── conventions.md  # Coding standards for agents
└── logs/
    └── orchestrator.log
```

### Task frontmatter schema

```yaml
---
id: 2024-01-01-task-slug
status: pending|inProgress|done|failed
priority: high|medium|low
project: projectName
created: ISO timestamp
completedAt: ISO timestamp
---
```

## Authentication

The orchestrator supports two auth modes for Claude agents:

- **API Key** (recommended): Set `ANTHROPIC_API_KEY` environment variable. Agent containers use it directly.
- **OAuth**: Mount Claude Code OAuth credentials into agent containers. Requires periodic re-authentication.

The `/health` endpoint reports which auth mode is active.

## CI/CD

Pushing to `main` triggers GitHub Actions which:
1. Builds Docker images (orchestrator + claude-agent)
2. Pushes to GitHub Container Registry (GHCR)
3. Hits a Portainer webhook to redeploy

## License

MIT
