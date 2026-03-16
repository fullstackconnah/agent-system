# Server Manager Agent — Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Add SSH-based server monitoring, alerting, and autonomous remediation to `nexus-api` (.NET 9 ASP.NET Core)

---

## Overview

A server manager agent built as a vertical slice inside `nexus-api`. It SSHes into the home server (`connah@192.168.4.100`) every 5 minutes, collects system and container metrics, evaluates against thresholds, and responds by: auto-remediating low-risk issues (restart a stopped container), spawning a Claude Code agent task for complex issues, and sending email alerts with a clear audit trail of what happened and what was done. A new Server Health panel in the NEXUS dashboard surfaces current state and recent alerts.

---

## Architecture

The feature follows the existing `nexus-api` pattern: a background `IHostedService` for the scheduled loop, focused service classes for each concern, a controller for the dashboard API, and a PostgreSQL table for alert history.

### New files

```
nexus-api/NexusApi/
├── Services/
│   ├── ServerMonitorService.cs     ← IHostedService, 5-min timer, orchestrates the check cycle
│   ├── SshService.cs               ← SSH.NET connection wrapper, execute-command helper
│   ├── MetricsCollector.cs         ← runs SSH commands, parses CPU/RAM/disk/container/service/log output
│   ├── RemediationService.cs       ← evaluates severity, issues auto-fixes or enqueues Claude task
│   └── NotificationService.cs      ← sends email via MailKit (issue + resolved messages)
├── Controllers/
│   └── ServerHealthController.cs   ← GET /api/server-health, GET /api/server-alerts
├── Models/
│   ├── ServerHealthSnapshot.cs     ← in-memory current state (not persisted)
│   └── ServerAlert.cs              ← EF Core entity for server_alerts table
└── Data/
    └── NexusDbContext.cs           ← add DbSet<ServerAlert>, EF migration
```

### Modified files

| File | Change |
|------|--------|
| `Program.cs` | Register `ServerMonitorService`, `SshService`, `MetricsCollector`, `RemediationService`, `NotificationService`; bind `ServerMonitor` and `Smtp` config sections |
| `appsettings.json` | Add `ServerMonitor` and `Smtp` config sections |
| `docker-compose.yml` | Add SSH key volume mount + env vars |
| `orchestrator/client/src/App.jsx` | Add `<ServerHealthCard />` |
| `orchestrator/client/src/hooks/useApi.js` | Poll `/api/server-health` |
| `orchestrator/client/src/components/ServerHealthCard.jsx` | New dashboard panel (NET NEW) |

---

## Data Model

### server_alerts table

```sql
CREATE TABLE server_alerts (
  alert_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type         TEXT NOT NULL
                 CHECK (type IN ('cpu_high','ram_high','disk_high','container_down',
                                 'container_restart_loop','service_down','log_error')),
  subject      TEXT NOT NULL DEFAULT '',  -- e.g. container name, service name, or '' for system-wide
  severity     TEXT NOT NULL CHECK (severity IN ('warning','critical')),
  message      TEXT NOT NULL,
  action_taken TEXT,          -- e.g. "Restarted container nexus-api" or "Spawned Claude task #42"
  resolved     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);
CREATE INDEX ON server_alerts (resolved);
CREATE INDEX ON server_alerts (type, subject, resolved);  -- deduplication lookup
CREATE INDEX ON server_alerts (created_at DESC);
```

### ServerHealthSnapshot (in-memory only)

```csharp
public record ContainerStatus
{
    public string Name { get; init; } = "";
    public bool Running { get; init; }
    public int RestartCount { get; init; }   // parsed from "Restarting (3)" in docker ps Status
}

public record ServiceStatus
{
    public string Name { get; init; } = "";
    public bool Active { get; init; }
}

public record ServerHealthSnapshot
{
    public DateTime CheckedAt { get; init; }
    public double CpuPercent { get; init; }
    public double RamPercent { get; init; }
    public double DiskPercent { get; init; }
    public List<ContainerStatus> Containers { get; init; } = [];
    public List<ServiceStatus> Services { get; init; } = [];
    public int RecentErrorCount { get; init; }
    public List<ActiveAlertDto> ActiveAlerts { get; init; } = [];

    // Derived: "critical" if any unresolved critical alert exists;
    //          "warning"  if any unresolved warning alert exists;
    //          "healthy"  otherwise.
    public string Status => ActiveAlerts.Any(a => a.Severity == "critical")
        ? "critical"
        : ActiveAlerts.Any()
            ? "warning"
            : "healthy";
}

// Serialised shape of an alert within the /api/server-health response
public record ActiveAlertDto
{
    public long AlertId { get; init; }
    public string Type { get; init; } = "";
    public string Subject { get; init; } = "";   // container name, service name, or "" for system-wide
    public string Severity { get; init; } = "";
    public string Message { get; init; } = "";
    public string? ActionTaken { get; init; }
    public DateTime CreatedAt { get; init; }
}
```

