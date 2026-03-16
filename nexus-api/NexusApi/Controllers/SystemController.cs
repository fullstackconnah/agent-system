// nexus-api/NexusApi/Controllers/SystemController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Options;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api")]
public class SystemController(
    NexusDbContext db,
    IDockerService docker,
    IOptions<AgentOptions> opts) : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health() => Ok(new HealthResponse(
        "ok",
        string.IsNullOrEmpty(opts.Value.AnthropicApiKey) ? "oauth" : "api-key",
        DateTimeOffset.UtcNow));

    [HttpGet("containers")]
    public async Task<IActionResult> Containers()
    {
        var containers = await docker.ListAgentContainersAsync();
        return Ok(containers);
    }

    [HttpGet("logs")]
    public async Task<IActionResult> Logs([FromQuery] int offset = 0, [FromQuery] int limit = 200)
    {
        var total = await db.Logs.CountAsync();
        var entries = await db.Logs
            .OrderBy(l => l.Ts)
            .Skip(offset)
            .Take(Math.Min(limit, 500))
            .Select(l => $"[{l.Ts:HH:mm:ss}] {l.Level.ToUpper()} {l.Source}: {l.Message}")
            .ToListAsync();
        return Ok(new LogsResponse(entries, offset + entries.Count));
    }
}
