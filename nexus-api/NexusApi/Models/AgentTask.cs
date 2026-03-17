// nexus-api/NexusApi/Models/AgentTask.cs
namespace NexusApi.Models;

public class AgentTask
{
    public long TaskId { get; set; }
    public string ExternalId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Project { get; set; } = "";
    public string Priority { get; set; } = "medium";   // high | medium | low
    public string Status { get; set; } = "pending";    // pending | in_progress | done | failed
    public string? VaultNotePath { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    // Goal hierarchy
    public string TaskType { get; set; } = "standalone";   // goal | subtask | standalone
    public long? ParentTaskId { get; set; }
    public string? Summary { get; set; }

    public AgentTask? Parent { get; set; }
    public ICollection<AgentTask> Subtasks { get; set; } = [];

    public ICollection<AgentRun> Runs { get; set; } = [];
}
