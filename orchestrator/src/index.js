// src/index.js
import express from "express";
import { runTask } from "./runner.js";
import { getPendingTasks, getTasksByStatus } from "./vault.js";
import { logger } from "./logger.js";
import cron from "node-cron";

const app = express();
app.use(express.json());

// --- Health check ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Manually trigger a task by vault filename ---
app.post("/run", async (req, res) => {
  const { task, project } = req.body;
  if (!task || !project) {
    return res.status(400).json({ error: "task and project are required" });
  }

  logger.info(`Manual task triggered: ${task}`);
  res.json({ status: "accepted", message: "Task queued" });

  // Run async, don't block response
  runTask({ task, project }).catch(err =>
    logger.error(`Task failed: ${err.message}`)
  );
});

// --- List tasks by status ---
app.get("/tasks/:status", async (req, res) => {
  const { status } = req.params;
  const tasks = await getTasksByStatus(status);
  res.json(tasks);
});

// --- Auto-drain pending vault tasks every 2 minutes ---
cron.schedule("*/2 * * * *", async () => {
  const pending = await getPendingTasks();
  if (pending.length === 0) return;

  logger.info(`Cron: found ${pending.length} pending task(s)`);

  // Process one at a time to respect subscription rate limits
  const next = pending[0];
  logger.info(`Running: ${next.filename}`);
  await runTask(next).catch(err =>
    logger.error(`Cron task failed: ${err.message}`)
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Orchestrator running on port ${PORT}`);
});
