// src/runner.js
import Docker from "dockerode";
import path from "path";
import { execSync } from "child_process";
import { logger } from "./logger.js";
import {
  updateTaskStatus,
  loadProjectMemory,
  loadConventions,
  appendProjectMemory,
} from "./vault.js";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const AGENT_IMAGE = process.env.AGENT_IMAGE || "ghcr.io/fullstackconnah/claude-agent:latest";
const PROJECTS_PATH = process.env.PROJECTS_PATH || "/projects";
const VAULT_PATH    = process.env.VAULT_PATH     || "/vault";
const CLAUDE_CREDS  = process.env.CLAUDE_CREDS   || "/home/agent/.claude";

// Host paths for agent container bind mounts (Docker-in-Docker requires host paths)
const HOST_PROJECTS_PATH = process.env.HOST_PROJECTS_PATH || PROJECTS_PATH;
const HOST_VAULT_PATH    = process.env.HOST_VAULT_PATH    || VAULT_PATH;
const HOST_CLAUDE_CREDS  = process.env.HOST_CLAUDE_CREDS  || CLAUDE_CREDS;

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

    // Commit and push changes to GitHub
    await gitCommitAndPush(projectPath, title);

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

/**
 * Git add, commit, and push any changes the agent made.
 */
async function gitCommitAndPush(projectPath, taskTitle) {
  try {
    // Check if there are any changes to commit
    const status = execSync("git status --porcelain", { cwd: projectPath }).toString().trim();
    if (!status) {
      logger.info("No git changes to commit");
      return;
    }

    execSync("git add -A", { cwd: projectPath });
    execSync(`git commit -m "agent: ${taskTitle.replace(/"/g, "'")}"`, { cwd: projectPath });
    execSync("git push", { cwd: projectPath });
    logger.info(`Git: committed and pushed changes for "${taskTitle}"`);
  } catch (err) {
    // Don't fail the task if git push fails - just log it
    logger.warn(`Git push failed (non-fatal): ${err.message}`);
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
      // Pull latest agent image before spawning (non-fatal if pull fails)
      try {
        await new Promise((res, rej) => {
          docker.pull(AGENT_IMAGE, (err, stream) => {
            if (err) return rej(err);
            docker.modem.followProgress(stream, (err) => err ? rej(err) : res());
          });
        });
      } catch (pullErr) {
        logger.warn(`Image pull failed (using cached): ${pullErr.message}`);
      }

      // Convert orchestrator-internal path to host path for bind mount
      const hostProjectPath = projectPath.replace(PROJECTS_PATH, HOST_PROJECTS_PATH);

      const container = await docker.createContainer({
        Image: AGENT_IMAGE,
        Cmd: ["-p", prompt, "--output-format", "json"],
        User: "1000:1000",
        HostConfig: {
          Binds: [
            `${hostProjectPath}:/home/agent/workspace`,
            `${HOST_VAULT_PATH}:/home/agent/vault:ro`,
            `${HOST_CLAUDE_CREDS}:/home/agent/.claude:ro`,
          ],
          AutoRemove: true,
          Memory: 512 * 1024 * 1024,    // 512MB
          NanoCpus: 1 * 1e9,             // 1 CPU
        },
        WorkingDir: "/home/agent/workspace",
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
