// nexus-api/NexusApi/Controllers/MarketplacesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/marketplaces")]
public class MarketplacesController(NexusDbContext db, IMarketplaceService marketplace)
    : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var list = await db.Marketplaces.ToListAsync();
        return Ok(list.Select(ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddMarketplaceRequest req)
    {
        if (await db.Marketplaces.AnyAsync(m => m.Name == req.Name))
            return Conflict(new { error = $"Marketplace '{req.Name}' already exists" });

        var mkt = new Marketplace
        {
            Name = req.Name,
            SourceType = req.SourceType,
            SourceUrl = req.SourceUrl,
            AutoUpdate = req.AutoUpdate,
        };
        db.Marketplaces.Add(mkt);
        await db.SaveChangesAsync();
        return Created($"/api/marketplaces/{mkt.MarketplaceId}", ToResponse(mkt));
    }

    [HttpDelete("{name}")]
    public async Task<IActionResult> Remove(string name)
    {
        var mkt = await db.Marketplaces.FirstOrDefaultAsync(m => m.Name == name);
        if (mkt is null) return NotFound();
        db.Marketplaces.Remove(mkt);
        await db.SaveChangesAsync();
        return Ok(new { status = "removed" });
    }

    [HttpPost("{name}/update")]
    public async Task<IActionResult> Update(string name)
    {
        var mkt = await db.Marketplaces.FirstOrDefaultAsync(m => m.Name == name);
        if (mkt is null) return NotFound();
        mkt.LastUpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToResponse(mkt));
    }

    private static MarketplaceResponse ToResponse(Marketplace m) => new(
        m.MarketplaceId, m.Name, m.SourceType, m.SourceUrl,
        m.AutoUpdate, m.AddedAt, m.LastUpdatedAt);
}
