// nexus-api/NexusApi/Services/IDecompositionService.cs
namespace NexusApi.Services;

public record SubtaskSpec(string Title, string Body);

public interface IDecompositionService
{
    Task<IReadOnlyList<SubtaskSpec>> DecomposeAsync(string goalTitle, string goalBody, string project, CancellationToken ct = default);
}
