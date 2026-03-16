// src/index.js
import express from "express";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import Docker from "dockerode";
import { runTask } from "./runner.js";
import { getPendingTasks, getTasksByStatus, createTaskFile } from "./vault.js";
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
  const taskTitle = title || task;
  logger.info(`Manual task triggered: ${taskTitle}`);

  // Create a vault task file so the dashboard can track it
  const filepath = await createTaskFile({
    title: taskTitle,
    body: task,
    priority,
    project,
  });

  res.json({ status: "accepted", message: "Task queued" });
  runTask({ filepath, body: task, project, title: taskTitle, priority }).catch(err =>
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
      .filter(c => c.Image.includes("claude-agent"))
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

// --- List repos from linked GitHub account ---
app.get("/repositories/github", async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.json({ error: "GITHUB_TOKEN not configured", repos: [] });
  try {
    const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) {
      const msg = await response.text();
      return res.json({ error: `GitHub API error: ${response.status}`, repos: [] });
    }
    const data = await response.json();
    const repos = data.map(r => ({
      name: r.name,
      fullName: r.full_name,
      cloneUrl: r.clone_url,
      description: r.description,
      private: r.private,
      pushedAt: r.pushed_at,
      defaultBranch: r.default_branch,
    }));
    res.json({ repos });
  } catch (err) {
    logger.error(`GitHub repos fetch failed: ${err.message}`);
    res.json({ error: err.message, repos: [] });
  }
});

// --- Clone a repository into PROJECTS_PATH ---
app.post("/repositories/clone", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }
  // Extract repo name from URL
  const match = url.match(/\/([^/]+?)(?:\.git)?$/);
  if (!match) return res.status(400).json({ error: "Could not parse repo name from URL" });
  const name = match[1];
  const projectsPath = process.env.PROJECTS_PATH || "/projects";
  const destPath = path.join(projectsPath, name);
  // Check if already cloned
  try {
    await fs.access(destPath);
    return res.status(409).json({ error: `Repository '${name}' already exists` });
  } catch {}
  logger.info(`Cloning ${url} into ${destPath}`);
  try {
    execFileSync("git", ["clone", url, name], { cwd: projectsPath, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    logger.info(`Cloned ${name} successfully`);
    res.json({ success: true, name });
  } catch (err) {
    logger.error(`Clone failed for ${url}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// --- List accessible git repositories ---
app.get("/repositories", async (req, res) => {
  const projectsPath = process.env.PROJECTS_PATH || "/projects";
  try {
    const entries = await fs.readdir(projectsPath, { withFileTypes: true });
    const repos = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const repoPath = path.join(projectsPath, entry.name);
      const gitDir = path.join(repoPath, ".git");
      try {
        await fs.access(gitDir);
      } catch {
        continue; // not a git repo
      }
      const git = (args) => {
        try {
          return execFileSync("git", args, { cwd: repoPath, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
        } catch {
          return null;
        }
      };
      repos.push({
        name: entry.name,
        remote: git(["remote", "get-url", "origin"]),
        branch: git(["branch", "--show-current"]),
        lastCommit: git(["log", "-1", "--pretty=format:%s"]),
        lastCommitTime: git(["log", "-1", "--pretty=format:%cr"]),
      });
    }
    res.json(repos);
  } catch {
    res.json([]);
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
