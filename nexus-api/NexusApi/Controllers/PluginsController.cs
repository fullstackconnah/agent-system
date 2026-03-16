// nexus-api/NexusApi/Controllers/PluginsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/plugins")]
public class PluginsController(NexusDbContext db, IPluginService plugins, IMarketplaceService marketplaceSvc)
    : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var list = await db.Plugins.Include(p => p.Marketplace).ToListAsync();
        return Ok(list.Select(ToResponse));
    }

    [HttpPost("install")]
    public async Task<IActionResult> Install([FromBody] InstallPluginRequest req)
    {
        try
        {
            await plugins.InstallAsync(req.Name, req.Marketplace);
            return Ok(new { status = "installed" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{name}")]
    public async Task<IActionResult> Uninstall(string name)
    {
        try
        {
            await plugins.UninstallAsync(name);
            return Ok(new { status = "uninstalled" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPatch("{name}/toggle")]
    public async Task<IActionResult> Toggle(string name, [FromBody] TogglePluginRequest req)
    {
        var plugin = await db.Plugins.Include(p => p.Marketplace).FirstOrDefaultAsync(p => p.Name == name);
        if (plugin is null) return NotFound();
        plugin.Enabled = req.Enabled;
        await db.SaveChangesAsync();
        return Ok(ToResponse(plugin));
    }

    [HttpGet("browse")]
    public async Task<IActionResult> Browse([FromQuery(Name = "marketplace")] string? marketplace, [FromQuery] string? q)
    {
        // marketplace param is required for browsing — without it we don't know which catalog to fetch
        if (string.IsNullOrEmpty(marketplace))
            return BadRequest(new { error = "marketplace query parameter is required" });
        var mkt = await db.Marketplaces.FirstOrDefaultAsync(m => m.Name == marketplace);
        if (mkt is null) return NotFound(new { error = $"Marketplace '{marketplace}' not found" });

        var rawUrl = MarketplaceService.BuildRawUrl(mkt.SourceType, mkt.SourceUrl);
        var catalog = await marketplaceSvc.FetchCatalogAsync(rawUrl);
        var filtered = string.IsNullOrEmpty(q)
            ? catalog
            : catalog.Where(p => p.Name.Contains(q, StringComparison.OrdinalIgnoreCase)
                               || (p.Description?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false));
        return Ok(filtered);
    }

    private static PluginResponse ToResponse(Plugin p) => new(
        p.PluginId, p.Name, p.Marketplace?.Name ?? "", p.Version,
        p.Description, p.HomepageUrl, p.Enabled, p.Scope, p.InstalledAt);
}
