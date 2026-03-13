# Agent System Setup
Gemini orchestrator + Claude Code agents + Obsidian vault memory
Running on: Ubuntu home server @ 192.168.4.100

---

## File Structure
```
agent-system/
├── bootstrap-server.sh        ← run once on server
├── sync-credentials.ps1       ← run once on Windows desktop
├── docker-compose.yml         ← main stack
├── npm-cloudflare-config.txt  ← NPM + tunnel setup guide
├── claude-agent/
│   └── Dockerfile             ← Claude Code agent image
└── orchestrator/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── index.js            ← Express API + cron runner
        ├── runner.js           ← Docker agent spawner
        ├── gemini.js           ← Gemini CLI planner
        ├── vault.js            ← Obsidian vault read/write
        └── logger.js
```

---

## Setup Order

### Phase 1 — Server prep (SSH into 192.168.4.100)

```bash
# Copy the agent-system folder to your server first
# Run from Windows PowerShell:
scp -r .\agent-system connah@192.168.4.100:~/agent-system

# Then SSH in
ssh connah@192.168.4.100

# Run bootstrap (installs Node, Claude Code CLI, Gemini CLI, builds Docker image)
cd ~/agent-system
bash bootstrap-server.sh
```

### Phase 2 — Sync credentials (Windows desktop, PowerShell)

```powershell
cd .\agent-system
.\sync-credentials.ps1
```

Verify on server:
```bash
ls ~/.claude   # should show credentials
ls ~/.gemini   # should show credentials
```

### Phase 3 — Connect orchestrator to your Docker network

Check what network your NPM container is on:
```bash
docker inspect nginx-proxy-manager | grep -A 10 Networks
```

Update `docker-compose.yml` to add that network (see comments in file).

### Phase 4 — Start the stack

```bash
cd ~/agent-system
docker compose up -d --build
docker compose logs -f
```

Check health:
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Phase 5 — NPM + Cloudflare

Follow instructions in `npm-cloudflare-config.txt`.

Test external access:
```bash
curl https://agents.connah.com.au/health
```

---

## Using the System

### Add a task via API
```bash
curl -X POST https://agents.connah.com.au/run \
  -u connah:yourpassword \
  -H "Content-Type: application/json" \
  -d '{"task": "Add input validation to the contact form", "project": "oassist"}'
```

### Add a task via Obsidian (manual)
Drop a `.md` file in:
```
/home/connah/obsidian-vault/AgentSystem/tasks/pending/
```

The cron job polls every 2 minutes and picks it up automatically.

### Check task status
```bash
# List done tasks
curl https://agents.connah.com.au/tasks/done -u connah:yourpassword

# List in-progress
curl https://agents.connah.com.au/tasks/inProgress -u connah:yourpassword
```

### View live logs
```bash
ssh connah@192.168.4.100
docker logs agent-orchestrator -f
```

---

## Vault Structure (auto-created on first run)
```
/home/connah/obsidian-vault/
└── AgentSystem/
    ├── tasks/
    │   ├── pending/      ← drop tasks here
    │   ├── in-progress/  ← agent is working
    │   ├── done/         ← completed
    │   └── failed/       ← errored
    ├── memory/
    │   └── project-*.md  ← per-project learnings (grows over time)
    ├── context/
    │   └── conventions.md ← edit this with your coding standards
    └── logs/
        └── orchestrator.log
```

---

## Keeping Credentials Fresh

If Claude or Gemini sessions expire, re-run on Windows:
```powershell
.\sync-credentials.ps1
```

Then restart orchestrator on server:
```bash
docker compose restart orchestrator
```

---

## Connect Obsidian on Desktop

Install Obsidian → Open Vault → point it at a synced copy of
`/home/connah/obsidian-vault` using one of:
- **Syncthing** (recommended, free, local)
- **rclone** mounted as a network drive
- **Git** with a private repo

With Obsidian open you can watch tasks move through folders in real time
and edit `conventions.md` to guide agent behaviour.
