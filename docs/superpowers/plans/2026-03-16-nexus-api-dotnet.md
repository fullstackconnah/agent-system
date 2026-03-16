# Nexus API (.NET) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Node.js/Express orchestrator with a .NET 9 ASP.NET Core Web API that handles task orchestration, Docker agent spawning, Claude plugin management, PostgreSQL persistence, and vault integration.

**Architecture:** ASP.NET Core 9 Web API with EF Core + Npgsql for PostgreSQL, Docker.DotNet for container management, Serilog for structured logging. Plugin installs run by spawning a short-lived claude-agent container with `~/.claude` mounted read-write. The Obsidian vault is retained as the agent knowledge base.

**Tech Stack:** .NET 9, ASP.NET Core 9, EF Core 9 + Npgsql, Docker.DotNet 3.x, Serilog + Serilog.Sinks.PostgreSQL, YamlDotNet, xUnit + Moq + Microsoft.AspNetCore.Mvc.Testing, PostgreSQL 17

**Spec:** `docs/superpowers/specs/2026-03-16-nexus-api-dotnet-design.md`

---

## File Map

### New files — `nexus-api/`

| File | Responsibility |
|------|---------------|
| `nexus-api/NexusApi/NexusApi.csproj` | Project file, NuGet dependencies |
| `nexus-api/NexusApi/Program.cs` | App bootstrap, DI, middleware, DB migration on startup |
| `nexus-api/NexusApi/appsettings.json` | Default config (ports, empty connection string) |
| `nexus-api/NexusApi/appsettings.Development.json` | Dev config (local Postgres, detailed logging) |
| `nexus-api/NexusApi/Options/AgentOptions.cs` | Strongly-typed env var config (vault paths, agent image, etc.) |
| `nexus-api/NexusApi/Data/NexusDbContext.cs` | EF Core DbContext — all 5 entities |
| `nexus-api/NexusApi/Models/AgentTask.cs` | Task entity (`tasks` table) |
| `nexus-api/NexusApi/Models/AgentRun.cs` | Run entity (`agent_runs` table) |
| `nexus-api/NexusApi/Models/LogEntry.cs` | Log entity (`log_entries` table) |
| `nexus-api/NexusApi/Models/Plugin.cs` | Plugin entity (`plugins` table) |
| `nexus-api/NexusApi/Models/Marketplace.cs` | Marketplace entity (`marketplaces` table) |
| `nexus-api/NexusApi/Models/Dtos.cs` | All request/response DTOs in one file |
| `nexus-api/NexusApi/Services/IDockerService.cs` | Interface for Docker operations |
| `nexus-api/NexusApi/Services/DockerService.cs` | Docker.DotNet — spawn agent containers, list containers |
| `nexus-api/NexusApi/Services/IVaultService.cs` | Interface for vault read/write |
| `nexus-api/NexusApi/Services/VaultService.cs` | Read project memory, write run notes as .md |
| `nexus-api/NexusApi/Services/IMarketplaceService.cs` | Interface for marketplace catalog fetching |
| `nexus-api/NexusApi/Services/MarketplaceService.cs` | HTTP fetch of marketplace.json from GitHub/URLs |
| `nexus-api/NexusApi/Services/IPluginService.cs` | Interface for plugin install/uninstall |
| `nexus-api/NexusApi/Services/PluginService.cs` | Plugin management — spawns claude-agent container |
| `nexus-api/NexusApi/Services/TaskRunnerService.cs` | Orchestrate one task: build prompt, spawn container, update DB, write vault |
| `nexus-api/NexusApi/Services/TaskSchedulerService.cs` | IHostedService — 2-min cron polling pending tasks |
| `nexus-api/NexusApi/Controllers/TasksController.cs` | POST /api/tasks, GET /api/tasks, GET /api/tasks/{id} |
| `nexus-api/NexusApi/Controllers/RunsController.cs` | GET /api/runs, GET /api/runs/{id} |
| `nexus-api/NexusApi/Controllers/PluginsController.cs` | Plugin CRUD + browse |
| `nexus-api/NexusApi/Controllers/MarketplacesController.cs` | Marketplace CRUD + update |
| `nexus-api/NexusApi/Controllers/SystemController.cs` | /api/health, /api/containers, /api/logs |
| `nexus-api/NexusApi/Controllers/RepositoriesController.cs` | /api/repositories, /api/repositories/github, /api/repositories/clone |
| `nexus-api/NexusApi.Tests/NexusApi.Tests.csproj` | Test project |
| `nexus-api/NexusApi.Tests/Services/VaultServiceTests.cs` | Vault read/write tests |
| `nexus-api/NexusApi.Tests/Services/MarketplaceServiceTests.cs` | Marketplace fetch tests |
| `nexus-api/NexusApi.Tests/Controllers/TasksControllerTests.cs` | Tasks API tests |
| `nexus-api/Dockerfile` | Multi-stage .NET 9 build |

### Modified files

| File | Change |
|------|--------|
| `docker-compose.yml` | Add `nexus-api` + `db` services; remove `orchestrator` after migration |
| `.github/workflows/build.yml` | Add nexus-api build + push job |
| `orchestrator/client/vite.config.js` | Proxy `/api` → `localhost:3001` |
| `orchestrator/client/src/hooks/useApi.js` | Update all API paths to `/api/*` with query-param status filter |

---

## Chunk 1: Project Scaffold, Models, Database

### Task 1: Create .NET solution and project

**Files:**
- Create: `nexus-api/NexusApi/NexusApi.csproj`
- Create: `nexus-api/NexusApi.Tests/NexusApi.Tests.csproj`
- Create: `nexus-api/NexusApi.sln`

- [ ] **Step 1: Scaffold the solution**

```bash
cd nexus-api
dotnet new webapi -n NexusApi --framework net9.0 --no-openapi false
dotnet new xunit -n NexusApi.Tests
dotnet new sln -n NexusApi
dotnet sln add NexusApi/NexusApi.csproj
dotnet sln add NexusApi.Tests/NexusApi.Tests.csproj
dotnet add NexusApi.Tests/NexusApi.Tests.csproj reference NexusApi/NexusApi.csproj
```

- [ ] **Step 2: Add NuGet packages to NexusApi**

```bash
cd NexusApi
dotnet add package Microsoft.EntityFrameworkCore --version 9.*
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 9.*
dotnet add package Microsoft.EntityFrameworkCore.Design --version 9.*
dotnet add package Serilog.AspNetCore --version 8.*
dotnet add package Serilog.Sinks.PostgreSQL --version 2.*
dotnet add package Docker.DotNet --version 3.125.*
dotnet add package YamlDotNet --version 16.*
```

- [ ] **Step 3: Add NuGet packages to NexusApi.Tests**

```bash
cd ../NexusApi.Tests
dotnet add package Moq --version 4.*
dotnet add package Microsoft.AspNetCore.Mvc.Testing --version 9.*
dotnet add package Microsoft.EntityFrameworkCore.InMemory --version 9.*
dotnet add package FluentAssertions --version 6.*
```

