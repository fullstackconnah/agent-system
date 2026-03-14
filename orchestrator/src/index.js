// src/index.js
import express from "express";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Docker from "dockerode";
import { runTask } from "./runner.js";
import { getPendingTasks, getTasksByStatus } from "./vault.js";
import { logger } from "./logger.js";
import cron from "node-cron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

app.use(express.json());

// --- Serve dashboard ---
app.use(express.static(path.join(__dirname, "public")));

// --- Health check ---
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    authMode: process.env.ANTHROPIC_API_KEY ? "api-key" : "oauth",
    timestamp: new Date().toISOString(),
  });
});

// --- Submit a task ---
app.post("/run", async (req, res) => {
  const { task, project, title, priority } = req.body;
  if (!task || !project) {
    return res.status(400).json({ error: "task and project are required" });
  }
  logger.info(`Manual task triggered: ${title || task}`);
  res.json({ status: "accepted", message: "Task queued" });
  runTask({ task, project, title: title || task, priority }).catch(err =>
    logger.error(`Task failed: ${err.message}`)
  );
});

// --- List tasks by status ---
app.get("/tasks/:status", async (req, res) => {
  const tasks = await getTasksByStatus(req.params.status);
  res.json(tasks);
});

// --- List active agent containers ---
app.get("/containers", async (req, res) => {
  try {
    const containers = await docker.listContainers();
    const agents = containers
      .filter(c => c.Image === "claude-agent:latest")
      .map(c => ({
        id: c.Id.slice(0, 12),
        name: c.Names[0]?.replace("/", ""),
        image: c.Image,
        status: c.Status,
        created: c.Created,
      }));
    res.json(agents);
  } catch {
    res.json([]);
  }
});

// --- Stream log file lines with offset ---
app.get("/logs", async (req, res) => {
  const logFile = "/vault/AgentSystem/logs/orchestrator.log";
  const offset = parseInt(req.query.offset || "0", 10);
  try {
    const content = await fs.readFile(logFile, "utf-8");
    const lines = content.split("\n").filter(Boolean);
    const slice = lines.slice(offset);
    res.json({ lines: slice, nextOffset: offset + slice.length });
  } catch {
    res.json({ lines: [], nextOffset: 0 });
  }
});

// --- Auto-drain pending vault tasks every 2 minutes ---
cron.schedule("*/2 * * * *", async () => {
  const pending = await getPendingTasks();
  if (pending.length === 0) return;
  logger.info(`Cron: found ${pending.length} pending task(s)`);
  const next = pending[0];
  logger.info(`Running: ${next.filename}`);
  await runTask(next).catch(err =>
    logger.error(`Cron task failed: ${err.message}`)
  );
});

const PORT = process.env.PORT || 3000;
const authMode = process.env.ANTHROPIC_API_KEY ? "api-key" : "oauth";

app.listen(PORT, () => {
  logger.info(`Orchestrator running on port ${PORT}`);
  logger.info(`Auth mode: ${authMode}${authMode === "oauth" ? " (mount ~/.claude)" : " (ANTHROPIC_API_KEY set)"}`);
});
