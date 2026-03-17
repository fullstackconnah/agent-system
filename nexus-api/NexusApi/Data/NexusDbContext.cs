// nexus-api/NexusApi/Data/NexusDbContext.cs
using Microsoft.EntityFrameworkCore;
using NexusApi.Models;
using System.Text.Json;

namespace NexusApi.Data;

public class NexusDbContext(DbContextOptions<NexusDbContext> options) : DbContext(options)
{
    public DbSet<AgentTask> Tasks => Set<AgentTask>();
    public DbSet<AgentRun> Runs => Set<AgentRun>();
    public DbSet<LogEntry> Logs => Set<LogEntry>();
    public DbSet<Plugin> Plugins => Set<Plugin>();
    public DbSet<Marketplace> Marketplaces => Set<Marketplace>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // AgentTask
        mb.Entity<AgentTask>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(t => t.TaskId);
            e.Property(t => t.TaskId).UseIdentityAlwaysColumn();
            e.Property(t => t.ExternalId).IsRequired();
            e.HasIndex(t => t.ExternalId).IsUnique();
            e.HasIndex(t => t.Project);
            e.HasIndex(t => t.Status);
            e.HasIndex(t => new { t.Priority, t.Status });
            e.HasIndex(t => t.CreatedAt);
            e.Property(t => t.Priority)
             .HasDefaultValue("medium")
             .HasConversion<string>();
            e.Property(t => t.Status)
             .HasDefaultValue("pending")
             .HasConversion<string>();
            e.Property(t => t.TaskType)
             .HasDefaultValue("standalone")
             .HasConversion<string>();
            e.HasIndex(t => t.TaskType);
            e.HasMany(t => t.Subtasks)
             .WithOne(t => t.Parent)
             .HasForeignKey(t => t.ParentTaskId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // AgentRun
        mb.Entity<AgentRun>(e =>
        {
            e.ToTable("agent_runs");
            e.HasKey(r => r.RunId);
            e.Property(r => r.RunId).UseIdentityAlwaysColumn();
            e.HasOne(r => r.Task)
             .WithMany(t => t.Runs)
             .HasForeignKey(r => r.TaskId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(r => r.TaskId);
            e.HasIndex(r => r.Status);
            e.HasIndex(r => r.StartedAt);
        });

        // LogEntry
        mb.Entity<LogEntry>(e =>
        {
            e.ToTable("log_entries");
            e.HasKey(l => l.LogId);
            e.Property(l => l.LogId).UseIdentityAlwaysColumn();
            e.HasOne(l => l.Run)
             .WithMany(r => r.Logs)
             .HasForeignKey(l => l.RunId)
             .OnDelete(DeleteBehavior.SetNull)
             .IsRequired(false);
            e.HasIndex(l => l.Level);
            e.HasIndex(l => l.RunId);
            e.HasIndex(l => l.Ts).HasMethod("brin");
            // GIN index on Metadata jsonb — declared via raw SQL in migration
            e.Property(l => l.Metadata)
             .HasColumnType("jsonb")
             .HasConversion(
                v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                v => JsonSerializer.Deserialize<Dictionary<string, object>>(v, JsonSerializerOptions.Default) ?? new());
        });

        // Marketplace
        mb.Entity<Marketplace>(e =>
        {
            e.ToTable("marketplaces");
            e.HasKey(m => m.MarketplaceId);
            e.Property(m => m.MarketplaceId).UseIdentityAlwaysColumn();
            e.HasIndex(m => m.Name).IsUnique();
        });

        // Plugin
        mb.Entity<Plugin>(e =>
        {
            e.ToTable("plugins");
            e.HasKey(p => p.PluginId);
            e.Property(p => p.PluginId).UseIdentityAlwaysColumn();
            e.HasOne(p => p.Marketplace)
             .WithMany(m => m.Plugins)
             .HasForeignKey(p => p.MarketplaceId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(p => p.MarketplaceId);
            e.HasIndex(p => p.Enabled);
            e.HasIndex(p => new { p.Name, p.MarketplaceId }).IsUnique();
        });
    }
}