- [ ] **Step 4: Delete the scaffolded placeholder files**

Delete `NexusApi/Controllers/WeatherForecastController.cs` and `NexusApi/WeatherForecast.cs`.

- [ ] **Step 5: Verify solution builds**

```bash
cd nexus-api
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add nexus-api/
git commit -m "chore: scaffold nexus-api .NET 9 solution"
```

---

### Task 2: Configuration and options

**Files:**
- Create: `nexus-api/NexusApi/Options/AgentOptions.cs`
- Modify: `nexus-api/NexusApi/appsettings.json`
- Create: `nexus-api/NexusApi/appsettings.Development.json`

- [ ] **Step 1: Create AgentOptions**

```csharp
// nexus-api/NexusApi/Options/AgentOptions.cs
namespace NexusApi.Options;

public class AgentOptions
{
    public const string Section = "Agent";

    public string VaultPath { get; set; } = "/vault";
    public string ProjectsPath { get; set; } = "/projects";
    public string HostVaultPath { get; set; } = "/vault";
    public string HostProjectsPath { get; set; } = "/projects";
    public string ClaudeCreds { get; set; } = "/claude-creds";
    public string HostClaudeCreds { get; set; } = "/claude-creds";
    public string AgentImage { get; set; } = "ghcr.io/fullstackconnah/claude-agent:latest";
    public string? AnthropicApiKey { get; set; }
    public string? GithubToken { get; set; }
    public int AgentMemoryMb { get; set; } = 512;
    public double AgentCpus { get; set; } = 1.0;
}
```

- [ ] **Step 2: Write appsettings.json**

```json
{
  "Serilog": {
    "MinimumLevel": { "Default": "Information" }
  },
  "Agent": {
    "VaultPath": "/vault",
    "ProjectsPath": "/projects",
    "HostVaultPath": "/vault",
    "HostProjectsPath": "/projects",
    "ClaudeCreds": "/claude-creds",
    "HostClaudeCreds": "/claude-creds",
    "AgentImage": "ghcr.io/fullstackconnah/claude-agent:latest",
    "AgentMemoryMb": 512,
    "AgentCpus": 1.0
  }
}
```

- [ ] **Step 3: Write appsettings.Development.json**

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=nexus_dev;Username=nexus;Password=nexus"
  },
  "Serilog": {
    "MinimumLevel": { "Default": "Debug" }
  }
}
```

- [ ] **Step 4: Bind env vars to AgentOptions in Program.cs** (temporary stub — full Program.cs written in Task 8)

Verify `AgentOptions` properties match all env vars from the spec (`VAULT_PATH`, `PROJECTS_PATH`, `HOST_VAULT_PATH`, `HOST_PROJECTS_PATH`, `CLAUDE_CREDS`, `HOST_CLAUDE_CREDS`, `AGENT_IMAGE`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`).

- [ ] **Step 5: Commit**

```bash
git add nexus-api/NexusApi/Options/ nexus-api/NexusApi/appsettings*.json
git commit -m "feat: add AgentOptions configuration binding"
```

---

### Task 3: Domain models

**Files:**
- Create: `nexus-api/NexusApi/Models/AgentTask.cs`
- Create: `nexus-api/NexusApi/Models/AgentRun.cs`
- Create: `nexus-api/NexusApi/Models/LogEntry.cs`
- Create: `nexus-api/NexusApi/Models/Plugin.cs`
- Create: `nexus-api/NexusApi/Models/Marketplace.cs`

- [ ] **Step 1: Create AgentTask**

```csharp
// nexus-api/NexusApi/Models/AgentTask.cs
namespace NexusApi.Models;

public class AgentTask
{
    public long TaskId { get; set; }
    public string ExternalId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Project { get; set; } = "";
    public string Priority { get; set; } = "medium";   // high | medium | low
    public string Status { get; set; } = "pending";    // pending | in_progress | done | failed
    public string? VaultNotePath { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public ICollection<AgentRun> Runs { get; set; } = [];
}
```

- [ ] **Step 2: Create AgentRun**

```csharp
// nexus-api/NexusApi/Models/AgentRun.cs
namespace NexusApi.Models;

public class AgentRun
{
    public long RunId { get; set; }
    public long TaskId { get; set; }
    public string Status { get; set; } = "running";   // running | completed | failed
    public string? ContainerId { get; set; }
    public int? ExitCode { get; set; }
    public string? Output { get; set; }
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }

    public AgentTask Task { get; set; } = null!;
    public ICollection<LogEntry> Logs { get; set; } = [];
}
```

- [ ] **Step 3: Create LogEntry**

```csharp
// nexus-api/NexusApi/Models/LogEntry.cs
namespace NexusApi.Models;

public class LogEntry
{
    public long LogId { get; set; }
    public DateTimeOffset Ts { get; set; } = DateTimeOffset.UtcNow;
    public string Level { get; set; } = "info";          // debug | info | warn | error
    public string Message { get; set; } = "";
    public string Source { get; set; } = "orchestrator"; // orchestrator | agent | plugin | system
    public long? RunId { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = [];

    public AgentRun? Run { get; set; }
}
```

- [ ] **Step 4: Create Marketplace**

```csharp
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
```

- [ ] **Step 5: Create Plugin**

```csharp
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
```

- [ ] **Step 6: Commit**

```bash
git add nexus-api/NexusApi/Models/
git commit -m "feat: add domain models (AgentTask, AgentRun, LogEntry, Plugin, Marketplace)"
```

---

### Task 4: DbContext and EF Core configuration

**Files:**
- Create: `nexus-api/NexusApi/Data/NexusDbContext.cs`

- [ ] **Step 1: Write the DbContext**

```csharp
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
```

- [ ] **Step 2: Create the initial migration**

```bash
cd nexus-api/NexusApi
dotnet ef migrations add InitialCreate --output-dir Data/Migrations
```

Expected: `Data/Migrations/` folder created with migration files.

- [ ] **Step 3: Add GIN index for metadata in migration**

After generating the migration, open `Data/Migrations/<timestamp>_InitialCreate.cs` and add to the `Up` method:
```csharp
migrationBuilder.Sql("CREATE INDEX log_entries_metadata_gin ON log_entries USING gin (metadata);");
```
And to `Down`:
```csharp
migrationBuilder.Sql("DROP INDEX IF EXISTS log_entries_metadata_gin;");
```

- [ ] **Step 4: Verify migration SQL looks correct**

```bash
dotnet ef migrations script
```

Review output — should see `CREATE TABLE tasks`, `CREATE TABLE agent_runs`, `CREATE TABLE log_entries`, `CREATE TABLE marketplaces`, `CREATE TABLE plugins` with identity columns and indexes including a BRIN on `ts` and a GIN on `metadata`.

- [ ] **Step 5: Commit**

```bash
git add nexus-api/NexusApi/Data/
git commit -m "feat: add NexusDbContext and initial EF Core migration"
```

---

## Chunk 2: Core Services (Docker + Vault)

### Task 5: DockerService

