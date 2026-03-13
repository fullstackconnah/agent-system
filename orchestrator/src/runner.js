// src/runner.js
import Docker from "dockerode";
import path from "path";
import { logger } from "./logger.js";
import {
  updateTaskStatus,
  loadProjectMemory,
  loadConventions,
  appendProjectMemory,
} from "./vault.js";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const PROJECTS_PATH = process.env.PROJECTS_PATH || "/projects";
const VAULT_PATH    = process.env.VAULT_PATH     || "/vault";
const CLAUDE_CREDS  = process.env.CLAUDE_CREDS   || "/root/.claude";

/**
 * Run a Claude Code agent for a given task.
 * @param {object} task - { filepath, body, project, title, priority }
 */
export async function runTask(task) {
  const { filepath, body, project, title } = task;
  const projectPath = path.join(PROJECTS_PATH, project || "general");

  // Load context from vault
  const [memory, conventions] = await Promise.all([
    loadProjectMemory(project),
    loadConventions(),
  ]);

  const fullPrompt = buildPrompt({ title, body, memory, conventions });

  // Move task to in-progress
  let currentPath = filepath;
  if (filepath) {
    currentPath = await updateTaskStatus(filepath, "inProgress");
  }

  logger.info(`Starting Claude agent for: ${title}`);

  try {
    const output = await runClaudeContainer(fullPrompt, projectPath);
    logger.info(`Agent completed: ${title}`);

    // Update vault
    if (currentPath) {
      await updateTaskStatus(currentPath, "done", output.slice(0, 2000));
    }
    await appendProjectMemory(project, `Completed: ${title}\n${output.slice(0, 500)}`);

    return output;
  } catch (err) {
    logger.error(`Agent failed for "${title}": ${err.message}`);
    if (currentPath) {
      await updateTaskStatus(currentPath, "failed", err.message);
    }
    throw err;
  }
}

function buildPrompt({ title, body, memory, conventions }) {
  return `
## Project Conventions
${conventions || "No conventions loaded."}

## Project Memory
${memory || "No prior memory for this project."}

## Your Task
### ${title}

${body}

---
When finished, briefly summarise what you did and any issues encountered.
`.trim();
}

/**
 * Spawn a one-shot Claude Code container, stream output, resolve on exit.
 */
function runClaudeContainer(prompt, projectPath) {
  return new Promise(async (resolve, reject) => {
    let output = "";

    try {
      const container = await docker.createContainer({
        Image: "claude-agent:latest",
        Cmd: ["-p", prompt, "--output-format", "json"],
        HostConfig: {
          Binds: [
            `${projectPath}:/workspace`,
            `${VAULT_PATH}:/vault:ro`,
            `${CLAUDE_CREDS}:/root/.claude:ro`,
          ],
          AutoRemove: true,
          // Limit resource usage — subscription accounts aren't billed by compute
          Memory: 512 * 1024 * 1024,    // 512MB
          NanoCpus: 1 * 1e9,             // 1 CPU
        },
        WorkingDir: "/workspace",
        Tty: false,
      });

      const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
      });

      container.modem.demuxStream(
        stream,
        { write: (chunk) => { output += chunk.toString(); } },
        { write: (chunk) => { logger.warn(`Agent stderr: ${chunk.toString()}`); } }
      );

      await container.start();

      container.wait((err, data) => {
        if (err) return reject(err);
        if (data?.StatusCode !== 0) {
          return reject(new Error(`Container exited with code ${data?.StatusCode}`));
        }
        resolve(output);
      });

    } catch (err) {
      reject(err);
    }
  });
}
