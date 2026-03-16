// nexus-api/NexusApi/Models/AgentRun.cs
namespace NexusApi.Models;

public class AgentRun
{
    public long RunId { get; set; }
    public long TaskId { get; set; }
    public string Status { get; set; } = "running";   // running | completed | failed
    public string? ContainerId { get; set; }
    public int? ExitCode { get; set; }
    public string? Output { get; set; }
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }

    public AgentTask Task { get; set; } = null!;
    public ICollection<LogEntry> Logs { get; set; } = [];
}
