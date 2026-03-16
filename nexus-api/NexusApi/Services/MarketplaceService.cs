// nexus-api/NexusApi/Services/MarketplaceService.cs
using System.Text.Json;

namespace NexusApi.Services;

public class MarketplaceService(HttpClient http, ILogger<MarketplaceService>? log = null) : IMarketplaceService
{
    public async Task<IReadOnlyList<MarketplacePlugin>> FetchCatalogAsync(string rawUrl, CancellationToken ct = default)
    {
        try
        {
            var json = await http.GetStringAsync(rawUrl, ct);
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("plugins", out var plugins))
                return [];
            return plugins.EnumerateArray()
                .Select(p => new MarketplacePlugin(
                    p.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
                    p.TryGetProperty("description", out var d) ? d.GetString() : null,
                    // Claude Code marketplace.json uses "homepage_url" not "homepage"
                    p.TryGetProperty("homepage_url", out var h) ? h.GetString() : null,
                    p.TryGetProperty("version", out var v) ? v.GetString() : null))
                .Where(p => !string.IsNullOrEmpty(p.Name))
                .ToList();
        }
        catch (Exception ex)
        {
            log?.LogWarning("Marketplace fetch failed for {Url}: {Error}", rawUrl, ex.Message);
            return [];
        }
    }

    /// <summary>Build raw GitHub URL for a marketplace.json in owner/repo format.</summary>
    public static string BuildRawUrl(string sourceType, string sourceUrl) => sourceType switch
    {
        "github" => $"https://raw.githubusercontent.com/{sourceUrl}/main/.claude-plugin/marketplace.json",
        _ => sourceUrl
    };
}
