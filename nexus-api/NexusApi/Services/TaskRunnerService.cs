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

    public async Task RunAsync(AgentTask task, CancellationToken ct = default)
    {
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
            var prompt = BuildPrompt(task.Title, task.Body, memory, conventions);
            var projectPath = Path.Combine(_opts.ProjectsPath, task.Project);

            var output = await docker.RunAgentAsync(prompt, projectPath, ct);
            var truncated = output.Length > 10_000 ? output[..10_000] : output;

            run.Status = "completed";
            run.Output = truncated;
            run.ExitCode = 0;

            task.Status = "done";
            task.CompletedAt = DateTimeOffset.UtcNow;

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

    private static string BuildPrompt(string title, string body, string memory, string conventions) => $"""
        ## Project Conventions
        {(string.IsNullOrEmpty(conventions) ? "No conventions loaded." : conventions)}

        ## Project Memory
        {(string.IsNullOrEmpty(memory) ? "No prior memory for this project." : memory)}

        ## Your Task
        ### {title}

        {body}

        ---
        When finished, briefly summarise what you did and any issues encountered.
        """.Trim();
}
