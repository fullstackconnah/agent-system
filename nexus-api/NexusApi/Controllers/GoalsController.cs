// nexus-api/NexusApi/Controllers/GoalsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Models;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/goals")]
public class GoalsController(NexusDbContext db, ILogger<GoalsController> log) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoalRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Body) || string.IsNullOrWhiteSpace(req.Project))
            return BadRequest(new { error = "title, body and project are required" });

        var goal = new AgentTask
        {
            ExternalId = $"{DateTime.UtcNow:yyyy-MM-dd}-{Guid.NewGuid().ToString()[..8]}",
            Title = req.Title,
            Body = req.Body,
            Project = req.Project,
            Priority = "high",
            TaskType = "goal",
        };
        db.Tasks.Add(goal);
        await db.SaveChangesAsync();

        log.LogInformation("Goal created: {ExternalId} — {Title}", goal.ExternalId, goal.Title);
        return Accepted(ToResponse(goal, []));
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var q = db.Tasks
            .Include(t => t.Subtasks)
            .Where(t => t.TaskType == "goal");

        if (!string.IsNullOrEmpty(status))
            q = q.Where(t => t.Status == status);

        var goals = await q.OrderByDescending(t => t.CreatedAt).Take(50).ToListAsync();
        return Ok(goals.Select(g => ToResponse(g, g.Subtasks)));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var goal = await db.Tasks
            .Include(t => t.Subtasks)
            .FirstOrDefaultAsync(t => t.TaskId == id && t.TaskType == "goal");
        return goal is null ? NotFound() : Ok(ToResponse(goal, goal.Subtasks));
    }

    private static GoalResponse ToResponse(AgentTask g, IEnumerable<AgentTask> subtasks) => new(
        g.TaskId, g.ExternalId, g.Title, g.Body, g.Project,
        g.Status, g.Summary,
        g.CreatedAt, g.StartedAt, g.CompletedAt,
        subtasks.Select(s => new SubtaskSummary(
            s.TaskId, s.ExternalId, s.Title,
            s.Status, s.Summary,
            s.CreatedAt, s.CompletedAt)));
}
