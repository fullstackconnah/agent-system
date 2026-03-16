// nexus-api/NexusApi/Models/LogEntry.cs
namespace NexusApi.Models;

public class LogEntry
{
    public long LogId { get; set; }
    public DateTimeOffset Ts { get; set; } = DateTimeOffset.UtcNow;
    public string Level { get; set; } = "info";          // debug | info | warn | error
    public string Message { get; set; } = "";
    public string Source { get; set; } = "orchestrator"; // orchestrator | agent | plugin | system
    public long? RunId { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = [];

    public AgentRun? Run { get; set; }
}
