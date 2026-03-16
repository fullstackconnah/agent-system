// nexus-api/NexusApi/Services/PluginService.cs
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Models;

namespace NexusApi.Services;

public class PluginService(
    NexusDbContext db,
    IDockerService docker,
    ILogger<PluginService> log) : IPluginService
{
    public async Task InstallAsync(string name, string marketplaceName, CancellationToken ct = default)
    {
        log.LogInformation("Installing plugin {Name}@{Marketplace}", name, marketplaceName);

        // Run: claude plugin install name@marketplace
        await docker.RunPluginCommandAsync(["install", $"{name}@{marketplaceName}"], ct);

        var marketplace = await db.Marketplaces
            .FirstOrDefaultAsync(m => m.Name == marketplaceName, ct)
            ?? throw new InvalidOperationException($"Marketplace '{marketplaceName}' not found");

        var existing = await db.Plugins
            .FirstOrDefaultAsync(p => p.Name == name && p.MarketplaceId == marketplace.MarketplaceId, ct);

        if (existing is null)
        {
            db.Plugins.Add(new Plugin
            {
                Name = name,
                MarketplaceId = marketplace.MarketplaceId,
                Enabled = true,
            });
        }
        else
        {
            existing.Enabled = true;
        }

        await db.SaveChangesAsync(ct);
        log.LogInformation("Plugin {Name} installed", name);
    }

    public async Task UninstallAsync(string name, CancellationToken ct = default)
    {
        var plugin = await db.Plugins
            .Include(p => p.Marketplace)
            .FirstOrDefaultAsync(p => p.Name == name, ct)
            ?? throw new InvalidOperationException($"Plugin '{name}' not found");

        // claude plugin uninstall takes only the name, not name@marketplace format
        await docker.RunPluginCommandAsync(["uninstall", name], ct);
        db.Plugins.Remove(plugin);
        await db.SaveChangesAsync(ct);
        log.LogInformation("Plugin {Name} uninstalled", name);
    }
}
