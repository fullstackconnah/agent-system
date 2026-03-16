# Nexus API — .NET Backend Design

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Replace Node.js orchestrator with ASP.NET Core Web API; add Claude plugin support with browse/discover UI

---

## Overview

Replace the existing Node.js/Express orchestrator with a .NET 9 ASP.NET Core Web API (`nexus-api`). The new service handles all backend responsibilities: task orchestration, Docker agent spawning, plugin management, vault integration, and structured logging. A PostgreSQL database replaces file-based task state for operational data. The Obsidian vault is retained as an agent knowledge base for long-term memory and context lookup.

---

## Architecture

### Services

| Service | Image | Role |
|---------|-------|------|
| `nexus-api` | `ghcr.io/fullstackconnah/nexus-api` | .NET 9 Web API — replaces orchestrator |
| `db` | `postgres:17-alpine` | Operational datastore |
| `claude-agent` | `ghcr.io/fullstackconnah/claude-agent` | Unchanged — one-shot task executor |
| `syncthing` | `syncthing/syncthing` | Unchanged — vault sync |
| `watchtower` | `containrrr/watchtower` | Unchanged — auto-updates |

### Storage Split

| Data | Storage |
|------|---------|
| Tasks, agent runs, logs, plugins, marketplaces | PostgreSQL (`nexus.db`) |
| Agent memory, project notes, run summaries | Obsidian vault (`.md` files) |
| Plugin cache and Claude settings | `~/.claude` directory (mounted rw to nexus-api) |

### Repository Structure

```
agent-system/
├── nexus-api/
│   ├── NexusApi/
│   │   ├── Controllers/
│   │   │   ├── TasksController.cs
│   │   │   ├── RunsController.cs
│   │   │   ├── PluginsController.cs
│   │   │   ├── MarketplacesController.cs
│   │   │   ├── SystemController.cs
│   │   │   └── RepositoriesController.cs
│   │   ├── Services/
│   │   │   ├── DockerService.cs          # Docker.DotNet — spawn agent containers
│   │   │   ├── PluginService.cs          # claude plugin install/uninstall via Docker
│   │   │   ├── MarketplaceService.cs     # fetch marketplace.json from GitHub/URLs
│   │   │   ├── VaultService.cs           # read project memory, write run notes
│   │   │   ├── TaskSchedulerService.cs   # IHostedService — 2-min cron drain
│   │   │   └── GeminiService.cs          # Gemini CLI wrapper (future)
│   │   ├── Data/
│   │   │   ├── NexusDbContext.cs
│   │   │   └── Migrations/
│   │   ├── Models/
│   │   │   ├── Task.cs
│   │   │   ├── AgentRun.cs
│   │   │   ├── LogEntry.cs
│   │   │   ├── Plugin.cs
│   │   │   └── Marketplace.cs
│   │   ├── Program.cs
│   │   └── appsettings.json
│   └── Dockerfile                        # .NET 9 multi-stage
├── orchestrator/client/                  # UNCHANGED — React/Vite NEXUS dashboard
├── claude-agent/                         # UNCHANGED
└── docker-compose.yml                    # Updated
```

---

## Data Model

### PostgreSQL Schema

