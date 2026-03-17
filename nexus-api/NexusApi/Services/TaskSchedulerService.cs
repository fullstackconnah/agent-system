// nexus-api/NexusApi/Services/TaskSchedulerService.cs
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;

namespace NexusApi.Services;

public class TaskSchedulerService(
    IServiceScopeFactory scopeFactory,
    ILogger<TaskSchedulerService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(2), ct);
            try
            {
                await DrainPendingAsync(ct);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                log.LogError(ex, "Scheduler error: {Message}", ex.Message);
            }
        }
    }

    private async Task DrainPendingAsync(CancellationToken ct)
    {
        // Drain ALL pending tasks per tick (not just one) to avoid 2-min gaps in backlog situations
        while (!ct.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var runner = scope.ServiceProvider.GetRequiredService<TaskRunnerService>();

            var pending = await db.Tasks
                .Where(t => t.Status == "pending" && t.TaskType != "goal")
                .OrderBy(t => t.Priority == "high" ? 0 : t.Priority == "medium" ? 1 : 2)
                .ThenBy(t => t.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (pending is null) break;

            log.LogInformation("Scheduler: running task {Id}", pending.ExternalId);
            await runner.RunAsync(pending.TaskId, ct);
        }
    }
}
