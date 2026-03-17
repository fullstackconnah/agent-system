// nexus-api/NexusApi/Services/GoalOrchestrationService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Options;
using System.Text;
using System.Text.Json;

namespace NexusApi.Services;

public class GoalOrchestrationService(
    IServiceScopeFactory scopeFactory,
    IOptions<AgentOptions> opts,
    IHttpClientFactory httpClientFactory,
    ILogger<GoalOrchestrationService> log) : BackgroundService
{
    private readonly AgentOptions _opts = opts.Value;
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingGoalsAsync(ct);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                log.LogError(ex, "GoalOrchestrator error: {Message}", ex.Message);
            }
            await Task.Delay(TimeSpan.FromSeconds(30), ct);
        }
    }

    private async Task ProcessPendingGoalsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var pendingGoals = await db.Tasks
            .Where(t => t.TaskType == "goal" && t.Status == "pending")
            .OrderBy(t => t.CreatedAt)
            .ToListAsync(ct);

        foreach (var goal in pendingGoals)
        {
            if (ct.IsCancellationRequested) break;
            await OrchestrateGoalAsync(goal.TaskId, ct);
        }
    }

    private async Task OrchestrateGoalAsync(long goalId, CancellationToken ct)
    {
        log.LogInformation("GoalOrchestrator: starting goal {GoalId}", goalId);

        // --- Phase 1: Decompose ---
        List<AgentTask> subtasks;
        using (var scope = scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var vault = scope.ServiceProvider.GetRequiredService<IVaultService>();
            var decomposer = scope.ServiceProvider.GetRequiredService<IDecompositionService>();

            var goal = await db.Tasks.FindAsync([goalId], ct);
            if (goal is null) return;

            goal.Status = "in_progress";
            goal.StartedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);

            var specs = await decomposer.DecomposeAsync(goal.Title, goal.Body, goal.Project, ct);
            log.LogInformation("GoalOrchestrator: decomposed goal {GoalId} into {Count} subtasks", goalId, specs.Count);

            subtasks = specs.Select(s => new AgentTask
            {
                ExternalId = $"{DateTime.UtcNow:yyyy-MM-dd}-{Guid.NewGuid().ToString()[..8]}",
                Title = s.Title,
                Body = s.Body,
                Project = goal.Project,
                Priority = "high",
                TaskType = "subtask",
                ParentTaskId = goalId,
            }).ToList();

            if (subtasks.Count == 0)
            {
                goal.Status = "failed";
                goal.CompletedAt = DateTimeOffset.UtcNow;
                goal.Summary = "Decomposition returned no subtasks.";
                await db.SaveChangesAsync(ct);
                log.LogWarning("GoalOrchestrator: goal {GoalId} failed — decomposition returned no subtasks", goalId);
                return;
            }

            db.Tasks.AddRange(subtasks);
            await db.SaveChangesAsync(ct);

            await vault.WriteGoalNoteAsync(
                goal.ExternalId, goal.Title, goal.Project, "in_progress", null,
                specs.Select(s => s.Title));
        }

        // --- Phase 2: Run subtasks concurrently up to MaxConcurrentAgents ---
        var semaphore = new SemaphoreSlim(Math.Max(1, _opts.MaxConcurrentAgents));
        var subtaskIds = subtasks.Select(s => s.TaskId).ToList();
        var runTasks = subtaskIds.Select(async subtaskId =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                using var scope = scopeFactory.CreateScope();
                var runner = scope.ServiceProvider.GetRequiredService<TaskRunnerService>();
                await runner.RunAsync(subtaskId, ct);
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(runTasks);

        // --- Phase 3: Synthesize ---
        await SynthesizeGoalAsync(goalId, ct);
    }

    private async Task SynthesizeGoalAsync(long goalId, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var vault = scope.ServiceProvider.GetRequiredService<IVaultService>();

        var goal = await db.Tasks
            .Include(t => t.Subtasks).ThenInclude(s => s.Runs)
            .FirstOrDefaultAsync(t => t.TaskId == goalId, ct);

        if (goal is null) return;

        var subtaskOutputs = goal.Subtasks
            .Select(s => $"### {s.Title}\nStatus: {s.Status}\n{s.Runs.OrderByDescending(r => r.StartedAt).FirstOrDefault()?.Output ?? "(no output)"}")
            .ToList();

        var summary = await CallSynthesisApiAsync(goal.Title, subtaskOutputs, ct);

        goal.Summary = summary;
        goal.Status = goal.Subtasks.All(s => s.Status == "done") ? "done" : "failed";
        goal.CompletedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await vault.WriteGoalNoteAsync(
            goal.ExternalId, goal.Title, goal.Project, goal.Status, summary,
            goal.Subtasks.Select(s => $"{s.Title} ({s.Status})"));

        log.LogInformation("GoalOrchestrator: goal {GoalId} {Status}", goalId, goal.Status);
    }

    private async Task<string> CallSynthesisApiAsync(string goalTitle, List<string> subtaskOutputs, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(_opts.AnthropicApiKey))
            return $"Goal '{goalTitle}' completed. {subtaskOutputs.Count} subtasks processed.";

        try
        {
            var prompt = $"""
                Produce a concise summary (3-5 sentences) of what was accomplished for this goal.

                Goal: {goalTitle}

                Subtask Results:
                {string.Join("\n\n", subtaskOutputs)}
                """;

            var body = JsonSerializer.Serialize(new
            {
                model = _opts.OrchestratorModel,
                max_tokens = 512,
                messages = new[] { new { role = "user", content = prompt } }
            });

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", _opts.AnthropicApiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(body, Encoding.UTF8, "application/json");

            using var http = _httpClientFactory.CreateClient();
            var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString()
                   ?? $"Goal '{goalTitle}' completed.";
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Synthesis API call failed");
            return $"Goal '{goalTitle}' processed. {subtaskOutputs.Count} subtasks completed.";
        }
    }
}