**Files:**
- Create: `nexus-api/NexusApi/Services/IDockerService.cs`
- Create: `nexus-api/NexusApi/Services/DockerService.cs`

- [ ] **Step 1: Define the interface**

```csharp
// nexus-api/NexusApi/Services/IDockerService.cs
namespace NexusApi.Services;

public record ContainerInfo(string Id, string Name, string Image, string Status, long Created);

public interface IDockerService
{
    Task<string> RunAgentAsync(string prompt, string projectPath, CancellationToken ct = default);
    Task<string> RunPluginCommandAsync(string[] args, CancellationToken ct = default);
    Task<IReadOnlyList<ContainerInfo>> ListAgentContainersAsync(CancellationToken ct = default);
}
```

- [ ] **Step 2: Write DockerService**

```csharp
// nexus-api/NexusApi/Services/DockerService.cs
using Docker.DotNet;
using Docker.DotNet.Models;
using Microsoft.Extensions.Options;
using NexusApi.Options;

namespace NexusApi.Services;

public class DockerService(IOptions<AgentOptions> opts, ILogger<DockerService> log) : IDockerService, IDisposable
{
    private readonly AgentOptions _opts = opts.Value;
    private readonly DockerClient _docker = new DockerClientConfiguration(
        new Uri("unix:///var/run/docker.sock")).CreateClient();

    public void Dispose() => _docker.Dispose();

    public async Task<string> RunAgentAsync(string prompt, string projectPath, CancellationToken ct = default)
    {
        var hostProjectPath = projectPath.Replace(_opts.ProjectsPath, _opts.HostProjectsPath);
        var binds = new List<string>
        {
            $"{hostProjectPath}:/home/agent/workspace",
            $"{_opts.HostVaultPath}:/home/agent/vault:ro",
        };

        var env = new List<string>();
        if (!string.IsNullOrEmpty(_opts.AnthropicApiKey))
        {
            env.Add($"ANTHROPIC_API_KEY={_opts.AnthropicApiKey}");
        }
        else
        {
            binds.Add($"{_opts.HostClaudeCreds}:/home/agent/.claude:ro");
        }

        return await RunContainerAsync(
            _opts.AgentImage,
            ["-p", prompt, "--output-format", "json"],
            binds,
            env,
            workingDir: "/home/agent/workspace",
            ct);
    }

    public async Task<string> RunPluginCommandAsync(string[] args, CancellationToken ct = default)
    {
        // Plugin operations need rw access to claude creds
        // CLAUDE_CREDS env var tells the claude CLI where to find credentials inside the container
        var binds = new List<string>
        {
            $"{_opts.HostClaudeCreds}:/claude-creds",
        };
        var env = new List<string> { "CLAUDE_CREDS=/claude-creds" };
        var fullArgs = new[] { "plugin" }.Concat(args).ToArray();
        return await RunContainerAsync(
            _opts.AgentImage,
            fullArgs,
            binds,
            env,
            workingDir: "/claude-creds",
            ct);
    }

    public async Task<IReadOnlyList<ContainerInfo>> ListAgentContainersAsync(CancellationToken ct = default)
    {
        var containers = await _docker.Containers.ListContainersAsync(
            new ContainersListParameters { All = false }, ct);
        return containers
            .Where(c => c.Image.Contains("claude-agent"))
            .Select(c => new ContainerInfo(
                c.ID[..12],
                c.Names.FirstOrDefault()?.TrimStart('/') ?? "",
                c.Image,
                c.Status,
                c.Created))
            .ToList();
    }

    private async Task<string> RunContainerAsync(
        string image, string[] cmd, List<string> binds, List<string> env,
        string workingDir, CancellationToken ct)
    {
        await PullImageAsync(image, ct);

        var output = new System.Text.StringBuilder();
        var container = await _docker.Containers.CreateContainerAsync(new CreateContainerParameters
        {
            Image = image,
            Cmd = cmd,
            Env = env,
            User = "1000:1000",
            WorkingDir = workingDir,
            HostConfig = new HostConfig
            {
                Binds = binds,
                AutoRemove = false,   // must be false — AutoRemove races with WaitContainerAsync
                Memory = _opts.AgentMemoryMb * 1024L * 1024L,
                NanoCPUs = (long)(_opts.AgentCpus * 1e9),
            },
            Tty = false,
        }, ct);

        try
        {
            using var stream = await _docker.Containers.AttachContainerAsync(
                container.ID,
                new ContainerAttachParameters { Stream = true, Stdout = true, Stderr = true },
                ct);

            await _docker.Containers.StartContainerAsync(container.ID, null, ct);

            var (stdout, stderr) = await stream.ReadOutputToEndAsync(ct);
            output.Append(stdout);
            if (!string.IsNullOrWhiteSpace(stderr))
                log.LogWarning("Container stderr: {Stderr}", stderr);

            var wait = await _docker.Containers.WaitContainerAsync(container.ID, ct);
            if (wait.StatusCode != 0)
                throw new InvalidOperationException($"Container exited with code {wait.StatusCode}");

            return output.ToString();
        }
        finally
        {
            // Explicit cleanup since AutoRemove = false
            try { await _docker.Containers.RemoveContainerAsync(container.ID, new ContainerRemoveParameters(), ct); }
            catch (Exception ex) { log.LogWarning("Container remove failed (non-fatal): {Error}", ex.Message); }
        }
    }

    private async Task PullImageAsync(string image, CancellationToken ct)
    {
        try
        {
            await _docker.Images.CreateImageAsync(
                new ImagesCreateParameters { FromImage = image },
                null,
                new Progress<JSONMessage>(),
                ct);
        }
        catch (Exception ex)
        {
            log.LogWarning("Image pull failed (using cached): {Error}", ex.Message);
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add nexus-api/NexusApi/Services/IDockerService.cs nexus-api/NexusApi/Services/DockerService.cs
git commit -m "feat: add DockerService for agent container management"
```

---

### Task 6: VaultService

