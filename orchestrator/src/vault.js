// src/vault.js
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { logger } from "./logger.js";

const VAULT = process.env.VAULT_PATH || "/vault";

const DIRS = {
  pending:    path.join(VAULT, "AgentSystem/tasks/pending"),
  inProgress: path.join(VAULT, "AgentSystem/tasks/in-progress"),
  done:       path.join(VAULT, "AgentSystem/tasks/done"),
  failed:     path.join(VAULT, "AgentSystem/tasks/failed"),
  memory:     path.join(VAULT, "AgentSystem/memory"),
  context:    path.join(VAULT, "AgentSystem/context"),
  logs:       path.join(VAULT, "AgentSystem/logs"),
};

// Ensure all vault directories exist
export async function initVault() {
  for (const dir of Object.values(DIRS)) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Create starter files if they don't exist
  const conventionsFile = path.join(DIRS.context, "conventions.md");
  try {
    await fs.access(conventionsFile);
  } catch {
    await fs.writeFile(conventionsFile, `# Project Conventions

## Stack
- Backend: C# .NET (latest LTS)
- Frontend: Angular (latest)
- Database: SQL Server / PostgreSQL

## Coding Standards
- Follow standard .NET naming conventions (PascalCase for classes/methods, camelCase for locals)
- Angular components use OnPush change detection where possible
- Unit tests required for all service methods
- XML doc comments on all public methods

## Notes
<!-- Add project-specific conventions here -->
`);
    logger.info("Created conventions.md in vault");
  }
}

// Write a new task file to pending/
export async function createTaskFile({ title, body, priority, project }) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
  const filename = `${date}-${slug}.md`;
  const filepath = path.join(DIRS.pending, filename);

  const content = matter.stringify(`\n${body}\n\n## Agent Notes\n<!-- populated by agent -->\n`, {
    id: `${date}-${slug}`,
    status: "pending",
    priority: priority || "medium",
    project: project || "general",
    created: new Date().toISOString(),
  });

  await fs.writeFile(filepath, content);
  logger.info(`Task created: ${filename}`);
  return filepath;
}

// Read all pending task files
export async function getPendingTasks() {
  await fs.mkdir(DIRS.pending, { recursive: true });
  const files = await fs.readdir(DIRS.pending);
  const tasks = [];

  for (const file of files.filter(f => f.endsWith(".md"))) {
    const filepath = path.join(DIRS.pending, file);
    const raw = await fs.readFile(filepath, "utf-8");
    const parsed = matter(raw);
    tasks.push({
      filename: file,
      filepath,
      ...parsed.data,
      body: parsed.content,
    });
  }

  // Sort by priority
  const order = { high: 0, medium: 1, low: 2 };
  return tasks.sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
}

// Get tasks by status folder
export async function getTasksByStatus(status) {
  const dir = DIRS[status] || path.join(VAULT, "AgentSystem/tasks", status);
  await fs.mkdir(dir, { recursive: true });
  const files = await fs.readdir(dir);
  const tasks = [];

  for (const file of files.filter(f => f.endsWith(".md"))) {
    const raw = await fs.readFile(path.join(dir, file), "utf-8");
    const parsed = matter(raw);
    tasks.push({ filename: file, ...parsed.data });
  }
  return tasks;
}

// Move a task file and update its status + agent notes
export async function updateTaskStatus(filepath, status, agentNotes = "") {
  const raw = await fs.readFile(filepath, "utf-8");
  const parsed = matter(raw);
  parsed.data.status = status;
  parsed.data.completedAt = new Date().toISOString();

  // Append agent notes
  const updatedContent = parsed.content.replace(
    "## Agent Notes\n<!-- populated by agent -->",
    `## Agent Notes\n${agentNotes}`
  );

  const newContent = matter.stringify(updatedContent, parsed.data);
  const destDir = DIRS[status] || path.join(VAULT, "AgentSystem/tasks", status);
  await fs.mkdir(destDir, { recursive: true });

  const destPath = path.join(destDir, path.basename(filepath));
  await fs.writeFile(destPath, newContent);

  // Remove from old location
  try { await fs.unlink(filepath); } catch {}

  logger.info(`Task moved to ${status}: ${path.basename(filepath)}`);
  return destPath;
}

// Load project memory context
export async function loadProjectMemory(projectName) {
  const file = path.join(DIRS.memory, `project-${projectName}.md`);
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    return "";
  }
}

// Append to project memory after a completed session
export async function appendProjectMemory(projectName, notes) {
  const file = path.join(DIRS.memory, `project-${projectName}.md`);
  const date = new Date().toLocaleDateString("en-AU");
  const entry = `\n\n## ${date}\n${notes}`;

  try {
    const existing = await fs.readFile(file, "utf-8");
    await fs.writeFile(file, existing + entry);
  } catch {
    // File doesn't exist yet, create it
    await fs.writeFile(file, `# Project Memory: ${projectName}\n${entry}`);
  }
}

// Load coding conventions
export async function loadConventions() {
  const file = path.join(DIRS.context, "conventions.md");
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    return "";
  }
}

// Write a session log
export async function writeSessionLog(sessionId, content) {
  const file = path.join(DIRS.logs, `${sessionId}.md`);
  await fs.writeFile(file, content);
}
