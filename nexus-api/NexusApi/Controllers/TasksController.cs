// nexus-api/NexusApi/Controllers/TasksController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController(NexusDbContext db, IServiceScopeFactory scopeFactory, ILogger<TasksController> log)
    : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Body) || string.IsNullOrWhiteSpace(req.Project))
            return BadRequest(new { error = "title, body and project are required" });

        var task = new AgentTask
        {
            ExternalId = $"{DateTime.UtcNow:yyyy-MM-dd}-{Guid.NewGuid().ToString()[..8]}",
            Title = req.Title,
            Body = req.Body,
            Project = req.Project,
            Priority = req.Priority,
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // Fire-and-forget using a new scope — avoids ObjectDisposedException when request scope ends
        var taskId = task.TaskId;
        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var runner = scope.ServiceProvider.GetRequiredService<TaskRunnerService>();
            var scopedDb = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var freshTask = await scopedDb.Tasks.FindAsync(taskId);
            if (freshTask is not null)
                await runner.RunAsync(freshTask, CancellationToken.None);
        });

        return Accepted(new { status = "accepted", message = "Task queued" });
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var q = db.Tasks.Include(t => t.Runs).AsQueryable();
        if (!string.IsNullOrEmpty(status))
            q = q.Where(t => t.Status == status);
        var tasks = await q.OrderByDescending(t => t.CreatedAt).Take(100).ToListAsync();
        return Ok(tasks.Select(ToResponse));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var task = await db.Tasks.Include(t => t.Runs).FirstOrDefaultAsync(t => t.TaskId == id);
        return task is null ? NotFound() : Ok(ToResponse(task));
    }

    private static TaskResponse ToResponse(AgentTask t) => new(
        t.TaskId, t.ExternalId, t.Title, t.Project, t.Priority, t.Status,
        t.VaultNotePath, t.CreatedAt, t.StartedAt, t.CompletedAt,
        t.Runs.Select(r => new RunSummary(r.RunId, r.Status, r.StartedAt, r.CompletedAt)));
}