**Files:**
- Create: `nexus-api/NexusApi/Services/IVaultService.cs`
- Create: `nexus-api/NexusApi/Services/VaultService.cs`
- Create: `nexus-api/NexusApi.Tests/Services/VaultServiceTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// nexus-api/NexusApi.Tests/Services/VaultServiceTests.cs
using FluentAssertions;
using Microsoft.Extensions.Options;
using NexusApi.Options;
using NexusApi.Services;

namespace NexusApi.Tests.Services;

public class VaultServiceTests : IDisposable
{
    private readonly string _vaultRoot;
    private readonly VaultService _sut;

    public VaultServiceTests()
    {
        _vaultRoot = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        Directory.CreateDirectory(_vaultRoot);
        var opts = Options.Create(new AgentOptions { VaultPath = _vaultRoot });
        _sut = new VaultService(opts);
    }

    [Fact]
    public async Task LoadProjectMemory_ReturnsEmpty_WhenFileDoesNotExist()
    {
        var result = await _sut.LoadProjectMemoryAsync("nonexistent");
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task LoadProjectMemory_ReturnsContent_WhenFileExists()
    {
        var dir = Path.Combine(_vaultRoot, "AgentSystem", "projects", "myproject");
        Directory.CreateDirectory(dir);
        await File.WriteAllTextAsync(Path.Combine(dir, "memory.md"), "prior memory");

        var result = await _sut.LoadProjectMemoryAsync("myproject");
        result.Should().Be("prior memory");
    }

    [Fact]
    public async Task WriteRunNoteAsync_CreatesFile_WithContent()
    {
        await _sut.WriteRunNoteAsync("myproject", "task-001", "agent output here");

        var expectedPath = Path.Combine(_vaultRoot, "AgentSystem", "projects", "myproject", "runs", "task-001.md");
        File.Exists(expectedPath).Should().BeTrue();
        var content = await File.ReadAllTextAsync(expectedPath);
        content.Should().Contain("agent output here");
    }

    [Fact]
    public async Task WriteRunNoteAsync_ReturnsPath()
    {
        var path = await _sut.WriteRunNoteAsync("myproject", "task-001", "output");
        path.Should().EndWith("task-001.md");
    }

    public void Dispose() => Directory.Delete(_vaultRoot, recursive: true);
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd nexus-api
dotnet test --filter "VaultServiceTests" --no-build 2>&1 | head -30
```
Expected: compile error — `VaultService` not defined yet.

- [ ] **Step 3: Define the interface**

```csharp
// nexus-api/NexusApi/Services/IVaultService.cs
namespace NexusApi.Services;

public interface IVaultService
{
    Task<string> LoadProjectMemoryAsync(string project);
    Task<string> LoadConventionsAsync();
    Task<string> WriteRunNoteAsync(string project, string taskId, string output);
}
```

- [ ] **Step 4: Implement VaultService**

```csharp
// nexus-api/NexusApi/Services/VaultService.cs
using Microsoft.Extensions.Options;
using NexusApi.Options;

namespace NexusApi.Services;

public class VaultService(IOptions<AgentOptions> opts) : IVaultService
{
    private readonly string _vaultRoot = opts.Value.VaultPath;

    public async Task<string> LoadProjectMemoryAsync(string project)
    {
        var path = Path.Combine(_vaultRoot, "AgentSystem", "projects", project, "memory.md");
        return File.Exists(path) ? await File.ReadAllTextAsync(path) : string.Empty;
    }

    public async Task<string> LoadConventionsAsync()
    {
        var path = Path.Combine(_vaultRoot, "AgentSystem", "conventions.md");
        return File.Exists(path) ? await File.ReadAllTextAsync(path) : string.Empty;
    }

    public async Task<string> WriteRunNoteAsync(string project, string taskId, string output)
    {
        var dir = Path.Combine(_vaultRoot, "AgentSystem", "projects", project, "runs");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"{taskId}.md");
        var content = $"""
            # Agent Run: {taskId}
            **Date:** {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm} UTC

            ## Output

            {output}
            """;
        await File.WriteAllTextAsync(path, content);
        return path;
    }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd nexus-api
dotnet test --filter "VaultServiceTests" -v normal
```
Expected: 4 tests passing.

- [ ] **Step 6: Commit**

```bash
git add nexus-api/NexusApi/Services/IVaultService.cs nexus-api/NexusApi/Services/VaultService.cs
git add nexus-api/NexusApi.Tests/Services/VaultServiceTests.cs
git commit -m "feat: add VaultService with tests"
```

---

## Chunk 3: Task Execution + API

### Task 7: TaskRunnerService and TaskSchedulerService

**Files:**
- Create: `nexus-api/NexusApi/Services/TaskRunnerService.cs`
- Create: `nexus-api/NexusApi/Services/TaskSchedulerService.cs`

- [ ] **Step 1: Write TaskRunnerService**

```csharp
// nexus-api/NexusApi/Services/TaskRunnerService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Options;

namespace NexusApi.Services;

public class TaskRunnerService(
    NexusDbContext db,
    IDockerService docker,
    IVaultService vault,
    IOptions<AgentOptions> opts,
    ILogger<TaskRunnerService> log)
{
    private readonly AgentOptions _opts = opts.Value;

    public async Task RunAsync(AgentTask task, CancellationToken ct = default)
    {
        task.Status = "in_progress";
        task.StartedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var run = new AgentRun { TaskId = task.TaskId };
        db.Runs.Add(run);
        await db.SaveChangesAsync(ct);

        log.LogInformation("Starting agent for task {TaskId}: {Title}", task.TaskId, task.Title);

        try
        {
            var memory = await vault.LoadProjectMemoryAsync(task.Project);
            var conventions = await vault.LoadConventionsAsync();
            var prompt = BuildPrompt(task.Title, task.Body, memory, conventions);
            var projectPath = Path.Combine(_opts.ProjectsPath, task.Project);

            var output = await docker.RunAgentAsync(prompt, projectPath, ct);
            var truncated = output.Length > 10_000 ? output[..10_000] : output;

            run.Status = "completed";
            run.Output = truncated;
            run.ExitCode = 0;

            task.Status = "done";
            task.CompletedAt = DateTimeOffset.UtcNow;

            var notePath = await vault.WriteRunNoteAsync(task.Project, task.ExternalId, truncated);
            task.VaultNotePath = notePath;

            log.LogInformation("Task {TaskId} completed", task.TaskId);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Task {TaskId} failed: {Message}", task.TaskId, ex.Message);
            run.Status = "failed";
            run.Output = ex.Message;
            task.Status = "failed";
            task.CompletedAt = DateTimeOffset.UtcNow;
        }
        finally
        {
            run.CompletedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    private static string BuildPrompt(string title, string body, string memory, string conventions) => $"""
        ## Project Conventions
        {(string.IsNullOrEmpty(conventions) ? "No conventions loaded." : conventions)}

        ## Project Memory
        {(string.IsNullOrEmpty(memory) ? "No prior memory for this project." : memory)}

        ## Your Task
        ### {title}

        {body}

        ---
        When finished, briefly summarise what you did and any issues encountered.
        """.Trim();
}
```

- [ ] **Step 2: Write TaskSchedulerService**

```csharp
// nexus-api/NexusApi/Services/TaskSchedulerService.cs
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;

namespace NexusApi.Services;

public class TaskSchedulerService(
    IServiceScopeFactory scopeFactory,
    ILogger<TaskSchedulerService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(2), ct);
            try
            {
                await DrainPendingAsync(ct);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                log.LogError(ex, "Scheduler error: {Message}", ex.Message);
            }
        }
    }

    private async Task DrainPendingAsync(CancellationToken ct)
    {
        // Drain ALL pending tasks per tick (not just one) to avoid 2-min gaps in backlog situations
        while (!ct.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var runner = scope.ServiceProvider.GetRequiredService<TaskRunnerService>();

            var pending = await db.Tasks
                .Where(t => t.Status == "pending")
                .OrderBy(t => t.Priority == "high" ? 0 : t.Priority == "medium" ? 1 : 2)
                .ThenBy(t => t.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (pending is null) break;

            log.LogInformation("Scheduler: running task {Id}", pending.ExternalId);
            await runner.RunAsync(pending, ct);
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add nexus-api/NexusApi/Services/TaskRunnerService.cs nexus-api/NexusApi/Services/TaskSchedulerService.cs
git commit -m "feat: add TaskRunnerService and TaskSchedulerService"
```