---

## Configuration

### appsettings.json additions

```json
{
  "ServerMonitor": {
    "Enabled": true,
    "IntervalMinutes": 5,
    "Host": "192.168.4.100",
    "User": "connah",
    "KeyPath": "/ssh-keys/id_rsa",
    "CpuThreshold": 80,
    "RamThreshold": 85,
    "DiskThreshold": 90,
    "KnownSafeServices": ["nginx", "postgresql", "docker"]
  },
  "Smtp": {
    "Host": "",
    "Port": 587,
    "User": "",
    "Password": "",
    "AlertEmail": "",
    "UseSsl": true
  }
}
```

### Environment variables (docker-compose)

```
SERVER_MONITOR__ENABLED=true
SERVER_MONITOR__INTERVAL_MINUTES=5
SERVER_MONITOR__HOST=192.168.4.100
SERVER_MONITOR__USER=connah
SERVER_MONITOR__KEY_PATH=/ssh-keys/id_rsa
SERVER_MONITOR__CPU_THRESHOLD=80
SERVER_MONITOR__RAM_THRESHOLD=85
SERVER_MONITOR__DISK_THRESHOLD=90
SMTP__HOST=smtp.gmail.com
SMTP__PORT=587
SMTP__USER=you@gmail.com
SMTP__PASSWORD=...
SMTP__ALERT_EMAIL=you@gmail.com
SMTP__USE_SSL=true
```

### docker-compose.yml additions (nexus-api service)

```yaml
volumes:
  - /home/connah/.ssh/nexus-monitor:/ssh-keys:ro   # dedicated monitor key, read-only
environment:
  - SERVER_MONITOR__HOST=192.168.4.100
  - SERVER_MONITOR__USER=connah
  - SERVER_MONITOR__KEY_PATH=/ssh-keys/id_rsa
  # ... SMTP vars
```

### SSH key setup (one-time)

```bash
# On the server, as connah:
mkdir -p ~/.ssh/nexus-monitor
ssh-keygen -t ed25519 -f ~/.ssh/nexus-monitor/id_rsa -N "" -C "nexus-api-monitor"
cat ~/.ssh/nexus-monitor/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh/nexus-monitor && chmod 600 ~/.ssh/nexus-monitor/id_rsa
```

The private key directory (`~/.ssh/nexus-monitor/`) is then mounted read-only into `nexus-api`.

---

## Metrics Collection

`MetricsCollector` executes these SSH commands and parses stdout:

| Metric | Command |
|--------|---------|
| CPU % | `top -bn1 \| grep "Cpu(s)" \| awk '{print $2+$4}'` |
| RAM % | `free \| awk '/Mem/{printf "%.0f", $3/$2*100}'` |
| Disk % (root) | `df / \| awk 'NR==2{print $5}' \| tr -d '%'` |
| Container states | `docker ps -a --format "{{.Names}}\t{{.Status}}"` |
| Service states | `systemctl is-active nginx postgresql docker 2>/dev/null` |
| Recent error logs | `journalctl -p err --since "5 minutes ago" --no-pager -q` |

All commands are executed in a single SSH session per check cycle to minimise connection overhead.

---

## Remediation Logic

### Decision table

| Condition | Severity | Auto-action | Spawn Claude agent? |
|-----------|----------|-------------|---------------------|
| CPU > 80% | warning | Alert only | No |
| CPU > 95% | critical | Alert only | Yes — investigate runaway process |
| RAM > 85% | warning | Alert only | No |
| RAM > 95% | critical | Alert only | Yes — identify memory leak |
| Disk > 90% | warning | Alert only | Yes — clean logs/tmp |
| Container stopped | warning | `docker start <name>` via SSH | No (log action taken) |
| Container restart loop (≥3 in 5 min) | critical | Alert only | Yes — investigate crash loop |
| Known service down (nginx, postgresql, docker) | warning | `systemctl restart <name>` via SSH | No (log action taken) |
| Unknown service down | warning | Alert only | Yes |
| Recent error log count > 10 | warning | Alert only | Yes |

