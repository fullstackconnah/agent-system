// nexus-api/NexusApi/Models/Plugin.cs
namespace NexusApi.Models;

public class Plugin
{
    public long PluginId { get; set; }
    public long MarketplaceId { get; set; }
    public string Name { get; set; } = "";
    public string? Version { get; set; }
    public string? Description { get; set; }
    public string? HomepageUrl { get; set; }
    public bool Enabled { get; set; } = true;
    public string Scope { get; set; } = "user";   // user | project | local
    public DateTimeOffset InstalledAt { get; set; } = DateTimeOffset.UtcNow;

    public Marketplace Marketplace { get; set; } = null!;
}
