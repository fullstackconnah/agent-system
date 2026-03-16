// nexus-api/NexusApi/Services/IDockerService.cs
namespace NexusApi.Services;

public record ContainerInfo(string Id, string Name, string Image, string Status, long Created);

public interface IDockerService
{
    Task<string> RunAgentAsync(string prompt, string projectPath, CancellationToken ct = default);
    Task<string> RunPluginCommandAsync(string[] args, CancellationToken ct = default);
    Task<IReadOnlyList<ContainerInfo>> ListAgentContainersAsync(CancellationToken ct = default);
}
