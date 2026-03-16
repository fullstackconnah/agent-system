// nexus-api/NexusApi/Controllers/SystemController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NexusApi.Models;
using NexusApi.Options;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api")]
public class SystemController(
    IDockerService docker,
    IOptions<AgentOptions> opts,
    LogBuffer logBuffer) : ControllerBase
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
    public IActionResult Logs([FromQuery] int offset = 0, [FromQuery] int limit = 200)
    {
        var (lines, _) = logBuffer.Read(offset, limit);
        return Ok(new LogsResponse(lines, offset + lines.Count));
    }
}
