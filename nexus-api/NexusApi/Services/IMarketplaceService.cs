// nexus-api/NexusApi/Services/IMarketplaceService.cs
namespace NexusApi.Services;

public record MarketplacePlugin(string Name, string? Description, string? Homepage, string? Version);

public interface IMarketplaceService
{
    Task<IReadOnlyList<MarketplacePlugin>> FetchCatalogAsync(string rawUrl, CancellationToken ct = default);
}
