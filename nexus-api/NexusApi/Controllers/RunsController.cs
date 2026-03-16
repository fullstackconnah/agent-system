// nexus-api/NexusApi/Controllers/RunsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Models;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/runs")]
public class RunsController(NexusDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? project, [FromQuery] int limit = 50)
    {
        var q = db.Runs.Include(r => r.Task).AsQueryable();
        if (!string.IsNullOrEmpty(project))
            q = q.Where(r => r.Task.Project == project);
        var runs = await q.OrderByDescending(r => r.StartedAt).Take(Math.Min(limit, 200)).ToListAsync();
        return Ok(runs.Select(ToResponse));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var run = await db.Runs.Include(r => r.Task).FirstOrDefaultAsync(r => r.RunId == id);
        return run is null ? NotFound() : Ok(ToResponse(run));
    }

    private static RunResponse ToResponse(AgentRun r) => new(
        r.RunId, r.TaskId, r.Status, r.ContainerId, r.ExitCode,
        r.Output, r.StartedAt, r.CompletedAt);
}