---

### Task 8: DTOs and Program.cs

**Files:**
- Create: `nexus-api/NexusApi/Models/Dtos.cs`
- Modify: `nexus-api/NexusApi/Program.cs`

- [ ] **Step 1: Write DTOs**

```csharp
// nexus-api/NexusApi/Models/Dtos.cs
namespace NexusApi.Models;

// ----- Tasks -----
public record CreateTaskRequest(string Title, string Body, string Project, string Priority = "medium");

public record TaskResponse(
    long TaskId, string ExternalId, string Title, string Project,
    string Priority, string Status, string? VaultNotePath,
    DateTimeOffset CreatedAt, DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt,
    IEnumerable<RunSummary> Runs);

public record RunSummary(long RunId, string Status, DateTimeOffset StartedAt, DateTimeOffset? CompletedAt);

// ----- Runs -----
public record RunResponse(
    long RunId, long TaskId, string Status,
    string? ContainerId, int? ExitCode, string? Output,
    DateTimeOffset StartedAt, DateTimeOffset? CompletedAt);

// ----- Plugins -----
public record InstallPluginRequest(string Name, string Marketplace);
public record TogglePluginRequest(bool Enabled);

public record PluginResponse(
    long PluginId, string Name, string MarketplaceName,
    string? Version, string? Description, string? HomepageUrl,
    bool Enabled, string Scope, DateTimeOffset InstalledAt);

// ----- Marketplaces -----
public record AddMarketplaceRequest(string Name, string SourceType, string SourceUrl, bool AutoUpdate = false);

public record MarketplaceResponse(
    long MarketplaceId, string Name, string SourceType, string SourceUrl,
    bool AutoUpdate, DateTimeOffset AddedAt, DateTimeOffset? LastUpdatedAt);

// ----- System -----
public record HealthResponse(string Status, string AuthMode, DateTimeOffset Timestamp);
public record LogsResponse(IEnumerable<string> Lines, int NextOffset);

// ----- Repos -----
public record CloneRequest(string Url);
public record RepoInfo(string Name, string? Remote, string? Branch, string? LastCommit, string? LastCommitTime);
public record GithubRepoInfo(
    string Name, string FullName, string CloneUrl, string? Description,
    bool Private, string? PushedAt, string? DefaultBranch);
```

- [ ] **Step 2: Write Program.cs**

```csharp
// nexus-api/NexusApi/Program.cs
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Options;
using NexusApi.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
builder.Host.UseSerilog((ctx, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .Enrich.FromLogContext()
       .WriteTo.Console());

// Options — appsettings.json section first, then env vars override (env vars win)
builder.Services.Configure<AgentOptions>(builder.Configuration.GetSection(AgentOptions.Section));
builder.Services.Configure<AgentOptions>(opts =>
{
    opts.VaultPath = Environment.GetEnvironmentVariable("VAULT_PATH") ?? opts.VaultPath;
    opts.ProjectsPath = Environment.GetEnvironmentVariable("PROJECTS_PATH") ?? opts.ProjectsPath;
    opts.HostVaultPath = Environment.GetEnvironmentVariable("HOST_VAULT_PATH") ?? opts.HostVaultPath;
    opts.HostProjectsPath = Environment.GetEnvironmentVariable("HOST_PROJECTS_PATH") ?? opts.HostProjectsPath;
    opts.ClaudeCreds = Environment.GetEnvironmentVariable("CLAUDE_CREDS") ?? opts.ClaudeCreds;
    opts.HostClaudeCreds = Environment.GetEnvironmentVariable("HOST_CLAUDE_CREDS") ?? opts.HostClaudeCreds;
    opts.AgentImage = Environment.GetEnvironmentVariable("AGENT_IMAGE") ?? opts.AgentImage;
    opts.AnthropicApiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
    opts.GithubToken = Environment.GetEnvironmentVariable("GITHUB_TOKEN");
});

// Database
var connStr = builder.Configuration.GetConnectionString("Default")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is required");

builder.Services.AddDbContext<NexusDbContext>(o => o.UseNpgsql(connStr));

// Services
builder.Services.AddSingleton<IDockerService, DockerService>();
builder.Services.AddScoped<IVaultService, VaultService>();
builder.Services.AddHttpClient();  // registers IHttpClientFactory for general use (e.g. RepositoriesController)
builder.Services.AddHttpClient<IMarketplaceService, MarketplaceService>();  // typed client + interface in one call
builder.Services.AddScoped<IPluginService, PluginService>();
builder.Services.AddScoped<TaskRunnerService>();
builder.Services.AddHostedService<TaskSchedulerService>();

// API
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS for dev
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Auto-migrate on startup (guarded — in-memory provider used in integration tests doesn't support migrations)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
    if (db.Database.IsRelational())
        await db.Database.MigrateAsync();
    else
        await db.Database.EnsureCreatedAsync();
    Log.Information("Database ready");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseStaticFiles();  // serve built React app from wwwroot/
app.MapControllers();
app.MapFallbackToFile("index.html");  // SPA fallback

app.Run();

// Required for WebApplicationFactory<Program> in integration tests
public partial class Program { }
```

- [ ] **Step 3: Build to verify no compile errors**

```bash
cd nexus-api
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add nexus-api/NexusApi/Models/Dtos.cs nexus-api/NexusApi/Program.cs
git commit -m "feat: add DTOs and bootstrap Program.cs"
```

---

### Task 9: TasksController and RunsController

**Files:**
- Create: `nexus-api/NexusApi/Controllers/TasksController.cs`
- Create: `nexus-api/NexusApi/Controllers/RunsController.cs`
- Create: `nexus-api/NexusApi.Tests/Controllers/TasksControllerTests.cs`

- [ ] **Step 1: Write failing tests for tasks**

```csharp
// nexus-api/NexusApi.Tests/Controllers/TasksControllerTests.cs
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NexusApi.Data;
using NexusApi.Models;
using System.Net;
using System.Net.Http.Json;

namespace NexusApi.Tests.Controllers;

public class TasksControllerTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private HttpClient CreateClient()
    {
        return factory.WithWebHostBuilder(b =>
            b.ConfigureServices(services =>
            {
                // Replace real DB with in-memory for tests
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<NexusDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<NexusDbContext>(o =>
                    o.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}"));
            })).CreateClient();
    }

    [Fact]
    public async Task GetTasks_ReturnsEmpty_WhenNoTasks()
    {
        var client = CreateClient();
        var response = await client.GetAsync("/api/tasks?status=pending");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tasks = await response.Content.ReadFromJsonAsync<List<TaskResponse>>();
        tasks.Should().BeEmpty();
    }

    [Fact]
    public async Task PostTask_Returns202_AndCreatesTask()
    {
        var client = CreateClient();
        var request = new CreateTaskRequest("Test task", "Do something", "myproject");
        var response = await client.PostAsJsonAsync("/api/tasks", request);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        body!["status"].Should().Be("accepted");
    }

    [Fact]
    public async Task GetTask_Returns404_WhenNotFound()
    {
        var client = CreateClient();
        var response = await client.GetAsync("/api/tasks/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd nexus-api
dotnet test --filter "TasksControllerTests" 2>&1 | tail -10
```
Expected: compile errors — controllers not defined.

