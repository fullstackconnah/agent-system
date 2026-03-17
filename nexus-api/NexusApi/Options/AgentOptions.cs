// nexus-api/NexusApi/Options/AgentOptions.cs
namespace NexusApi.Options;

public class AgentOptions
{
    public const string Section = "Agent";

    public string VaultPath { get; set; } = "/vault";
    public string ProjectsPath { get; set; } = "/projects";
    public string HostVaultPath { get; set; } = "/vault";
    public string HostProjectsPath { get; set; } = "/projects";
    public string ClaudeCreds { get; set; } = "/claude-creds";
    public string HostClaudeCreds { get; set; } = "/claude-creds";
    public string AgentImage { get; set; } = "ghcr.io/fullstackconnah/claude-agent:latest";
    public string? AnthropicApiKey { get; set; }
    public string? GithubToken { get; set; }
    public int AgentMemoryMb { get; set; } = 512;
    public double AgentCpus { get; set; } = 1.0;
    public int MaxConcurrentAgents { get; set; } = 3;
    public string OrchestratorModel { get; set; } = "claude-opus-4-6";
}