### Alert deduplication

- An alert record is created when an issue **first appears**
- No duplicate alert is created while the same issue persists across check cycles — deduplication key is `type + subject + resolved = false` (e.g. `container_down + nexus-api` is distinct from `container_down + nexus-db`)
- `subject` is the container name, service name, or empty string for system-wide metrics (cpu, ram, disk)
- Email is sent once on creation, once on resolution
- When the issue clears, `resolved = true` and `resolved_at` is set; a resolution email is sent

### Claude agent task format

When a Claude agent is spawned, `RemediationService` calls `ITaskService.CreateAndEnqueueAsync(...)` — the same shared service used by `TasksController`. `ITaskService` is registered in DI and injected into `RemediationService`. This avoids HTTP loopback and reuses existing validation and vault-note creation logic.

Task payload:

```
title: "Server alert: <type> on 192.168.4.100"
project: "server-monitor"
priority: "high"
body: |
  ## Server Alert
  Type: <type>
  Severity: <severity>
  Detected: <timestamp>
  Details: <message>

  ## Your Task
  SSH into 192.168.4.100 as connah and investigate. Check logs, identify the root cause,
  and apply a safe fix. Document what you found and what you did.
```

---

## API Endpoints

### GET /api/server-health

Returns current in-memory snapshot plus last 5 active (unresolved) alerts.

```json
{
  "checkedAt": "2026-03-16T14:32:00Z",
  "status": "warning",
  "cpu": 42.1,
  "ram": 61.3,
  "disk": 74.0,
  "containers": [
    { "name": "nexus-api", "running": true, "restartCount": 0 },
    { "name": "nexus-db", "running": true, "restartCount": 0 }
  ],
  "services": [
    { "name": "nginx", "active": true },
    { "name": "docker", "active": true }
  ],
  "recentErrorCount": 0,
  "activeAlerts": [
    {
      "alertId": 7,
      "type": "container_down",
      "subject": "nexus-api",
      "severity": "warning",
      "message": "Container nexus-api is not running",
      "actionTaken": "Restarted container nexus-api",
      "createdAt": "2026-03-16T14:32:00Z"
    }
  ]
}
```

### GET /api/server-alerts?limit=50&offset=0

Paginated alert history, newest first.

---

## Dashboard

### ServerHealthCard.jsx

New full-width panel inserted between `ContainerCard` and `RepoCard` in `App.jsx`.

```
┌─────────────────────────────────────────────────────────────────┐
│ SERVER HEALTH  ● HEALTHY    last checked 2 min ago              │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│ CPU  42% │ RAM  61% │ DISK 74% │ 5 containers ✓               │
├──────────┴──────────┴──────────┴──────────────────────────────┤
│ Recent Alerts                                                   │
│ ⚠ 14:32  container nexus-api was down — restarted auto        │
│ ✓ 14:37  nexus-api resolved                                    │
└─────────────────────────────────────────────────────────────────┘
```

- Status dot: green (all clear) / amber (warning) / red (critical / any unresolved alert)
- Uses existing CSS custom properties (`--accent-purple`, `--border`, etc.) — no new CSS files
- `useApi.js` adds `serverHealth` as a separate top-level state value (not merged into the existing `data` object) and returns it alongside `data` and `logs`. `ServerHealthCard` receives `serverHealth` as a prop from `App.jsx`. The `/api/server-health` fetch is added to the existing `refresh()` callback, so it polls on the same 5s interval with no new timer.

---

## Email Notifications

Uses **MailKit** (standard .NET SMTP library).

**Alert email:**
- Subject: `[NEXUS Alert] cpu_high on 192.168.4.100`
- Body: metric value, threshold, timestamp, action taken (if any)

**Resolved email:**
- Subject: `[NEXUS Resolved] cpu_high on 192.168.4.100`
- Body: when it was detected, when resolved, duration

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `SSH.NET` (Renci.SshNet) | SSH client for metrics collection and auto-remediation |
| `MailKit` | SMTP email sender |

Both are standard, widely-used NuGet packages with no unusual licensing constraints.

---

## Conflict Note

A parallel agent is actively making edits to `nexus-api` in the same area. Implementation should be coordinated to avoid merge conflicts, particularly around `Program.cs`, `NexusDbContext.cs`, and `docker-compose.yml`.

---

## Out of Scope

- Multi-server monitoring (single host only for now)
- Web-based threshold configuration (env vars only)
- SMS / Slack / Discord notifications (email only for now)
- Historical metrics graphing (alert history only)