- [ ] **Step 3: Write TasksController**

```csharp
// nexus-api/NexusApi/Controllers/TasksController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController(NexusDbContext db, IServiceScopeFactory scopeFactory, ILogger<TasksController> log)
    : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Body) || string.IsNullOrWhiteSpace(req.Project))
            return BadRequest(new { error = "title, body and project are required" });

        var task = new AgentTask
        {
            ExternalId = $"{DateTime.UtcNow:yyyy-MM-dd}-{Guid.NewGuid().ToString()[..8]}",
            Title = req.Title,
            Body = req.Body,
            Project = req.Project,
            Priority = req.Priority,
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        // Fire-and-forget using a new scope — avoids ObjectDisposedException when request scope ends
        var taskId = task.TaskId;
        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var runner = scope.ServiceProvider.GetRequiredService<TaskRunnerService>();
            var scopedDb = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var freshTask = await scopedDb.Tasks.FindAsync(taskId);
            if (freshTask is not null)
                await runner.RunAsync(freshTask, CancellationToken.None);
        });

        return Accepted(new { status = "accepted", message = "Task queued" });
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var q = db.Tasks.Include(t => t.Runs).AsQueryable();
        if (!string.IsNullOrEmpty(status))
            q = q.Where(t => t.Status == status);
        var tasks = await q.OrderByDescending(t => t.CreatedAt).Take(100).ToListAsync();
        return Ok(tasks.Select(ToResponse));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var task = await db.Tasks.Include(t => t.Runs).FirstOrDefaultAsync(t => t.TaskId == id);
        return task is null ? NotFound() : Ok(ToResponse(task));
    }

    private static TaskResponse ToResponse(AgentTask t) => new(
        t.TaskId, t.ExternalId, t.Title, t.Project, t.Priority, t.Status,
        t.VaultNotePath, t.CreatedAt, t.StartedAt, t.CompletedAt,
        t.Runs.Select(r => new RunSummary(r.RunId, r.Status, r.StartedAt, r.CompletedAt)));
}
```

- [ ] **Step 4: Write RunsController**

```csharp
// nexus-api/NexusApi/Controllers/RunsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Models;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/runs")]
public class RunsController(NexusDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? project, [FromQuery] int limit = 50)
    {
        var q = db.Runs.Include(r => r.Task).AsQueryable();
        if (!string.IsNullOrEmpty(project))
            q = q.Where(r => r.Task.Project == project);
        var runs = await q.OrderByDescending(r => r.StartedAt).Take(Math.Min(limit, 200)).ToListAsync();
        return Ok(runs.Select(ToResponse));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        var run = await db.Runs.Include(r => r.Task).FirstOrDefaultAsync(r => r.RunId == id);
        return run is null ? NotFound() : Ok(ToResponse(run));
    }

    private static RunResponse ToResponse(AgentRun r) => new(
        r.RunId, r.TaskId, r.Status, r.ContainerId, r.ExitCode,
        r.Output, r.StartedAt, r.CompletedAt);
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd nexus-api
dotnet test --filter "TasksControllerTests" -v normal
```
Expected: 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add nexus-api/NexusApi/Controllers/ nexus-api/NexusApi.Tests/Controllers/
git commit -m "feat: add TasksController, RunsController with tests"
```

---

## Chunk 4: Plugin & Marketplace System

### Task 10: MarketplaceService

**Files:**
- Create: `nexus-api/NexusApi/Services/IMarketplaceService.cs`
- Create: `nexus-api/NexusApi/Services/MarketplaceService.cs`
- Create: `nexus-api/NexusApi.Tests/Services/MarketplaceServiceTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// nexus-api/NexusApi.Tests/Services/MarketplaceServiceTests.cs
using FluentAssertions;
using Moq;
using NexusApi.Services;
using System.Net;
using System.Text;

namespace NexusApi.Tests.Services;

public class MarketplaceServiceTests
{
    private static MarketplaceService CreateSut(string? responseJson)
    {
        var handler = new MockHttpMessageHandler(responseJson);
        var httpClient = new HttpClient(handler);
        return new MarketplaceService(httpClient);
    }

    [Fact]
    public async Task FetchCatalog_ParsesPlugins_FromGithubJson()
    {
        var json = """
            {
              "plugins": [
                { "name": "github", "description": "GitHub integration", "homepage_url": "https://example.com" }
              ]
            }
            """;
        var sut = CreateSut(json);
        var plugins = await sut.FetchCatalogAsync("https://raw.githubusercontent.com/test/test/main/.claude-plugin/marketplace.json");
        plugins.Should().HaveCount(1);
        plugins[0].Name.Should().Be("github");
    }

    [Fact]
    public async Task FetchCatalog_ReturnsEmpty_OnHttpError()
    {
        var sut = CreateSut(null); // null = 404 response
        var plugins = await sut.FetchCatalogAsync("https://example.com/missing.json");
        plugins.Should().BeEmpty();
    }

    [Fact]
    public void BuildRawUrl_ForGithub_ReturnsCorrectUrl()
    {
        var url = MarketplaceService.BuildRawUrl("github", "anthropics/claude-plugins-official");
        url.Should().Contain("raw.githubusercontent.com");
        url.Should().Contain("anthropics/claude-plugins-official");
    }
}

// Minimal mock HTTP handler
public class MockHttpMessageHandler(string? responseJson) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        if (responseJson is null)
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
        });
    }
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd nexus-api
dotnet test --filter "MarketplaceServiceTests" 2>&1 | tail -10
```

- [ ] **Step 3: Define the interface**

```csharp
// nexus-api/NexusApi/Services/IMarketplaceService.cs
namespace NexusApi.Services;

public record MarketplacePlugin(string Name, string? Description, string? Homepage, string? Version);

public interface IMarketplaceService
{
    Task<IReadOnlyList<MarketplacePlugin>> FetchCatalogAsync(string rawUrl, CancellationToken ct = default);
}
```

- [ ] **Step 4: Implement MarketplaceService**

```csharp
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
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd nexus-api
dotnet test --filter "MarketplaceServiceTests" -v normal
```
Expected: 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add nexus-api/NexusApi/Services/IMarketplaceService.cs nexus-api/NexusApi/Services/MarketplaceService.cs
git add nexus-api/NexusApi.Tests/Services/MarketplaceServiceTests.cs
git commit -m "feat: add MarketplaceService with tests"
```

---

### Task 11: PluginService

**Files:**
- Create: `nexus-api/NexusApi/Services/IPluginService.cs`
- Create: `nexus-api/NexusApi/Services/PluginService.cs`