```sql
-- Marketplaces
CREATE TABLE marketplaces (
  marketplace_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  source_type     TEXT NOT NULL CHECK (source_type IN ('github','git_url','local_path','remote_url')),
  source_url      TEXT NOT NULL,
  auto_update     BOOLEAN NOT NULL DEFAULT false,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ
);

-- Plugins
CREATE TABLE plugins (
  plugin_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  marketplace_id BIGINT NOT NULL REFERENCES marketplaces(marketplace_id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  version        TEXT,
  description    TEXT,
  homepage_url   TEXT,
  enabled        BOOLEAN NOT NULL DEFAULT true,
  scope          TEXT NOT NULL DEFAULT 'user' CHECK (scope IN ('user','project','local')),
  installed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, marketplace_id)
);
CREATE INDEX ON plugins (marketplace_id);
CREATE INDEX ON plugins (enabled);

-- Tasks
CREATE TABLE tasks (
  task_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id     TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  project         TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','failed')),
  vault_note_path TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);
CREATE INDEX ON tasks (project);
CREATE INDEX ON tasks (status);
CREATE INDEX ON tasks (priority, status);
CREATE INDEX ON tasks (created_at);

-- Agent Runs
CREATE TABLE agent_runs (
  run_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id      BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  container_id TEXT,
  exit_code    INTEGER,
  output       TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX ON agent_runs (task_id);
CREATE INDEX ON agent_runs (status);
CREATE INDEX ON agent_runs (started_at);

-- Log Entries
CREATE TABLE log_entries (
  log_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts       TIMESTAMPTZ NOT NULL DEFAULT now(),
  level    TEXT NOT NULL CHECK (level IN ('debug','info','warn','error')),
  message  TEXT NOT NULL,
  source   TEXT NOT NULL DEFAULT 'orchestrator'
             CHECK (source IN ('orchestrator','agent','plugin','system')),
  run_id   BIGINT REFERENCES agent_runs(run_id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX ON log_entries USING BRIN (ts);
CREATE INDEX ON log_entries (level);
CREATE INDEX ON log_entries (run_id);
CREATE INDEX ON log_entries USING GIN (metadata);
```

---

## API Endpoints

All endpoints use the `/api` prefix. The React dashboard (`useApi.js` and `vite.config.js`) **will be updated** as part of this implementation. The old bare-path routes are **not** kept as compatibility shims.

Status values use **snake_case** throughout (`pending`, `in_progress`, `done`, `failed`).

### Dashboard Migration (useApi.js + vite.config.js)

`vite.config.js` proxy changes from individual bare paths (`/health`, `/run`, `/tasks`, `/containers`, `/logs`) to a single `/api` prefix pointing at `localhost:3001`. Note: `/repositories` was **not** in the existing proxy config — it must be explicitly included in the new `/api` rule (net-new addition, not a rename).

`useApi.js` call changes:

| Current | New |
|---------|-----|
| `GET /tasks/pending` | `GET /api/tasks?status=pending` |
| `GET /tasks/inProgress` | `GET /api/tasks?status=in_progress` |
| `GET /tasks/done` | `GET /api/tasks?status=done` |
| `GET /tasks/failed` | `GET /api/tasks?status=failed` |
| `POST /run { task, project, title, priority }` | `POST /api/tasks { title, body, project, priority }` |
| `GET /containers` | `GET /api/containers` |
| `GET /logs?offset=` | `GET /api/logs?offset=` |
| `GET /repositories` | `GET /api/repositories` |
| `GET /repositories/github` | `GET /api/repositories/github` |
| `POST /repositories/clone` | `POST /api/repositories/clone` |

Note: the status filter changes from **path segment** (`/tasks/:status`) to **query parameter** (`/tasks?status=`). `useApi.js` must be updated structurally, not just with a prefix change.

### Tasks
```
POST   /api/tasks                          Submit task { title, body, project, priority }
                                           (replaces POST /run with { task, project, title, priority }
                                            — field rename: task → body)
GET    /api/tasks?status=in_progress       List by status (pending|in_progress|done|failed)
GET    /api/tasks/{id}                     Task detail with run history
```

### Agent Runs
```
GET    /api/runs?project=X&limit=50        Query agent history
GET    /api/runs/{id}                      Run detail with full output
```

### Plugins
```
GET    /api/plugins                                  List installed plugins
POST   /api/plugins/install                          { name, marketplace } — synchronous, waits for container exit
DELETE /api/plugins/{name}                           Uninstall
PATCH  /api/plugins/{name}/toggle                    Enable/disable
GET    /api/plugins/browse?marketplace=X&q=search    Browse marketplace catalog
```

### Marketplaces
```
GET    /api/marketplaces                    List
POST   /api/marketplaces                    Add { name, sourceType, sourceUrl }
DELETE /api/marketplaces/{name}             Remove
POST   /api/marketplaces/{name}/update      Refresh catalog
```

### System
```
GET    /api/health
GET    /api/containers
GET    /api/logs?offset=0
GET    /api/repositories
GET    /api/repositories/github
POST   /api/repositories/clone
```

