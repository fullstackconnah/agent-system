// src/gemini.js
import { execSync } from "child_process";
import { logger } from "./logger.js";

/**
 * Ask Gemini to break a high-level task into subtasks.
 * Returns an array of { title, body, priority } objects.
 */
export async function planTask(highLevelTask, projectContext = "") {
  const prompt = `
You are a software project orchestrator. Break the following development task into 2-4 independent subtasks that can be handed off to a coding agent (Claude Code).

Each subtask must be:
- Self-contained and executable without needing output from sibling tasks
- Specific enough that a coding agent can act on it without clarification
- Relevant to a C# .NET / Angular codebase

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "title": "short task title",
    "body": "full task description with acceptance criteria",
    "priority": "high|medium|low"
  }
]

Project context:
${projectContext || "No additional context provided."}

Task to break down:
${highLevelTask}
`.trim();

  try {
    logger.info("Calling Gemini for task planning...");
    const raw = execSync(`gemini -p ${JSON.stringify(prompt)}`, {
      env: { ...process.env, HOME: "/root" },
      timeout: 60000,
    }).toString().trim();

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, "").trim();
    const subtasks = JSON.parse(clean);
    logger.info(`Gemini returned ${subtasks.length} subtask(s)`);
    return subtasks;
  } catch (err) {
    logger.error(`Gemini planning failed: ${err.message}`);
    // Fallback: treat the whole task as a single subtask
    return [{ title: highLevelTask, body: highLevelTask, priority: "high" }];
  }
}

/**
 * Ask Gemini to synthesise results from completed agent runs.
 */
export async function synthesiseResults(taskTitle, agentOutputs) {
  const prompt = `
Summarise the following agent results for the task "${taskTitle}".
Flag any errors, incomplete items, or follow-up work needed.
Be concise — bullet points preferred.

Agent outputs:
${agentOutputs.map((o, i) => `--- Agent ${i + 1} ---\n${o}`).join("\n\n")}
`.trim();

  try {
    const result = execSync(`gemini -p ${JSON.stringify(prompt)}`, {
      env: { ...process.env, HOME: "/root" },
      timeout: 60000,
    }).toString().trim();
    return result;
  } catch (err) {
    logger.error(`Gemini synthesis failed: ${err.message}`);
    return "Synthesis unavailable.";
  }
}