- [ ] **Step 1: Define the interface**

```csharp
// nexus-api/NexusApi/Services/IPluginService.cs
using NexusApi.Models;

namespace NexusApi.Services;

public interface IPluginService
{
    Task InstallAsync(string name, string marketplaceName, CancellationToken ct = default);
    Task UninstallAsync(string name, CancellationToken ct = default);
}
```

- [ ] **Step 2: Implement PluginService**

```csharp
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
```

- [ ] **Step 3: Commit**

```bash
git add nexus-api/NexusApi/Services/IPluginService.cs nexus-api/NexusApi/Services/PluginService.cs
git commit -m "feat: add PluginService"
```

---

### Task 12: PluginsController and MarketplacesController

**Files:**
- Create: `nexus-api/NexusApi/Controllers/PluginsController.cs`
- Create: `nexus-api/NexusApi/Controllers/MarketplacesController.cs`

- [ ] **Step 1: Write PluginsController**

```csharp
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
```

- [ ] **Step 2: Write MarketplacesController**

```csharp
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
```

- [ ] **Step 3: Build to verify**

```bash
cd nexus-api && dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add nexus-api/NexusApi/Controllers/PluginsController.cs nexus-api/NexusApi/Controllers/MarketplacesController.cs
git commit -m "feat: add PluginsController and MarketplacesController"
```

---

## Chunk 5: System Endpoints + Dashboard Migration

### Task 13: SystemController and RepositoriesController

**Files:**
- Create: `nexus-api/NexusApi/Controllers/SystemController.cs`
- Create: `nexus-api/NexusApi/Controllers/RepositoriesController.cs`

- [ ] **Step 1: Write SystemController**

```csharp
// nexus-api/NexusApi/Controllers/SystemController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Options;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api")]
public class SystemController(
    NexusDbContext db,
    IDockerService docker,
    IOptions<AgentOptions> opts) : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health() => Ok(new HealthResponse(
        "ok",
        string.IsNullOrEmpty(opts.Value.AnthropicApiKey) ? "oauth" : "api-key",
        DateTimeOffset.UtcNow));

    [HttpGet("containers")]
    public async Task<IActionResult> Containers()
    {
        var containers = await docker.ListAgentContainersAsync();
        return Ok(containers);
    }

    [HttpGet("logs")]
    public async Task<IActionResult> Logs([FromQuery] int offset = 0, [FromQuery] int limit = 200)
    {
        var total = await db.Logs.CountAsync();
        var entries = await db.Logs
            .OrderBy(l => l.Ts)
            .Skip(offset)
            .Take(Math.Min(limit, 500))
            .Select(l => $"[{l.Ts:HH:mm:ss}] {l.Level.ToUpper()} {l.Source}: {l.Message}")
            .ToListAsync();
        return Ok(new LogsResponse(entries, offset + entries.Count));
    }
}
```

- [ ] **Step 2: Write RepositoriesController**

```csharp
// nexus-api/NexusApi/Controllers/RepositoriesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NexusApi.Models;
using NexusApi.Options;
using System.Diagnostics;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/repositories")]
public class RepositoriesController(IOptions<AgentOptions> opts, ILogger<RepositoriesController> log,
    IHttpClientFactory httpFactory) : ControllerBase
{
    private readonly string _projectsPath = opts.Value.ProjectsPath;
    private readonly string? _githubToken = opts.Value.GithubToken;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        if (!Directory.Exists(_projectsPath)) return Ok(Array.Empty<RepoInfo>());
        var repos = new List<RepoInfo>();
        foreach (var dir in Directory.GetDirectories(_projectsPath))
        {
            if (!Directory.Exists(Path.Combine(dir, ".git"))) continue;
            repos.Add(new RepoInfo(
                Path.GetFileName(dir),
                Git(dir, "remote get-url origin"),
                Git(dir, "branch --show-current"),
                Git(dir, "log -1 --pretty=format:%s"),
                Git(dir, "log -1 --pretty=format:%cr")));
        }
        return Ok(repos);
    }

    [HttpGet("github")]
    public async Task<IActionResult> Github()
    {
        if (string.IsNullOrEmpty(_githubToken))
            return Ok(new { error = "GITHUB_TOKEN not configured", repos = Array.Empty<object>() });
        using var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_githubToken}");
        client.DefaultRequestHeaders.Add("Accept", "application/vnd.github+json");
        client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        client.DefaultRequestHeaders.Add("User-Agent", "nexus-api");
        var response = await client.GetAsync("https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator");
        if (!response.IsSuccessStatusCode)
            return Ok(new { error = $"GitHub API error: {response.StatusCode}", repos = Array.Empty<object>() });
        var data = await response.Content.ReadFromJsonAsync<List<GithubRepoItem>>();
        var repos = data?.Select(r => new GithubRepoInfo(r.name, r.full_name, r.clone_url,
            r.description, r.@private, r.pushed_at, r.default_branch)) ?? [];
        return Ok(new { repos });
    }

    [HttpPost("clone")]
    public IActionResult Clone([FromBody] CloneRequest req)
    {
        var match = System.Text.RegularExpressions.Regex.Match(req.Url, @"/([^/]+?)(?:\.git)?$");
        if (!match.Success) return BadRequest(new { error = "Could not parse repo name from URL" });
        var name = match.Groups[1].Value;
        var dest = Path.Combine(_projectsPath, name);
        if (Directory.Exists(dest)) return Conflict(new { error = $"Repository '{name}' already exists" });
        try
        {
            var psi = new ProcessStartInfo("git", $"clone {req.Url} {name}")
            {
                WorkingDirectory = _projectsPath,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var proc = Process.Start(psi)!;
            proc.WaitForExit();
            if (proc.ExitCode != 0) throw new Exception(proc.StandardError.ReadToEnd());
            return Ok(new { success = true, name });
        }
        catch (Exception ex)
        {
            log.LogError("Clone failed for {Url}: {Error}", req.Url, ex.Message);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private static string? Git(string dir, string args)
    {
        try
        {
            var psi = new ProcessStartInfo("git", args)
            {
                WorkingDirectory = dir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var p = Process.Start(psi)!;
            var output = p.StandardOutput.ReadToEnd().Trim();
            p.WaitForExit();
            return p.ExitCode == 0 ? output : null;
        }
        catch { return null; }
    }

    // GitHub API response shape (internal)
    private record GithubRepoItem(string name, string full_name, string clone_url,
        string? description, bool @private, string? pushed_at, string? default_branch);
}
```

- [ ] **Step 3: Build to verify**

```bash
cd nexus-api && dotnet build
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add nexus-api/NexusApi/Controllers/SystemController.cs nexus-api/NexusApi/Controllers/RepositoriesController.cs
git commit -m "feat: add SystemController and RepositoriesController"
```

---

### Task 14: Dashboard migration (useApi.js + vite.config.js)

**Files:**
- Modify: `orchestrator/client/src/hooks/useApi.js`
- Modify: `orchestrator/client/vite.config.js`

- [ ] **Step 1: Read the current useApi.js**

