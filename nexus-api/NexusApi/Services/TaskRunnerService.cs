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
        var baseContext = $"""
            ## Project Conventions
            {(string.IsNullOrEmpty(conventions) ? "No conventions loaded." : conventions)}

            ## Project Memory
            {(string.IsNullOrEmpty(memory) ? "No prior memory for this project." : memory)}
            """;

        if (taskType == "subtask")
        {
            return $"""
                {baseContext}

                ## Your Task
                ### {title}

                {body}

                ---
                You are a sub-orchestrator. Your responsibilities:
                1. Use the Task tool to delegate work to specialist subagents where appropriate
                2. If a subagent fails, analyse the failure output and retry with a modified approach
                3. Complete the task fully before reporting back

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

            ## Your Task
            ### {title}

            {body}

            ---
            When finished, briefly summarise what you did and any issues encountered.
            """.Trim();
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
