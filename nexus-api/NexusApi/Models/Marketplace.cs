// nexus-api/NexusApi/Models/Marketplace.cs
namespace NexusApi.Models;

public class Marketplace
{
    public long MarketplaceId { get; set; }
    public string Name { get; set; } = "";
    public string SourceType { get; set; } = "";   // github | git_url | local_path | remote_url
    public string SourceUrl { get; set; } = "";
    public bool AutoUpdate { get; set; } = false;
    public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastUpdatedAt { get; set; }

    public ICollection<Plugin> Plugins { get; set; } = [];
}
