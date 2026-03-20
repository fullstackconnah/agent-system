// nexus-api/NexusApi/Services/TaskRunnerService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Options;

namespace NexusApi.Services;

public class TaskRunnerService(
    NexusDbContext db,
    IDockerService docker,
    IVaultService vault,
    IOptions<AgentOptions> opts,
    ILogger<TaskRunnerService> log)
{
    private readonly AgentOptions _opts = opts.Value;

    public async Task RunAsync(long taskId, CancellationToken ct = default)
    {
        var task = await db.Tasks.FindAsync([taskId], ct);
        if (task is null)
        {
            log.LogWarning("TaskRunnerService: task {TaskId} not found", taskId);
            return;
        }

        task.Status = "in_progress";
        task.StartedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var run = new AgentRun { TaskId = task.TaskId };
        db.Runs.Add(run);
        await db.SaveChangesAsync(ct);

        log.LogInformation("Starting agent for task {TaskId}: {Title}", task.TaskId, task.Title);

        try
        {
            var memory = await vault.LoadProjectMemoryAsync(task.Project);
            var conventions = await vault.LoadConventionsAsync();
            var prompt = BuildPrompt(task.Title, task.Body, memory, conventions, task.TaskType);
            var projectPath = Path.Combine(_opts.ProjectsPath, task.Project);

            var output = await docker.RunAgentAsync(prompt, projectPath, ct);
            var truncated = output.Length > 10_000 ? output[..10_000] : output;

            run.Status = "completed";
            run.Output = truncated;
            run.ExitCode = 0;

            task.Status = "done";
            task.CompletedAt = DateTimeOffset.UtcNow;

            var observations = ExtractObservations(truncated);
            if (!string.IsNullOrEmpty(observations))
                await vault.AppendProjectObservationsAsync(task.Project, observations);

            var notePath = await vault.WriteRunNoteAsync(task.Project, task.ExternalId, truncated);
            task.VaultNotePath = notePath;

            log.LogInformation("Task {TaskId} completed", task.TaskId);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Task {TaskId} failed: {Message}", task.TaskId, ex.Message);
            run.Status = "failed";
            run.Output = ex.Message;
            task.Status = "failed";
            task.CompletedAt = DateTimeOffset.UtcNow;
        }
        finally
        {
            run.CompletedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    private static string BuildPrompt(string title, string body, string memory, string conventions, string taskType)
    {
        var slug = GenerateBranchSlug(title);

        var baseContext = $"""
            ## Project Conventions
            {(string.IsNullOrEmpty(conventions) ? "No conventions loaded." : conventions)}

            ## Project Memory
            {(string.IsNullOrEmpty(memory) ? "No prior memory for this project." : memory)}
            """;

        var gitWorkflow = $"""

            ## Git Workflow — MANDATORY
            You MUST follow this workflow for all code changes:

            1. **Branch**: Create a feature branch from the current branch:
               ```
               git checkout -b {slug}
               ```
            2. **Implement**: Make your changes, committing logically as you go.
               Use conventional commit messages (feat:, fix:, chore:, refactor:, test:, docs:).
            3. **Push**: Push the branch to origin:
               ```
               git push -u origin {slug}
               ```
            4. **Create PR**: Open a pull request using the gh CLI:
               ```
               gh pr create --title "<concise title>" --body "<description of changes>"
               ```
               Include a summary of what changed and why in the PR body.
            5. **Merge**: After creating the PR, merge it:
               ```
               gh pr merge --squash --delete-branch
               ```

            IMPORTANT:
            - NEVER commit directly to main or the default branch.
            - If the repo has CI checks, wait for them before merging: `gh pr checks --watch`
            - If merge fails due to checks, leave the PR open for human review and note this in your output.
            """;

        if (taskType == "subtask")
        {
            return $"""
                {baseContext}
                {gitWorkflow}

                ## Your Task
                ### {title}

                {body}

                ---
                You are a sub-orchestrator. Your responsibilities:
                1. Use the Task tool to delegate work to specialist subagents where appropriate
                2. If a subagent fails, analyse the failure output and retry with a modified approach
                3. Complete the task fully before reporting back
                4. Follow the Git Workflow above — all changes go through a PR

                When finished, output your result followed by this exact section:

                ## VAULT_OBSERVATIONS
                (List any durable knowledge gained — decisions made, patterns discovered, debugging insights)
                - [decision] ...
                - [pattern] ...
                - [debugging] ...
                - [learning] ...
                (Omit bullet types that don't apply. Leave section empty if nothing to record.)
                """.Trim();
        }

        // standalone
        return $"""
            {baseContext}
            {gitWorkflow}

            ## Your Task
            ### {title}

            {body}

            ---
            Follow the Git Workflow above — all changes go through a PR.
            When finished, briefly summarise what you did, the PR URL, and any issues encountered.
            """.Trim();
    }

    private static string GenerateBranchSlug(string title)
    {
        var slug = title.ToLowerInvariant()
            .Replace(' ', '-')
            .Replace('/', '-')
            .Replace('\\', '-');
        // Remove non-alphanumeric chars except hyphens
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\-]", "");
        // Collapse multiple hyphens and trim
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-{2,}", "-").Trim('-');
        // Truncate to reasonable length
        if (slug.Length > 50) slug = slug[..50].TrimEnd('-');
        return $"agent/{slug}";
    }

    private static string? ExtractObservations(string output)
    {
        const string marker = "## VAULT_OBSERVATIONS";
        var idx = output.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return null;
        var section = output[(idx + marker.Length)..].Trim();
        return string.IsNullOrWhiteSpace(section) ? null : section;
    }
}