---

## Plugin Management Mechanism

Plugin install/uninstall is performed by spawning a short-lived `claude-agent` container via Docker.DotNet with `~/.claude` mounted **read-write**. The container runs `claude plugin install <name>@<marketplace>` and exits. Plugin state is then synced to the `plugins` table.

Marketplace browsing fetches `marketplace.json` from GitHub raw URLs (or remote URLs) directly in the .NET service — no container spawn needed.

---

## Vault Integration

- On task start: `VaultService` reads `/vault/AgentSystem/projects/{project}/memory.md` and `/vault/AgentSystem/conventions.md` to inject as context into the agent prompt
- On task complete: writes `/vault/AgentSystem/projects/{project}/runs/{taskId}.md` with agent output summary; stores the path in `tasks.vault_note_path`
- Agent containers mount vault read-only — they can read prior run notes during execution

---

## Infrastructure

### docker-compose.yml additions

```yaml
nexus-api:
  image: ghcr.io/fullstackconnah/nexus-api:latest
  container_name: nexus-api
  restart: unless-stopped
  environment:
    - VAULT_PATH=/vault
    - PROJECTS_PATH=/projects
    - HOST_VAULT_PATH=/home/connah/obsidian-vault
    - HOST_PROJECTS_PATH=/home/connah/projects
    - HOST_CLAUDE_CREDS=/home/connah/.claude
    - AGENT_IMAGE=ghcr.io/fullstackconnah/claude-agent:latest
    - ConnectionStrings__Default=Host=db;Database=nexus;Username=nexus;Password=${DB_PASSWORD}
    - CLAUDE_CREDS=/claude-creds
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    - GITHUB_TOKEN=${GITHUB_TOKEN:-}
    - ASPNETCORE_URLS=http://+:8080
  volumes:
    - /home/connah/obsidian-vault:/vault
    - /home/connah/projects:/projects
    - /home/connah/.claude:/claude-creds          # rw for plugin installs; path set via CLAUDE_CREDS env var
    - /var/run/docker.sock:/var/run/docker.sock
  ports:
    - "3001:8080"
  networks:
    - agent-net
    - npm-net
  depends_on:
    - db
  labels:
    - "com.centurylinklabs.watchtower.enable=true"

db:
  image: postgres:17-alpine
  container_name: nexus-db
  restart: unless-stopped
  environment:
    - POSTGRES_DB=nexus
    - POSTGRES_USER=nexus
    - POSTGRES_PASSWORD=${DB_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  networks:
    - agent-net

volumes:
  postgres_data:
```

### CORS & Static Files

The .NET API serves the built React dashboard via `app.UseStaticFiles()` from `wwwroot/`. During development, `vite.config.js` proxy target changes from `localhost:3000` to `localhost:3001`. A CORS policy is configured in `Program.cs` allowing the dev origin (`http://localhost:5173`) for local development only — production serves client and API from the same origin.

### Database Migration Strategy

`Program.cs` calls `await db.Database.MigrateAsync()` at startup before the app starts accepting requests. This ensures the schema is always up-to-date on container start, including after Watchtower auto-updates. No separate init container or manual migration step required.

### Logging

The .NET service uses Serilog with two sinks:
- **Console** — structured JSON (for Docker log collection)
- **PostgreSQL** (`log_entries` table) — via `Serilog.Sinks.PostgreSQL`, capturing all Info/Warn/Error events with `run_id` enrichment when inside an agent execution context

`GET /api/logs?offset=0` queries `log_entries` ordered by `ts` with offset pagination, preserving the existing dashboard log-tail behaviour.

### CI/CD

`.github/workflows/build.yml` gains a second build job:
- Build `nexus-api` Docker image (multi-stage .NET 9)
- Push `ghcr.io/fullstackconnah/nexus-api:latest`
- Trigger Portainer webhook

---

## Migration Path

1. Deploy `nexus-api` + `db` alongside existing `orchestrator`
2. Point NEXUS dashboard to new API
3. Verify all endpoints parity
4. Remove `orchestrator` service from docker-compose
5. Delete `orchestrator/src/` (keep `orchestrator/client/`)