File: `orchestrator/client/src/hooks/useApi.js`

- [ ] **Step 2: Update vite.config.js proxy**

Replace the individual proxy entries with a single `/api` rule targeting `localhost:3001`:

```js
// orchestrator/client/vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

Note: `/repositories` was NOT in the existing proxy — it is now included under `/api`.

- [ ] **Step 3: Update useApi.js API calls**

Update all `fetchJSON` calls to use `/api/*` prefix and change the status filter from path segments to query parameters:

| Old call | New call |
|----------|----------|
| `fetchJSON('/tasks/pending')` | `fetchJSON('/api/tasks?status=pending')` |
| `fetchJSON('/tasks/inProgress')` | `fetchJSON('/api/tasks?status=in_progress')` |
| `fetchJSON('/tasks/done')` | `fetchJSON('/api/tasks?status=done')` |
| `fetchJSON('/tasks/failed')` | `fetchJSON('/api/tasks?status=failed')` |
| `fetchJSON('/containers')` | `fetchJSON('/api/containers')` |
| `fetchJSON('/logs?offset=...')` | `fetchJSON('/api/logs?offset=...')` |
| `POST /run { task, project, title, priority }` | `POST /api/tasks { title, body, project, priority }` (use hook's existing separate `title` and `body` params; remove old `task` alias) |
| `fetchJSON('/repositories')` | `fetchJSON('/api/repositories')` |
| `fetchJSON('/repositories/github')` | `fetchJSON('/api/repositories/github')` |
| `POST /repositories/clone` | `POST /api/repositories/clone` |

- [ ] **Step 4: Build the dashboard to verify no errors**

```bash
cd orchestrator/client
npm install
npm run build
```
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add orchestrator/client/src/hooks/useApi.js orchestrator/client/vite.config.js
git commit -m "feat: update dashboard to use /api/* endpoints with query-param status filter"
```

---

## Chunk 6: Dockerfile, docker-compose, and CI/CD

### Task 15: nexus-api Dockerfile

**Files:**
- Create: `nexus-api/Dockerfile`

- [ ] **Step 1: Write multi-stage Dockerfile**

```dockerfile
# nexus-api/Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY NexusApi/NexusApi.csproj NexusApi/
RUN dotnet restore NexusApi/NexusApi.csproj

COPY . .
WORKDIR /src/NexusApi
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "NexusApi.dll"]
```

- [ ] **Step 2: Add .dockerignore**

```
# nexus-api/.dockerignore
**/bin/
**/obj/
**/TestResults/
*.user
.git
```

- [ ] **Step 3: Build image locally to verify**

```bash
cd nexus-api
docker build -t nexus-api:test .
```
Expected: Successfully built.

- [ ] **Step 4: Commit**

```bash
git add nexus-api/Dockerfile nexus-api/.dockerignore
git commit -m "feat: add nexus-api Dockerfile (multi-stage .NET 9)"
```

---

### Task 16: Update docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Read the current docker-compose.yml**

File: `docker-compose.yml`

- [ ] **Step 2: Add nexus-api and db services**

Add these services alongside the existing `orchestrator` (keep orchestrator until migration verified):

```yaml
  nexus-api:
    image: ghcr.io/fullstackconnah/nexus-api:latest
    container_name: nexus-api
    restart: unless-stopped
    environment:
      - VAULT_PATH=/vault
      - PROJECTS_PATH=/projects
      - HOST_VAULT_PATH=/home/connah/obsidian-vault
      - HOST_PROJECTS_PATH=/home/connah/projects
      - CLAUDE_CREDS=/claude-creds
      - HOST_CLAUDE_CREDS=/home/connah/.claude
      - AGENT_IMAGE=ghcr.io/fullstackconnah/claude-agent:latest
      - ConnectionStrings__Default=Host=db;Database=nexus;Username=nexus;Password=${DB_PASSWORD}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - GITHUB_TOKEN=${GITHUB_TOKEN:-}
      - ASPNETCORE_URLS=http://+:8080
    volumes:
      - /home/connah/obsidian-vault:/vault
      - /home/connah/projects:/projects
      - /home/connah/.claude:/claude-creds
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - "3002:8080"    # use 3002 during side-by-side testing, switch to 3001 after cutover
    networks:
      - agent-net
      - npm-net
    depends_on:
      - db
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  db:
    image: postgres:17-alpine
    container_name: nexus-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=nexus
      - POSTGRES_USER=nexus
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - agent-net
```

Also add `postgres_data:` to the top-level `volumes:` section.

- [ ] **Step 3: Add DB_PASSWORD to .env or document it**

Create a `.env.example` at the repo root:

```
ANTHROPIC_API_KEY=
GITHUB_TOKEN=
DB_PASSWORD=change_me_in_production
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add nexus-api and postgres to docker-compose (side-by-side with orchestrator)"
```

---

### Task 17: CI/CD — build and push nexus-api

**Files:**
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: Read current build.yml**

File: `.github/workflows/build.yml`

- [ ] **Step 2: Add `nexus-api/**` to paths filter**

In the `on.push.paths` section, add:
```yaml
      - 'nexus-api/**'
```
Without this, pushes that only touch `nexus-api/` will not trigger the workflow at all.

- [ ] **Step 3: Add `build-nexus-api` job**

Add after the `build-claude-agent` job:

```yaml
  build-nexus-api:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push nexus-api
        uses: docker/build-push-action@v5
        with:
          context: ./nexus-api
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.OWNER }}/nexus-api:latest
          no-cache: true
```

- [ ] **Step 4: Update `deploy` job's `needs` array**

Change:
```yaml
  deploy:
    needs: [build-orchestrator, build-claude-agent]
```
To:
```yaml
  deploy:
    needs: [build-orchestrator, build-claude-agent, build-nexus-api]
```
This ensures the Portainer webhook fires only after all three images are pushed to GHCR.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: add nexus-api build and push to GHCR"
```

---

### Task 18: Cutover — remove orchestrator service

> **Do this only after verifying nexus-api works end-to-end on the server.**

- [ ] **Step 1: Switch nexus-api port from 3002 to 3001 in docker-compose.yml**

```yaml
ports:
  - "3001:8080"
```

- [ ] **Step 2: Remove orchestrator service from docker-compose.yml**

Delete the `orchestrator:` service block.

- [ ] **Step 3: Update Nginx Proxy Manager**

Point the reverse proxy rule for the agent system to port `3001` if it wasn't already.

- [ ] **Step 4: Deploy and verify**

```bash
docker compose up -d
docker compose logs nexus-api --tail=50
```

Verify: `GET /api/health` returns 200, NEXUS dashboard loads and shows tasks.

- [ ] **Step 5: Final commit**

```bash
git add docker-compose.yml
git commit -m "feat: cut over to nexus-api, remove orchestrator service"
```

---

## Run All Tests

```bash
cd nexus-api
dotnet test -v normal
```

Expected: All tests passing. Check counts:
- `VaultServiceTests`: 4
- `MarketplaceServiceTests`: 3
- `TasksControllerTests`: 3
- **Total: 10+**
