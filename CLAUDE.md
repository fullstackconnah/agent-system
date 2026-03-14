# CLAUDE.md

## Project Overview

**Agent System** is a self-hosted AI coding orchestrator that coordinates task execution between Gemini (planning) and Claude Code (implementation). Tasks are managed as markdown files in an Obsidian vault with YAML frontmatter, progressing through a state machine (`pending` → `in-progress` → `done`/`failed`). A React dashboard (NEXUS) provides monitoring.

## Repository Structure

```
agent-system/
├── orchestrator/              # Express API + task orchestration
│   ├── src/
│   │   ├── index.js           # Express server, REST endpoints, cron scheduler
│   │   ├── runner.js          # Docker agent spawner, git automation, task execution
│   │   ├── vault.js           # Obsidian vault state machine (file moves + frontmatter)
│   │   ├── gemini.js          # Gemini CLI wrapper for task decomposition
│   │   └── logger.js          # Winston logger (console + file)
│   ├── client/                # React 19 + Vite dashboard (NEXUS)
│   │   ├── src/
│   │   │   ├── App.jsx        # Main dashboard layout
│   │   │   ├── components/    # Header, StatCard, TaskCard, LogViewer, TaskPanel, ContainerCard
│   │   │   └── hooks/useApi.js # Polling hook (5s interval)
│   │   └── vite.config.js     # Dev proxy → localhost:3000
│   └── Dockerfile             # Multi-stage: Node 22 slim + Gemini CLI
├── claude-agent/
│   └── Dockerfile             # Claude Code CLI agent image
├── docker-compose.yml         # Full stack definition
├── .github/workflows/build.yml # CI: build images → GHCR → Portainer webhook
├── bootstrap-server.sh        # Ubuntu server setup script
└── sync-credentials.ps1       # Windows → server credential sync
```

## Tech Stack

- **Backend**: Node.js 22, Express 4.18
- **Frontend**: React 19.1, Vite 6.3 (JSX, no TypeScript)
- **Testing**: Vitest 4.1, React Testing Library
- **Infrastructure**: Docker, Docker Compose, Watchtower
- **CI/CD**: GitHub Actions → GHCR → Portainer webhook deploy
- **AI**: Gemini CLI (planning), Claude Code CLI (execution)
- **State**: File-based with YAML frontmatter (gray-matter) in Obsidian vault
- **Logging**: Winston (JSON, console + `/vault/AgentSystem/logs/orchestrator.log`)

## Development Commands

```bash
# Orchestrator (backend)
cd orchestrator
npm install
npm run dev          # Express with --watch

# Client (frontend)
cd orchestrator/client
npm install
npm run dev          # Vite dev server, proxies API to localhost:3000
npm run build        # Production build → orchestrator/src/public/
npm test             # Vitest

# Full stack (production)
docker compose up -d
```

## API Endpoints

- `POST /run` — Submit task: `{ task, project, title, priority }`
- `GET /tasks/pending` — List pending tasks
- `GET /tasks/done` — List completed tasks
- `GET /tasks/failed` — List failed tasks
- `GET /health` — Status + auth mode
- `GET /containers` — Running Docker containers
- `GET /logs` — Orchestrator log tail

## Code Conventions

- **Language**: JavaScript (ES modules, no TypeScript)
- **Naming**: camelCase for variables/functions, PascalCase for React components
- **Styling**: Inline styles with CSS custom properties (`--accent-purple`, `--border`, etc.) — no CSS files
- **Error handling**: try/catch with non-fatal fallbacks (e.g., git push failure doesn't fail the task)
- **Logging**: Use the Winston logger from `logger.js`, never raw `console.log` in backend code
- **Commit messages**: Follow conventional commits (`feat:`, `fix:`, `chore:`, `test:`)
- **No linter/formatter config**: Keep code consistent with existing style

## Architecture Patterns

### Docker-in-Docker
The orchestrator spawns Claude Code agent containers on the host Docker daemon. Host paths are converted at runtime (`/projects` → `/home/connah/projects`). Containers run as UID 1000 to match host file ownership.

### Vault State Machine
Tasks are `.md` files with YAML frontmatter moved between directories:
```
tasks/pending/ → tasks/in-progress/ → tasks/done/ (or tasks/failed/)
```

Frontmatter schema:
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

### Dual-AI Workflow
1. Gemini decomposes high-level tasks into 2–4 subtasks
2. Claude Code executes each subtask in an isolated Docker container
3. Results are appended to the task file under `## Agent Notes`

### Cron Polling
Every 2 minutes the scheduler checks `pending/` for new tasks. Tasks are processed sequentially, sorted by priority (high → medium → low).

### Per-Project Memory
Each project accumulates a memory file in the vault that informs future task prompts, providing continuity across runs.

## Testing

Tests live in `orchestrator/client/src/test/` and component-adjacent `*.test.jsx` files. Run with:

```bash
cd orchestrator/client && npm test
```

## Deployment

Push to `main` triggers GitHub Actions which builds Docker images, pushes to GHCR (`ghcr.io/fullstackconnah/agent-orchestrator`, `ghcr.io/fullstackconnah/claude-agent`), and hits a Portainer webhook to redeploy. Watchtower handles automatic container updates.
