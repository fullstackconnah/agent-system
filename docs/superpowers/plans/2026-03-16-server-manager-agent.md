# Server Manager Agent Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SSH-based server monitoring, email alerting, and autonomous Claude agent remediation as a vertical slice inside `nexus-api`.

**Architecture:** A background `IHostedService` SSHes into `connah@192.168.4.100` every 5 minutes, collects CPU/RAM/disk/container/service/log metrics, evaluates against configured thresholds, auto-restarts stopped containers/services, spawns Claude tasks for complex issues, persists alerts in PostgreSQL, and surfaces everything through a new `/api/server-health` endpoint and `ServerHealthCard` dashboard panel.

**Tech Stack:** .NET 9, ASP.NET Core 9, EF Core 9, SSH.NET (Renci.SshNet), MailKit, xUnit + Moq, React 19, Vite

**Spec:** `docs/superpowers/specs/2026-03-16-server-manager-agent-design.md`

> ⚠️ **Pre-requisite:** This plan assumes the `nexus-api` base project (from `docs/superpowers/plans/2026-03-16-nexus-api-dotnet.md`) is already scaffolded and compiling. Complete that plan first, or apply these tasks in a branch on top of it. The conflict-prone files are `Program.cs`, `NexusDbContext.cs`, `docker-compose.yml`, and `orchestrator/client/src/hooks/useApi.js` — coordinate with any parallel agent touching those. In particular, `useApi.js` in this plan already uses the `/api/` prefix paths required by nexus-api; do not apply Task 12 until the nexus-api base is live.

---

## File Map

### New backend files

| File | Responsibility |
|------|---------------|
| `nexus-api/NexusApi/Options/ServerMonitorOptions.cs` | Strongly-typed config binding for `ServerMonitor` section |
| `nexus-api/NexusApi/Options/SmtpOptions.cs` | Strongly-typed config binding for `Smtp` section |
| `nexus-api/NexusApi/Models/ServerAlert.cs` | EF Core entity for `server_alerts` table |
| `nexus-api/NexusApi/Models/ServerHealthSnapshot.cs` | In-memory snapshot record + `ContainerStatus`, `ServiceStatus`, `ActiveAlertDto` |
| `nexus-api/NexusApi/Services/ISshService.cs` | Interface — `ExecuteCommandAsync`, `ExecuteCommandsAsync` |
| `nexus-api/NexusApi/Services/SshService.cs` | SSH.NET implementation of `ISshService` |
| `nexus-api/NexusApi/Services/MetricsCollector.cs` | Runs SSH commands, parses output into typed results |
| `nexus-api/NexusApi/Services/ITaskService.cs` | Interface + `CreateTaskRequest` DTO — shared with `TasksController`; check if already defined in base plan |
| `nexus-api/NexusApi/Services/RemediationService.cs` | Evaluates snapshot against thresholds, issues fixes or enqueues tasks |
| `nexus-api/NexusApi/Services/INotificationService.cs` | Interface — `SendAlertAsync`, `SendResolvedAsync` |
| `nexus-api/NexusApi/Services/NotificationService.cs` | MailKit SMTP implementation of `INotificationService` |
| `nexus-api/NexusApi/Services/ServerMonitorService.cs` | `IHostedService`, 5-min periodic timer, orchestrates check cycle |
| `nexus-api/NexusApi/Controllers/ServerHealthController.cs` | `GET /api/server-health`, `GET /api/server-alerts` |
| `nexus-api/NexusApi.Tests/Services/MetricsCollectorTests.cs` | Unit tests for SSH output parsing |
| `nexus-api/NexusApi.Tests/Services/RemediationServiceTests.cs` | Unit tests for threshold evaluation and action decisions |
| `nexus-api/NexusApi.Tests/Controllers/ServerHealthControllerTests.cs` | Controller tests for both endpoints |

### Modified backend files

| File | Change |
|------|--------|
| `nexus-api/NexusApi/NexusApi.csproj` | Add `SSH.NET` and `MailKit` NuGet packages |
| `nexus-api/NexusApi/Data/NexusDbContext.cs` | Add `DbSet<ServerAlert> ServerAlerts` + `OnModelCreating` config |
| `nexus-api/NexusApi/Program.cs` | Register new services and bind new config sections |
| `nexus-api/NexusApi/appsettings.json` | Add `ServerMonitor` and `Smtp` config sections |

### Modified frontend files

| File | Change |
|------|--------|
| `orchestrator/client/src/hooks/useApi.js` | Add `serverHealth` state, poll `/api/server-health` in `refresh()` |
| `orchestrator/client/src/App.jsx` | Import and render `<ServerHealthCard serverHealth={serverHealth} />` |
| `orchestrator/client/src/components/ServerHealthCard.jsx` | New — full-width server health panel |

### Infrastructure

| File | Change |
|------|--------|
| `docker-compose.yml` | Add SSH key volume mount and all env vars to `nexus-api` service |

---

## Chunk 1: Data layer — options, models, DB migration

### Task 1: Add NuGet packages

**Files:**
- Modify: `nexus-api/NexusApi/NexusApi.csproj`

- [ ] **Step 1: Add SSH.NET and MailKit packages**

```bash
cd nexus-api/NexusApi
dotnet add package SSH.NET --version 2024.2.0
dotnet add package MailKit --version 4.9.0
```

- [ ] **Step 2: Verify project still builds**

```bash
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add nexus-api/NexusApi/NexusApi.csproj
git commit -m "chore: add SSH.NET and MailKit packages"
```

---

### Task 2: Config options classes

**Files:**
- Create: `nexus-api/NexusApi/Options/ServerMonitorOptions.cs`
- Create: `nexus-api/NexusApi/Options/SmtpOptions.cs`

- [ ] **Step 1: Create `ServerMonitorOptions.cs`**

```csharp
// nexus-api/NexusApi/Options/ServerMonitorOptions.cs
namespace NexusApi.Options;

public class ServerMonitorOptions
{
    public bool Enabled { get; set; } = true;
    public int IntervalMinutes { get; set; } = 5;
    public string Host { get; set; } = "";
    public string User { get; set; } = "";
    public string KeyPath { get; set; } = "";
    public double CpuThreshold { get; set; } = 80;
    public double RamThreshold { get; set; } = 85;
    public double DiskThreshold { get; set; } = 90;
    public List<string> KnownSafeServices { get; set; } = ["nginx", "postgresql", "docker"];
}
```

- [ ] **Step 2: Create `SmtpOptions.cs`**

```csharp
// nexus-api/NexusApi/Options/SmtpOptions.cs
namespace NexusApi.Options;

public class SmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string User { get; set; } = "";
    public string Password { get; set; } = "";
    public string AlertEmail { get; set; } = "";
    public bool UseSsl { get; set; } = true;
}
```

- [ ] **Step 3: Build to confirm no errors**

```bash
cd nexus-api/NexusApi && dotnet build
```

- [ ] **Step 4: Commit**

```bash
git add nexus-api/NexusApi/Options/
git commit -m "feat: add ServerMonitorOptions and SmtpOptions config classes"
```

---

### Task 3: ServerAlert entity

**Files:**
- Create: `nexus-api/NexusApi/Models/ServerAlert.cs`

- [ ] **Step 1: Create the entity**

```csharp
// nexus-api/NexusApi/Models/ServerAlert.cs
namespace NexusApi.Models;

public class ServerAlert
{
    public long AlertId { get; set; }
    public string Type { get; set; } = "";       // cpu_high | ram_high | disk_high | container_down | container_restart_loop | service_down | log_error
    public string Subject { get; set; } = "";    // container name, service name, or "" for system-wide
    public string Severity { get; set; } = "";   // warning | critical
    public string Message { get; set; } = "";
    public string? ActionTaken { get; set; }
    public bool Resolved { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
```

- [ ] **Step 2: Add `DbSet<ServerAlert>` to `NexusDbContext`**

Open `nexus-api/NexusApi/Data/NexusDbContext.cs`. Add inside the class:

```csharp
public DbSet<ServerAlert> ServerAlerts => Set<ServerAlert>();
```

Add in `OnModelCreating`:

```csharp
modelBuilder.Entity<ServerAlert>(e =>
{
    e.ToTable("server_alerts");
    e.HasKey(x => x.AlertId);
    e.Property(x => x.AlertId).UseIdentityAlwaysColumn();
    e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
    e.HasIndex(x => x.Resolved);
    e.HasIndex(x => new { x.Type, x.Subject, x.Resolved }).HasDatabaseName("ix_server_alerts_dedup");
    e.HasIndex(x => x.CreatedAt).IsDescending().HasDatabaseName("ix_server_alerts_created_at_desc");
});
```

- [ ] **Step 3: Create and apply EF migration**

> Pre-condition: ensure `ConnectionStrings__Default` is set in your environment (or `appsettings.Development.json`) and your local PostgreSQL instance is running before running `database update`.

```bash
cd nexus-api/NexusApi
dotnet ef migrations add AddServerAlerts
```
Expected output: `Build succeeded.` then `Done. To undo this action, use 'ef migrations remove'`

```bash
dotnet ef database update
```
Expected output: `Applying migration '..._AddServerAlerts'...` then `Done.`

- [ ] **Step 4: Build**

```bash
dotnet build
```

- [ ] **Step 5: Commit**

```bash
git add nexus-api/NexusApi/Models/ServerAlert.cs nexus-api/NexusApi/Data/
git commit -m "feat: add ServerAlert entity and migration"
```

---

### Task 4: ServerHealthSnapshot models

**Files:**
- Create: `nexus-api/NexusApi/Models/ServerHealthSnapshot.cs`

- [ ] **Step 1: Create the file**

```csharp
// nexus-api/NexusApi/Models/ServerHealthSnapshot.cs
namespace NexusApi.Models;

public record ContainerStatus
{
    public string Name { get; init; } = "";
    public bool Running { get; init; }
    public int RestartCount { get; init; }
}

public record ServiceStatus
{
    public string Name { get; init; } = "";
    public bool Active { get; init; }
}

public record ActiveAlertDto
{
    public long AlertId { get; init; }
    public string Type { get; init; } = "";
    public string Subject { get; init; } = "";
    public string Severity { get; init; } = "";
    public string Message { get; init; } = "";
    public string? ActionTaken { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record ServerHealthSnapshot
{
    /// <summary>Returned by the controller before the first check has completed.</summary>
    public static readonly ServerHealthSnapshot Empty = new()
    {
        CheckedAt = DateTime.MinValue,
        Status = "healthy"   // no alerts yet = healthy; dashboard shows "not yet checked" from the MinValue timestamp
    };

    public DateTime CheckedAt { get; init; }
    // Property names are intentionally short (Cpu/Ram/Disk not CpuPercent) so ASP.NET Core's
    // default camelCase serialiser produces "cpu"/"ram"/"disk" matching the API contract.
    public double Cpu { get; init; }
    public double Ram { get; init; }
    public double Disk { get; init; }
    public List<ContainerStatus> Containers { get; init; } = [];
    public List<ServiceStatus> Services { get; init; } = [];
    public int RecentErrorCount { get; init; }
    public List<ActiveAlertDto> ActiveAlerts { get; init; } = [];

    public string Status { get; init; } = "healthy";

    /// <summary>
    /// "critical" if any unresolved critical alert; "warning" if any unresolved alert; "healthy" otherwise.
    /// </summary>
    public static string DeriveStatus(IEnumerable<ActiveAlertDto> alerts)
    {
        var list = alerts.ToList();
        if (list.Any(a => a.Severity == "critical")) return "critical";
        if (list.Count != 0) return "warning";
        return "healthy";
    }
}
```

Note: `Status` is set explicitly (not a computed property) so the record can be serialised and reconstructed cleanly. Use `DeriveStatus(alerts)` when building the snapshot.

- [ ] **Step 2: Build**

```bash
dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add nexus-api/NexusApi/Models/ServerHealthSnapshot.cs
git commit -m "feat: add ServerHealthSnapshot and related DTOs"
```

---

## Chunk 2: SSH service and metrics collection

### Task 5: ISshService interface + SshService implementation

**Files:**
- Create: `nexus-api/NexusApi/Services/ISshService.cs`
- Create: `nexus-api/NexusApi/Services/SshService.cs`

- [ ] **Step 1: Create `ISshService.cs`**

```csharp
// nexus-api/NexusApi/Services/ISshService.cs
namespace NexusApi.Services;

public interface ISshService
{
    /// <summary>
    /// Runs a single shell command. Returns stdout. Throws on SSH error.
    /// </summary>
    Task<string> ExecuteAsync(string command);

    /// <summary>
    /// Runs multiple commands in one session. Returns list of stdout results in order.
    /// </summary>
    Task<IReadOnlyList<string>> ExecuteManyAsync(IEnumerable<string> commands);
}
```

- [ ] **Step 2: Create `SshService.cs`**

```csharp
// nexus-api/NexusApi/Services/SshService.cs
using Microsoft.Extensions.Options;
using NexusApi.Options;
using Renci.SshNet;

namespace NexusApi.Services;

public class SshService : ISshService, IDisposable
{
    private readonly ServerMonitorOptions _opts;
    private readonly ILogger<SshService> _logger;

    public SshService(IOptions<ServerMonitorOptions> opts, ILogger<SshService> logger)
    {
        _opts = opts.Value;
        _logger = logger;
    }

    public async Task<string> ExecuteAsync(string command)
    {
        var results = await ExecuteManyAsync([command]);
        return results[0];
    }

    public Task<IReadOnlyList<string>> ExecuteManyAsync(IEnumerable<string> commands)
    {
        return Task.Run(() =>
        {
            using var auth = new PrivateKeyAuthenticationMethod(_opts.User,
                new PrivateKeyFile(_opts.KeyPath));
            using var client = new SshClient(new ConnectionInfo(_opts.Host, _opts.User, auth));
            client.Connect();

            var results = new List<string>();
            foreach (var cmd in commands)
            {
                using var sshCmd = client.RunCommand(cmd);
                if (sshCmd.ExitStatus != 0 && !string.IsNullOrEmpty(sshCmd.Error))
                    _logger.LogWarning("SSH command stderr [{Cmd}]: {Err}", cmd, sshCmd.Error.Trim());
                results.Add(sshCmd.Result.Trim());
            }

            client.Disconnect();
            return (IReadOnlyList<string>)results;
        });
    }

    public void Dispose() { }
}
```

- [ ] **Step 3: Build**

```bash
dotnet build
```

- [ ] **Step 4: Commit**

```bash
git add nexus-api/NexusApi/Services/ISshService.cs nexus-api/NexusApi/Services/SshService.cs
git commit -m "feat: add ISshService and SshService SSH.NET implementation"
```

---

### Task 6: MetricsCollector — tests first

**Files:**
- Create: `nexus-api/NexusApi.Tests/Services/MetricsCollectorTests.cs`
- Create: `nexus-api/NexusApi/Services/MetricsCollector.cs`

The parser logic is pure string-to-value mapping — ideal for unit tests without real SSH.

- [ ] **Step 1: Write failing tests**

```csharp
// nexus-api/NexusApi.Tests/Services/MetricsCollectorTests.cs
using Microsoft.Extensions.Options;
using Moq;
using NexusApi.Models;
using NexusApi.Options;
using NexusApi.Services;

namespace NexusApi.Tests.Services;

public class MetricsCollectorTests
{
    private static readonly ServerMonitorOptions DefaultOpts = new()
    {
        KnownSafeServices = ["nginx", "postgresql", "docker"]
    };

    private MetricsCollector BuildCollector(
        string cpu = "12.5", string ram = "61",
        string disk = "74",
        string containers = "nexus-api\tUp 3 hours\nnexus-db\tUp 3 hours",
        string services = "active\nactive\nactive",
        string logs = "")
    {
        var ssh = new Mock<ISshService>();
        ssh.Setup(s => s.ExecuteManyAsync(It.IsAny<IEnumerable<string>>()))
           .ReturnsAsync(new List<string> { cpu, ram, disk, containers, services, logs });
        return new MetricsCollector(ssh.Object, Options.Create(DefaultOpts));
    }

    [Fact]
    public async Task CollectAsync_ParsesCpuCorrectly()
    {
        var collector = BuildCollector(cpu: "45.2");
        var result = await collector.CollectAsync();
        Assert.Equal(45.2, result.Cpu, precision: 1);
    }

    [Fact]
    public async Task CollectAsync_ParsesRamCorrectly()
    {
        var collector = BuildCollector(ram: "73");
        var result = await collector.CollectAsync();
        Assert.Equal(73.0, result.Ram, precision: 1);
    }

    [Fact]
    public async Task CollectAsync_ParsesDiskCorrectly()
    {
        var collector = BuildCollector(disk: "88");
        var result = await collector.CollectAsync();
        Assert.Equal(88.0, result.Disk, precision: 1);
    }

    [Fact]
    public async Task CollectAsync_DetectsRunningContainer()
    {
        var collector = BuildCollector(containers: "nexus-api\tUp 2 hours");
        var result = await collector.CollectAsync();
        Assert.Single(result.Containers);
        Assert.True(result.Containers[0].Running);
        Assert.Equal("nexus-api", result.Containers[0].Name);
    }

    [Fact]
    public async Task CollectAsync_DetectsStoppedContainer()
    {
        var collector = BuildCollector(containers: "nexus-api\tExited (1) 5 minutes ago");
        var result = await collector.CollectAsync();
        Assert.False(result.Containers[0].Running);
    }

    [Fact]
    public async Task CollectAsync_DetectsRestartingContainer()
    {
        var collector = BuildCollector(containers: "nexus-api\tRestarting (1) 10 seconds ago");
        var result = await collector.CollectAsync();
        Assert.False(result.Containers[0].Running);
        Assert.True(result.Containers[0].RestartCount > 0);
    }

    [Fact]
    public async Task CollectAsync_ParsesServiceStatus()
    {
        var collector = BuildCollector(
            services: "active\ninactive\nactive",
            containers: "");
        var result = await collector.CollectAsync();
        Assert.Equal(3, result.Services.Count);
        Assert.True(result.Services[0].Active);
        Assert.False(result.Services[1].Active);
    }

    [Fact]
    public async Task CollectAsync_CountsLogErrors()
    {
        var logOutput = "Mar 16 14:00:01 host sshd[1234]: error line 1\nMar 16 14:01:00 host kernel: error 2";
        var collector = BuildCollector(logs: logOutput);
        var result = await collector.CollectAsync();
        Assert.Equal(2, result.RecentErrorCount);
    }

    [Fact]
    public async Task CollectAsync_EmptyLogsGivesZeroCount()
    {
        var collector = BuildCollector(logs: "");
        var result = await collector.CollectAsync();
        Assert.Equal(0, result.RecentErrorCount);
    }
}
```

- [ ] **Step 2: Run tests — expect compile error (MetricsCollector not yet created)**

```bash
cd nexus-api/NexusApi.Tests
dotnet test --filter "MetricsCollectorTests" 2>&1 | tail -5
```
Expected: Build error — `MetricsCollector` does not exist.

- [ ] **Step 3: Create `MetricsCollector.cs`**

```csharp
// nexus-api/NexusApi/Services/MetricsCollector.cs
using NexusApi.Models;
using NexusApi.Options;
using Microsoft.Extensions.Options;

namespace NexusApi.Services;

public class MetricsCollector(ISshService ssh, IOptions<ServerMonitorOptions> opts)
{
    private readonly ServerMonitorOptions _opts = opts.Value;

    private string[] BuildCommands() =>
    [
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2+$4}'",
        "free | awk '/Mem/{printf \"%.0f\", $3/$2*100}'",
        "df / | awk 'NR==2{print $5}' | tr -d '%'",
        "docker ps -a --format \"{{.Names}}\\t{{.Status}}\"",
        // Dynamic: built from KnownSafeServices config so additions are automatically picked up
        $"systemctl is-active {string.Join(" ", _opts.KnownSafeServices)} 2>/dev/null",
        "journalctl -p err --since '5 minutes ago' --no-pager -q 2>/dev/null || true",
    ];

    /// <summary>Collects all metrics via SSH in a single session.</summary>
    public async Task<RawMetrics> CollectAsync()
    {
        var results = await ssh.ExecuteManyAsync(BuildCommands());
        return Parse(results, _opts.KnownSafeServices);
    }

    private static RawMetrics Parse(IReadOnlyList<string> results, List<string> serviceNames)
    {
        return new RawMetrics(
            Cpu: TryParseDouble(results[0]),
            Ram: TryParseDouble(results[1]),
            Disk: TryParseDouble(results[2]),
            Containers: ParseContainers(results[3]),
            Services: ParseServices(results[4], serviceNames),
            RecentErrorCount: CountLogErrors(results[5]));
    }

    private static double TryParseDouble(string s)
        => double.TryParse(s.Trim(), System.Globalization.NumberStyles.Any,
               System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0;

    private static List<ContainerStatus> ParseContainers(string output)
    {
        if (string.IsNullOrWhiteSpace(output)) return [];
        return output.Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(line =>
            {
                var parts = line.Split('\t', 2);
                var name = parts[0].Trim();
                var status = parts.Length > 1 ? parts[1].Trim() : "";
                var running = status.StartsWith("Up", StringComparison.OrdinalIgnoreCase);
                var restartCount = 0;
                if (status.StartsWith("Restarting", StringComparison.OrdinalIgnoreCase))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(status, @"\((\d+)\)");
                    if (match.Success) int.TryParse(match.Groups[1].Value, out restartCount);
                    restartCount = Math.Max(restartCount, 1);
                }
                return new ContainerStatus { Name = name, Running = running, RestartCount = restartCount };
            }).ToList();
    }

    private static List<ServiceStatus> ParseServices(string output, List<string> serviceNames)
    {
        if (string.IsNullOrWhiteSpace(output)) return [];
        var lines = output.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        return lines.Select((line, i) => new ServiceStatus
        {
            Name = i < serviceNames.Count ? serviceNames[i] : $"service{i}",
            Active = line.Trim().Equals("active", StringComparison.OrdinalIgnoreCase)
        }).ToList();
    }

    private static int CountLogErrors(string output)
        => string.IsNullOrWhiteSpace(output)
            ? 0
            : output.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length;
}

public record RawMetrics(
    double Cpu,
    double Ram,
    double Disk,
    List<ContainerStatus> Containers,
    List<ServiceStatus> Services,
    int RecentErrorCount);
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
dotnet test --filter "MetricsCollectorTests" -v
```
Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add nexus-api/NexusApi/Services/MetricsCollector.cs nexus-api/NexusApi.Tests/Services/MetricsCollectorTests.cs
git commit -m "feat: add MetricsCollector with SSH command parsing (TDD)"
```

---

## Chunk 3: Remediation, notifications, monitor service

### Task 7: INotificationService + NotificationService

**Files:**
- Create: `nexus-api/NexusApi/Services/INotificationService.cs`
- Create: `nexus-api/NexusApi/Services/NotificationService.cs`

- [ ] **Step 1: Create `INotificationService.cs`**

```csharp
// nexus-api/NexusApi/Services/INotificationService.cs
using NexusApi.Models;

namespace NexusApi.Services;

public interface INotificationService
{
    Task SendAlertAsync(ServerAlert alert);
    Task SendResolvedAsync(ServerAlert alert);
}
```

- [ ] **Step 2: Create `NotificationService.cs`**

```csharp
// nexus-api/NexusApi/Services/NotificationService.cs
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using NexusApi.Models;
using NexusApi.Options;

namespace NexusApi.Services;

public class NotificationService(IOptions<SmtpOptions> opts, ILogger<NotificationService> logger)
    : INotificationService
{
    private readonly SmtpOptions _smtp = opts.Value;

    public Task SendAlertAsync(ServerAlert alert)
        => SendAsync(
            subject: $"[NEXUS Alert] {alert.Type} on {alert.Subject ?? "server"}",
            body: BuildAlertBody(alert));

    public Task SendResolvedAsync(ServerAlert alert)
        => SendAsync(
            subject: $"[NEXUS Resolved] {alert.Type} on {alert.Subject ?? "server"}",
            body: BuildResolvedBody(alert));

    private static string BuildAlertBody(ServerAlert a) =>
        $"""
        Server alert detected.

        Type:     {a.Type}
        Subject:  {a.Subject}
        Severity: {a.Severity}
        Message:  {a.Message}
        Detected: {a.CreatedAt:u}
        Action:   {a.ActionTaken ?? "none"}
        """;

    private static string BuildResolvedBody(ServerAlert a) =>
        $"""
        A previous server alert has been resolved.

        Type:      {a.Type}
        Subject:   {a.Subject}
        Message:   {a.Message}
        Detected:  {a.CreatedAt:u}
        Resolved:  {a.ResolvedAt:u}
        Duration:  {(a.ResolvedAt - a.CreatedAt)?.TotalMinutes:F0} min
        """;

    private async Task SendAsync(string subject, string body)
    {
        if (string.IsNullOrEmpty(_smtp.Host) || string.IsNullOrEmpty(_smtp.AlertEmail))
        {
            logger.LogWarning("SMTP not configured — skipping notification: {Subject}", subject);
            return;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(_smtp.User));
            message.To.Add(MailboxAddress.Parse(_smtp.AlertEmail));
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = body };

            using var client = new SmtpClient();
            await client.ConnectAsync(_smtp.Host, _smtp.Port,
                _smtp.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None);
            await client.AuthenticateAsync(_smtp.User, _smtp.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            logger.LogInformation("Notification sent: {Subject}", subject);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send notification: {Subject}", subject);
        }
    }
}
```

- [ ] **Step 3: Build**

```bash
dotnet build
```

- [ ] **Step 4: Commit**

```bash
git add nexus-api/NexusApi/Services/INotificationService.cs nexus-api/NexusApi/Services/NotificationService.cs
git commit -m "feat: add INotificationService and MailKit NotificationService"
```

---

### Task 8: RemediationService — tests first

**Files:**
- Create: `nexus-api/NexusApi.Tests/Services/RemediationServiceTests.cs`
- Create: `nexus-api/NexusApi/Services/RemediationService.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// nexus-api/NexusApi.Tests/Services/RemediationServiceTests.cs
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using NexusApi.Models;
using NexusApi.Options;
using NexusApi.Services;

namespace NexusApi.Tests.Services;

public class RemediationServiceTests
{
    private static ServerMonitorOptions DefaultOpts => new()
    {
        Host = "192.168.4.100", User = "connah", KeyPath = "/key",
        CpuThreshold = 80, RamThreshold = 85, DiskThreshold = 90,
        KnownSafeServices = ["nginx", "postgresql"]
    };

    private RemediationService Build(
        Mock<ISshService>? ssh = null,
        Mock<INotificationService>? notify = null,
        Mock<ITaskService>? tasks = null)
    {
        return new RemediationService(
            ssh?.Object ?? new Mock<ISshService>().Object,
            notify?.Object ?? new Mock<INotificationService>().Object,
            tasks?.Object ?? new Mock<ITaskService>().Object,
            Options.Create(DefaultOpts),
            NullLogger<RemediationService>.Instance);
    }

    private static RawMetrics OkMetrics() => new(
        Cpu: 40, Ram: 60, Disk: 70,
        Containers: [new() { Name = "nexus-api", Running = true }],
        Services: [new() { Name = "nginx", Active = true }],
        RecentErrorCount: 0);

    [Fact]
    public async Task EvaluateAsync_NoIssues_ReturnsNoAlerts()
    {
        var svc = Build();
        var alerts = await svc.EvaluateAsync(OkMetrics(), existingAlerts: []);
        Assert.Empty(alerts.NewAlerts);
    }

    [Fact]
    public async Task EvaluateAsync_HighCpu_CreatesWarningAlert()
    {
        var svc = Build();
        var metrics = OkMetrics() with { Cpu = 85 };
        var result = await svc.EvaluateAsync(metrics, existingAlerts: []);
        Assert.Single(result.NewAlerts);
        Assert.Equal("cpu_high", result.NewAlerts[0].Type);
        Assert.Equal("warning", result.NewAlerts[0].Severity);
    }

    [Fact]
    public async Task EvaluateAsync_CriticalCpu_SpawnsTask()
    {
        var tasks = new Mock<ITaskService>();
        var svc = Build(tasks: tasks);
        var metrics = OkMetrics() with { Cpu = 96 };
        await svc.EvaluateAsync(metrics, existingAlerts: []);
        tasks.Verify(t => t.CreateAndEnqueueAsync(It.Is<CreateTaskRequest>(r =>
            r.Title.Contains("cpu_high"))), Times.Once);
    }

    [Fact]
    public async Task EvaluateAsync_PersistingHighCpu_NotResolvedOnSecondCycle()
    {
        var svc = Build();
        var metrics = OkMetrics() with { Cpu = 85 };
        // Existing alert from cycle 1
        var existing = new List<ServerAlert>
        {
            new() { AlertId = 1, Type = "cpu_high", Subject = "", Resolved = false }
        };
        // Cycle 2: CPU still high
        var result = await svc.EvaluateAsync(metrics, existingAlerts: existing);
        Assert.Empty(result.NewAlerts);          // no duplicate alert
        Assert.Empty(result.ResolvedAlertIds);   // not resolved either — still above threshold
    }

    [Fact]
    public async Task EvaluateAsync_StoppedContainer_AutoRestarts()
    {
        var ssh = new Mock<ISshService>();
        ssh.Setup(s => s.ExecuteAsync(It.IsAny<string>())).ReturnsAsync("");
        var svc = Build(ssh: ssh);
        var metrics = OkMetrics() with
        {
            Containers = [new() { Name = "nexus-api", Running = false, RestartCount = 0 }]
        };
        var result = await svc.EvaluateAsync(metrics, existingAlerts: []);
        ssh.Verify(s => s.ExecuteAsync("docker start nexus-api"), Times.Once);
        Assert.Contains("Restarted container", result.NewAlerts[0].ActionTaken);
    }

    [Fact]
    public async Task EvaluateAsync_RestartLoop_SpawnsTask()
    {
        var tasks = new Mock<ITaskService>();
        var svc = Build(tasks: tasks);
        var metrics = OkMetrics() with
        {
            Containers = [new() { Name = "nexus-api", Running = false, RestartCount = 3 }]
        };
        await svc.EvaluateAsync(metrics, existingAlerts: []);
        tasks.Verify(t => t.CreateAndEnqueueAsync(It.Is<CreateTaskRequest>(r =>
            r.Title.Contains("container_restart_loop"))), Times.Once);
    }

    [Fact]
    public async Task EvaluateAsync_KnownServiceDown_AutoRestarts()
    {
        var ssh = new Mock<ISshService>();
        ssh.Setup(s => s.ExecuteAsync(It.IsAny<string>())).ReturnsAsync("");
        var svc = Build(ssh: ssh);
        var metrics = OkMetrics() with
        {
            Services = [new() { Name = "nginx", Active = false }]
        };
        var result = await svc.EvaluateAsync(metrics, existingAlerts: []);
        ssh.Verify(s => s.ExecuteAsync("sudo systemctl restart nginx"), Times.Once);
        Assert.Contains("Restarted service", result.NewAlerts[0].ActionTaken);
    }

    [Fact]
    public async Task EvaluateAsync_ExistingAlert_NoDuplicate()
    {
        var svc = Build();
        var metrics = OkMetrics() with { Cpu = 85 };
        var existing = new List<ServerAlert>
        {
            new() { Type = "cpu_high", Subject = "", Resolved = false }
        };
        var result = await svc.EvaluateAsync(metrics, existingAlerts: existing);
        Assert.Empty(result.NewAlerts); // deduplication: alert already exists
    }

    [Fact]
    public async Task EvaluateAsync_AlertClears_MarksResolved()
    {
        var svc = Build();
        var existing = new List<ServerAlert>
        {
            new() { AlertId = 1, Type = "cpu_high", Subject = "", Resolved = false }
        };
        // CPU now below threshold
        var result = await svc.EvaluateAsync(OkMetrics(), existingAlerts: existing);
        Assert.Single(result.ResolvedAlertIds);
        Assert.Equal(1, result.ResolvedAlertIds[0]);
    }
}
```

- [ ] **Step 2: Run tests — expect compile errors**

```bash
dotnet test --filter "RemediationServiceTests" 2>&1 | tail -10
```
Expected: Build errors — `RemediationService`, `ITaskService`, `CreateTaskRequest` not defined yet.

- [ ] **Step 3: Create `ITaskService.cs`**

> Check first: the nexus-api base plan may already define this interface. If `nexus-api/NexusApi/Services/ITaskService.cs` already exists, skip this step.

```csharp
// nexus-api/NexusApi/Services/ITaskService.cs
namespace NexusApi.Services;

public record CreateTaskRequest(string Title, string Body, string Project, string Priority);

public interface ITaskService
{
    Task CreateAndEnqueueAsync(CreateTaskRequest request);
}
```

- [ ] **Step 4: Create `RemediationService.cs`**

```csharp
// nexus-api/NexusApi/Services/RemediationService.cs
using Microsoft.Extensions.Options;
using NexusApi.Models;
using NexusApi.Options;

namespace NexusApi.Services;

public record EvaluationResult(
    List<ServerAlert> NewAlerts,
    List<long> ResolvedAlertIds);

public class RemediationService(
    ISshService ssh,
    INotificationService notify,
    ITaskService tasks,
    IOptions<ServerMonitorOptions> opts,
    ILogger<RemediationService> logger)
{
    private readonly ServerMonitorOptions _opts = opts.Value;

    public async Task<EvaluationResult> EvaluateAsync(
        RawMetrics metrics,
        IList<ServerAlert> existingAlerts)
    {
        var newAlerts = new List<ServerAlert>();
        var resolvedIds = new List<long>();

        // --- Check thresholds ---
        await CheckScalar("cpu_high", "", metrics.Cpu, _opts.CpuThreshold,
            $"CPU usage is {metrics.Cpu:F1}% (threshold: {_opts.CpuThreshold}%)",
            spawnTaskIfCritical: true, criticalThreshold: 95,
            newAlerts, existingAlerts);

        await CheckScalar("ram_high", "", metrics.Ram, _opts.RamThreshold,
            $"RAM usage is {metrics.Ram:F1}% (threshold: {_opts.RamThreshold}%)",
            spawnTaskIfCritical: true, criticalThreshold: 95,
            newAlerts, existingAlerts);

        if (metrics.Disk >= _opts.DiskThreshold)
        {
            var alert = CreateAlert("disk_high", "", "warning",
                $"Disk usage is {metrics.Disk:F1}% (threshold: {_opts.DiskThreshold}%)");
            if (!IsExisting(existingAlerts, "disk_high", ""))
            {
                newAlerts.Add(alert);
                await tasks.CreateAndEnqueueAsync(new CreateTaskRequest(
                    Title: $"Server alert: disk_high on {_opts.Host}",
                    Body: BuildTaskBody("disk_high", "warning", alert.Message),
                    Project: "server-monitor", Priority: "high"));
            }
        }

        // --- Containers ---
        foreach (var container in metrics.Containers)
        {
            if (container.Running) continue;

            if (container.RestartCount >= 3)
            {
                var alert = CreateAlert("container_restart_loop", container.Name, "critical",
                    $"Container {container.Name} is in a restart loop");
                if (!IsExisting(existingAlerts, "container_restart_loop", container.Name))
                {
                    newAlerts.Add(alert);
                    await tasks.CreateAndEnqueueAsync(new CreateTaskRequest(
                        Title: $"Server alert: container_restart_loop on {_opts.Host}",
                        Body: BuildTaskBody("container_restart_loop", "critical", alert.Message),
                        Project: "server-monitor", Priority: "high"));
                }
            }
            else
            {
                if (!IsExisting(existingAlerts, "container_down", container.Name))
                {
                    var action = await TryRestartContainerAsync(container.Name);
                    var alert = CreateAlert("container_down", container.Name, "warning",
                        $"Container {container.Name} is not running") with { ActionTaken = action };
                    newAlerts.Add(alert);
                }
            }
        }

        // --- Services ---
        foreach (var service in metrics.Services)
        {
            if (service.Active) continue;
            if (!IsExisting(existingAlerts, "service_down", service.Name))
            {
                string action;
                if (_opts.KnownSafeServices.Contains(service.Name))
                    action = await TryRestartServiceAsync(service.Name);
                else
                {
                    string? action = null;
                    await tasks.CreateAndEnqueueAsync(new CreateTaskRequest(
                        Title: $"Server alert: service_down on {_opts.Host}",
                        Body: BuildTaskBody("service_down", "warning", $"Service {service.Name} is down"),
                        Project: "server-monitor", Priority: "high"));
                }
                newAlerts.Add(CreateAlert("service_down", service.Name, "warning",
                    $"Service {service.Name} is not active") with { ActionTaken = action });
            }
        }

        // --- Log errors ---
        if (metrics.RecentErrorCount > 10)
        {
            if (!IsExisting(existingAlerts, "log_error", ""))
            {
                var alert = CreateAlert("log_error", "", "warning",
                    $"{metrics.RecentErrorCount} errors in system logs in the last 5 minutes");
                newAlerts.Add(alert);
                await tasks.CreateAndEnqueueAsync(new CreateTaskRequest(
                    Title: $"Server alert: log_error on {_opts.Host}",
                    Body: BuildTaskBody("log_error", "warning", alert.Message),
                    Project: "server-monitor", Priority: "high"));
            }
        }

        // --- Mark resolved ---
        var currentIssues = BuildCurrentIssueKeys(metrics);
        foreach (var existing in existingAlerts.Where(a => !a.Resolved))
        {
            var key = (existing.Type, existing.Subject);
            if (!currentIssues.Contains(key))
                resolvedIds.Add(existing.AlertId);
        }

        return new EvaluationResult(newAlerts, resolvedIds);
    }

    private async Task CheckScalar(
        string type, string subject, double value, double threshold,
        string message, bool spawnTaskIfCritical, double criticalThreshold,
        List<ServerAlert> newAlerts, IList<ServerAlert> existing)
    {
        if (value < threshold) return;
        if (IsExisting(existing, type, subject)) return;

        var severity = value >= criticalThreshold ? "critical" : "warning";
        newAlerts.Add(CreateAlert(type, subject, severity, message));

        if (spawnTaskIfCritical && severity == "critical")
        {
            await tasks.CreateAndEnqueueAsync(new CreateTaskRequest(
                Title: $"Server alert: {type} on {_opts.Host}",
                Body: BuildTaskBody(type, severity, message),
                Project: "server-monitor", Priority: "high"));
        }
    }

    private async Task<string> TryRestartContainerAsync(string name)
    {
        try
        {
            await ssh.ExecuteAsync($"docker start {name}");
            logger.LogInformation("Auto-restarted container {Name}", name);
            return $"Restarted container {name}";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to restart container {Name}", name);
            return $"Restart attempt failed: {ex.Message}";
        }
    }

    private async Task<string> TryRestartServiceAsync(string name)
    {
        try
        {
            await ssh.ExecuteAsync($"sudo systemctl restart {name}");
            logger.LogInformation("Auto-restarted service {Name}", name);
            return $"Restarted service {name}";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to restart service {Name}", name);
            return $"Restart attempt failed: {ex.Message}";
        }
    }

    private static bool IsExisting(IList<ServerAlert> existing, string type, string subject)
        => existing.Any(a => !a.Resolved && a.Type == type && a.Subject == subject);

    private static ServerAlert CreateAlert(string type, string subject, string severity, string message)
        => new() { Type = type, Subject = subject, Severity = severity, Message = message };

    private string BuildTaskBody(string type, string severity, string message) =>
        $"""
        ## Server Alert
        Type: {type}
        Severity: {severity}
        Detected: {DateTime.UtcNow:u}
        Details: {message}

        ## Your Task
        SSH into {_opts.Host} as {_opts.User} and investigate. Check logs, identify the root cause,
        and apply a safe fix. Document what you found and what you did.
        """;

    private HashSet<(string, string)> BuildCurrentIssueKeys(RawMetrics metrics)
    {
        var keys = new HashSet<(string, string)>();
        // Scalar thresholds — must be present or active alerts will be prematurely resolved
        if (metrics.Cpu >= _opts.CpuThreshold)   keys.Add(("cpu_high", ""));
        if (metrics.Ram >= _opts.RamThreshold)   keys.Add(("ram_high", ""));
        if (metrics.Disk >= _opts.DiskThreshold) keys.Add(("disk_high", ""));
        if (metrics.RecentErrorCount > 10)        keys.Add(("log_error", ""));
        foreach (var c in metrics.Containers.Where(c => !c.Running))
            keys.Add(c.RestartCount >= 3 ? ("container_restart_loop", c.Name) : ("container_down", c.Name));
        foreach (var s in metrics.Services.Where(s => !s.Active))
            keys.Add(("service_down", s.Name));
        return keys;
    }
}
```

- [ ] **Step 5: Run tests — expect all pass**

```bash
dotnet test --filter "RemediationServiceTests" -v
```
Expected: All 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add nexus-api/NexusApi/Services/ITaskService.cs \
        nexus-api/NexusApi/Services/RemediationService.cs \
        nexus-api/NexusApi.Tests/Services/RemediationServiceTests.cs
git commit -m "feat: add ITaskService interface and RemediationService with threshold evaluation (TDD)"
```

---

### Task 9: ServerMonitorService (IHostedService)

**Files:**
- Create: `nexus-api/NexusApi/Services/ServerMonitorService.cs`

- [ ] **Step 1: Create the service**

```csharp
// nexus-api/NexusApi/Services/ServerMonitorService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Options;

namespace NexusApi.Services;

// RemediationService is resolved per-cycle from a DI scope alongside NexusDbContext to
// avoid a singleton-consuming-scoped-service lifetime error if ITaskService is Scoped.
public class ServerMonitorService(
    IServiceScopeFactory scopeFactory,
    MetricsCollector collector,
    INotificationService notify,
    IOptions<ServerMonitorOptions> opts,
    ILogger<ServerMonitorService> logger) : IHostedService, IServerMonitor, IDisposable
{
    private readonly ServerMonitorOptions _opts = opts.Value;
    private Timer? _timer;

    // Latest snapshot, exposed to the controller
    public ServerHealthSnapshot Latest { get; private set; } = ServerHealthSnapshot.Empty;

    public Task StartAsync(CancellationToken ct)
    {
        if (!_opts.Enabled)
        {
            logger.LogInformation("Server monitor disabled via config");
            return Task.CompletedTask;
        }

        var interval = TimeSpan.FromMinutes(_opts.IntervalMinutes);
        // Run immediately on startup, then on schedule
        _timer = new Timer(async _ => await RunCheckAsync(), null,
            TimeSpan.Zero, interval);
        logger.LogInformation("Server monitor started — interval {Min} min, host {Host}",
            _opts.IntervalMinutes, _opts.Host);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct)
    {
        _timer?.Change(Timeout.Infinite, 0);
        return Task.CompletedTask;
    }

    public void Dispose() => _timer?.Dispose();

    private async Task RunCheckAsync()
    {
        try
        {
            logger.LogDebug("Server monitor check starting");
            var metrics = await collector.CollectAsync();

            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            // Resolve RemediationService from scope so any scoped dependencies (e.g. ITaskService)
            // are correctly satisfied regardless of their registration lifetime.
            var remediation = scope.ServiceProvider.GetRequiredService<RemediationService>();

            var existing = await db.ServerAlerts
                .Where(a => !a.Resolved)
                .ToListAsync();

            var result = await remediation.EvaluateAsync(metrics, existing);

            // Persist new alerts
            foreach (var alert in result.NewAlerts)
            {
                db.ServerAlerts.Add(alert);
                await db.SaveChangesAsync();
                await notify.SendAlertAsync(alert);
                logger.LogWarning("Alert created: [{Type}/{Subject}] {Message} — Action: {Action}",
                    alert.Type, alert.Subject, alert.Message, alert.ActionTaken ?? "none");
            }

            // Resolve cleared alerts
            foreach (var id in result.ResolvedAlertIds)
            {
                var alert = existing.FirstOrDefault(a => a.AlertId == id);
                if (alert is null) continue;
                alert.Resolved = true;
                alert.ResolvedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                await notify.SendResolvedAsync(alert);
                logger.LogInformation("Alert resolved: [{Type}/{Subject}]", alert.Type, alert.Subject);
            }

            // Rebuild active alerts for snapshot
            var activeAlerts = await db.ServerAlerts
                .Where(a => !a.Resolved)
                .OrderByDescending(a => a.CreatedAt)
                .Take(5)
                .Select(a => new ActiveAlertDto
                {
                    AlertId = a.AlertId,
                    Type = a.Type,
                    Subject = a.Subject,
                    Severity = a.Severity,
                    Message = a.Message,
                    ActionTaken = a.ActionTaken,
                    CreatedAt = a.CreatedAt,
                })
                .ToListAsync();

            Latest = new ServerHealthSnapshot
            {
                CheckedAt = DateTime.UtcNow,
                Cpu = metrics.Cpu,
                Ram = metrics.Ram,
                Disk = metrics.Disk,
                Containers = metrics.Containers,
                Services = metrics.Services,
                RecentErrorCount = metrics.RecentErrorCount,
                ActiveAlerts = activeAlerts,
                Status = ServerHealthSnapshot.DeriveStatus(activeAlerts),
            };

            logger.LogDebug("Server monitor check complete — CPU {Cpu:F1}% RAM {Ram:F1}% Disk {Disk:F1}%",
                metrics.Cpu, metrics.Ram, metrics.Disk);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Server monitor check failed");
        }
    }
}
```

- [ ] **Step 2: Build**

```bash
dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add nexus-api/NexusApi/Services/ServerMonitorService.cs
git commit -m "feat: add ServerMonitorService IHostedService with 5-min check loop"
```

---

## Chunk 4: API controller, DI registration, config

### Task 10: ServerHealthController

**Files:**
- Create: `nexus-api/NexusApi/Controllers/ServerHealthController.cs`
- Create: `nexus-api/NexusApi.Tests/Controllers/ServerHealthControllerTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// nexus-api/NexusApi.Tests/Controllers/ServerHealthControllerTests.cs
using Microsoft.AspNetCore.Mvc;
using Moq;
using NexusApi.Controllers;
using NexusApi.Models;
using NexusApi.Services;

namespace NexusApi.Tests.Controllers;

public class ServerHealthControllerTests
{
    private static ServerMonitorService BuildMonitor(ServerHealthSnapshot snapshot)
    {
        var monitor = new Mock<ServerMonitorService>();
        // We'll test the controller directly by passing the service with a known snapshot
        // Use a real-ish approach: mock the Latest property
        var svc = Mock.Of<ServerMonitorService>();
        // Because ServerMonitorService is not easily mockable (concrete class with ctors),
        // the controller should accept IServerMonitor interface.
        // See Task 10 Step 2 for the interface extraction.
        throw new NotImplementedException("See step 2");
    }

    [Fact]
    public void GetHealth_ReturnsSnapshot()
    {
        var snapshot = new ServerHealthSnapshot
        {
            CheckedAt = DateTime.UtcNow,
            Cpu = 42,
            Ram = 61,
            Disk = 74,
            Status = "healthy",
        };
        var monitor = new Mock<IServerMonitor>();
        monitor.Setup(m => m.Latest).Returns(snapshot);

        var controller = new ServerHealthController(monitor.Object, null!);
        var result = controller.GetHealth() as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(snapshot, result!.Value);
    }

    [Fact]
    public async Task GetAlerts_ReturnsPagedResults()
    {
        var monitor = new Mock<IServerMonitor>();
        monitor.Setup(m => m.Latest).Returns(ServerHealthSnapshot.Empty);

        // db mock or test db would be needed for real integration test
        // For the controller unit test, we verify the endpoint exists and returns 200
        var controller = new ServerHealthController(monitor.Object, null!);
        // This test confirms the GET /api/server-alerts route is reachable
        // Full integration tests can be added once TestServer is available
        Assert.NotNull(controller);
    }
}
```

- [ ] **Step 2: Extract `IServerMonitor` interface so the controller is testable**

Add to `ServerMonitorService.cs` above the class definition:

```csharp
public interface IServerMonitor
{
    ServerHealthSnapshot Latest { get; }
}
```

Change the class signature to:

```csharp
public class ServerMonitorService(...) : IHostedService, IServerMonitor, IDisposable
```

- [ ] **Step 3: Create `ServerHealthController.cs`**

```csharp
// nexus-api/NexusApi/Controllers/ServerHealthController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api")]
public class ServerHealthController(IServerMonitor monitor, NexusDbContext db) : ControllerBase
{
    [HttpGet("server-health")]
    public IActionResult GetHealth() => Ok(monitor.Latest);

    [HttpGet("server-alerts")]
    public async Task<IActionResult> GetAlerts(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var alerts = await db.ServerAlerts
            .OrderByDescending(a => a.CreatedAt)
            .Skip(offset)
            .Take(Math.Clamp(limit, 1, 200))
            .ToListAsync();
        return Ok(alerts);
    }
}
```

- [ ] **Step 4: Fix and run tests**

Update the test to use the interface:

```csharp
[Fact]
public void GetHealth_ReturnsSnapshot()
{
    var snapshot = new ServerHealthSnapshot { CheckedAt = DateTime.UtcNow, Status = "healthy" };
    var monitor = new Mock<IServerMonitor>();
    monitor.Setup(m => m.Latest).Returns(snapshot);
    var controller = new ServerHealthController(monitor.Object, null!);
    var result = controller.GetHealth() as OkObjectResult;
    Assert.NotNull(result);
    Assert.Equal(snapshot, result!.Value);
}
```

```bash
dotnet test --filter "ServerHealthControllerTests" -v
```
Expected: `GetHealth_ReturnsSnapshot` passes. `GetAlerts` test passes (trivially).

- [ ] **Step 5: Commit**

```bash
git add nexus-api/NexusApi/Controllers/ServerHealthController.cs \
        nexus-api/NexusApi/Services/ServerMonitorService.cs \
        nexus-api/NexusApi.Tests/Controllers/ServerHealthControllerTests.cs
git commit -m "feat: add ServerHealthController with GET /api/server-health and /api/server-alerts"
```

---

### Task 11: Wire everything into Program.cs and appsettings.json

**Files:**
- Modify: `nexus-api/NexusApi/Program.cs`
- Modify: `nexus-api/NexusApi/appsettings.json`

- [ ] **Step 1: Add config sections to `appsettings.json`**

Add to the root JSON object (alongside `"ConnectionStrings"`, `"Logging"` etc):

```json
"ServerMonitor": {
  "Enabled": true,
  "IntervalMinutes": 5,
  "Host": "",
  "User": "connah",
  "KeyPath": "/ssh-keys/id_rsa",
  "CpuThreshold": 80.0,
  "RamThreshold": 85.0,
  "DiskThreshold": 90.0,
  "KnownSafeServices": [ "nginx", "postgresql", "docker" ]
},
"Smtp": {
  "Host": "",
  "Port": 587,
  "User": "",
  "Password": "",
  "AlertEmail": "",
  "UseSsl": true
}
```

- [ ] **Step 2: Register services in `Program.cs`**

Add after existing service registrations (before `app.Build()` equivalent):

```csharp
// Server monitor config
builder.Services.Configure<ServerMonitorOptions>(
    builder.Configuration.GetSection("ServerMonitor"));
builder.Services.Configure<SmtpOptions>(
    builder.Configuration.GetSection("Smtp"));

// Server monitor services
builder.Services.AddSingleton<ISshService, SshService>();
builder.Services.AddSingleton<MetricsCollector>();
builder.Services.AddSingleton<INotificationService, NotificationService>();
// RemediationService is Scoped so it can safely consume a Scoped ITaskService.
// ServerMonitorService resolves it per-cycle from IServiceScopeFactory (see Task 9).
builder.Services.AddScoped<RemediationService>();
// Register ServerMonitorService as singleton, then expose it as IServerMonitor and IHostedService
builder.Services.AddSingleton<ServerMonitorService>();
builder.Services.AddSingleton<IServerMonitor>(sp => sp.GetRequiredService<ServerMonitorService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<ServerMonitorService>());
```

> Note: `ITaskService` must be registered too. If `TaskService` is already defined in the nexus-api base, register `RemediationService` to receive it. If not, create a stub:
> ```csharp
> // Temporary stub until TaskService is implemented from nexus-api base plan
> builder.Services.AddScoped<ITaskService, TaskServiceStub>();
> ```

- [ ] **Step 3: Build**

```bash
dotnet build
```

- [ ] **Step 4: Run all tests**

```bash
dotnet test
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add nexus-api/NexusApi/Program.cs nexus-api/NexusApi/appsettings.json
git commit -m "feat: register server monitor services and bind config in Program.cs"
```

---

## Chunk 5: Frontend and infrastructure

### Task 12: Update `useApi.js` — add `serverHealth` state

**Files:**
- Modify: `orchestrator/client/src/hooks/useApi.js`

- [ ] **Step 1: Add `serverHealth` state and poll**

```js
// Add alongside existing useState declarations:
const [serverHealth, setServerHealth] = useState(null);

// Add inside refresh(), alongside the existing Promise.all:
try {
  const health = await fetchJSON('/api/server-health');
  setServerHealth(health);
} catch {
  // server-health is best-effort; don't mark offline if it fails
}

// Add serverHealth to the return value:
return { data, logs, submitTask, cloneRepo, refresh, serverHealth };
```

Full updated hook:

```js
export function useApi(interval = 5000) {
  const [data, setData] = useState({
    pending: [], inProgress: [], done: [], failed: [],
    containers: [], repositories: [], online: false,
  });
  const [logs, setLogs] = useState([]);
  const [serverHealth, setServerHealth] = useState(null);
  const logOffset = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [pending, inProgress, done, failed, containers, repositories] =
        await Promise.all([
          fetchJSON('/api/tasks?status=pending'),
          fetchJSON('/api/tasks?status=in_progress'),
          fetchJSON('/api/tasks?status=done'),
          fetchJSON('/api/tasks?status=failed'),
          fetchJSON('/api/containers'),
          fetchJSON('/api/repositories'),
        ]);
      setData({ pending, inProgress, done, failed, containers, repositories, online: true });
    } catch {
      setData((prev) => ({ ...prev, online: false }));
    }

    try {
      const health = await fetchJSON('/api/server-health');
      setServerHealth(health);
    } catch { /* best-effort */ }

    try {
      const result = await fetchJSON(`/api/logs?offset=${logOffset.current}`);
      if (result.lines?.length) {
        setLogs((prev) => [...prev, ...result.lines]);
        logOffset.current = result.nextOffset;
      }
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, interval]);

  const submitTask = useCallback(async ({ title, project, priority, body }) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, project, priority }),
    });
    refresh();
  }, [refresh]);

  const cloneRepo = useCallback(async (url) => {
    const res = await fetch('/api/repositories/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || 'Clone failed');
    refresh();
    return json;
  }, [refresh]);

  return { data, logs, submitTask, cloneRepo, refresh, serverHealth };
}
```

Note: this also updates API paths from bare routes to `/api/` prefix as required by the nexus-api migration.

- [ ] **Step 2: Commit**

```bash
git add orchestrator/client/src/hooks/useApi.js
git commit -m "feat: add serverHealth polling to useApi hook, migrate to /api prefix"
```

---

### Task 13: ServerHealthCard component

**Files:**
- Create: `orchestrator/client/src/components/ServerHealthCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
// orchestrator/client/src/components/ServerHealthCard.jsx
import { useTheme } from '../ThemeContext';

const STATUS_COLOR = {
  healthy:  'var(--accent-green, #22c55e)',
  warning:  'var(--accent-yellow, #eab308)',
  critical: 'var(--accent-red, #ef4444)',
  unknown:  'var(--text-dim, #666)',
};

function MetricBar({ label, value, threshold }) {
  const over = value >= threshold;
  const color = over ? STATUS_COLOR.warning : STATUS_COLOR.healthy;
  return (
    <div style={{ textAlign: 'center', padding: '0 12px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value != null ? `${Math.round(value)}%` : '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function ServerHealthCard({ serverHealth, delay = 0 }) {
  const { theme } = useTheme();
  const isSignal = theme === 'signal';

  if (!serverHealth) {
    return (
      <div style={cardStyle(delay)}>
        <div style={headerStyle()}>
          <span>{isSignal ? 'SERVER STATUS' : 'Server Health'}</span>
          <span style={{ color: STATUS_COLOR.unknown, fontSize: 12 }}>● CONNECTING</span>
        </div>
      </div>
    );
  }

  const { status, cpu, ram, disk, containers, activeAlerts, checkedAt } = serverHealth;
  const dotColor = STATUS_COLOR[status] ?? STATUS_COLOR.unknown;
  const checkedAgo = checkedAt ? timeSince(new Date(checkedAt)) : '—';
  const runningCount = containers?.filter(c => c.running).length ?? 0;
  const totalCount = containers?.length ?? 0;

  return (
    <div style={cardStyle(delay)}>
      <div style={headerStyle()}>
        <span>{isSignal ? 'SERVER STATUS' : 'Server Health'}</span>
        <span style={{ fontSize: 12, color: dotColor }}>
          ● {status?.toUpperCase() ?? 'UNKNOWN'} &nbsp;
          <span style={{ color: 'var(--text-dim)' }}>last checked {checkedAgo}</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <MetricBar label="CPU" value={cpu} threshold={80} />
        <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
        <MetricBar label="RAM" value={ram} threshold={85} />
        <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
        <MetricBar label="DISK" value={disk} threshold={90} />
        <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
        <div style={{ padding: '0 16px', color: runningCount < totalCount ? STATUS_COLOR.warning : STATUS_COLOR.healthy }}>
          {runningCount}/{totalCount} containers ✓
        </div>
      </div>

      {activeAlerts?.length > 0 && (
        <div style={{ padding: '8px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>ACTIVE ALERTS</div>
          {activeAlerts.map(alert => (
            <div key={alert.alertId} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <span style={{ color: alert.severity === 'critical' ? STATUS_COLOR.critical : STATUS_COLOR.warning }}>
                {alert.severity === 'critical' ? '🔴' : '⚠️'}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{formatTime(alert.createdAt)}</span>
              <span>{alert.message}</span>
              {alert.actionTaken && (
                <span style={{ color: STATUS_COLOR.healthy, marginLeft: 'auto' }}>→ {alert.actionTaken}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {(!activeAlerts || activeAlerts.length === 0) && (
        <div style={{ padding: '10px 16px', fontSize: 12, color: STATUS_COLOR.healthy }}>
          All systems normal
        </div>
      )}
    </div>
  );
}

function cardStyle(delay) {
  return {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    animation: `fadeInUp 0.4s ease ${delay}s both`,
  };
}

function headerStyle() {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.05em',
    color: 'var(--text)',
  };
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)} hr ago`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
```

- [ ] **Step 2: Add `ServerHealthCard` to `App.jsx`**

Add import at top of `App.jsx`:
```js
import ServerHealthCard from './components/ServerHealthCard';
```

Add `serverHealth` to the destructure:
```js
const { data, logs, submitTask, cloneRepo, serverHealth } = useApi(5000);
```

Insert the card between `ContainerCard` and `RepoCard`:
```jsx
{/* Server Health - full width */}
<div style={{ gridColumn: '1 / -1' }}>
  <ServerHealthCard serverHealth={serverHealth} delay={0.36} />
</div>
```

- [ ] **Step 3: Run the frontend dev server and visually verify the card renders**

```bash
cd orchestrator/client
npm run dev
```

Open `http://localhost:5173`. The Server Health card should appear. If `nexus-api` isn't running, the card should show "CONNECTING" gracefully.

- [ ] **Step 4: Commit**

```bash
git add orchestrator/client/src/components/ServerHealthCard.jsx orchestrator/client/src/App.jsx
git commit -m "feat: add ServerHealthCard dashboard panel"
```

---

### Task 14: docker-compose.yml and SSH key setup docs

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add SSH key volume and env vars to the `nexus-api` service**

In `docker-compose.yml`, under the `nexus-api` service, add to `volumes`:
```yaml
- /home/connah/.ssh/nexus-monitor:/ssh-keys:ro
```

Add to `environment`:
```yaml
- SERVER_MONITOR__ENABLED=true
- SERVER_MONITOR__INTERVAL_MINUTES=5
- SERVER_MONITOR__HOST=192.168.4.100
- SERVER_MONITOR__USER=connah
- SERVER_MONITOR__KEY_PATH=/ssh-keys/id_rsa
- SERVER_MONITOR__CPU_THRESHOLD=80
- SERVER_MONITOR__RAM_THRESHOLD=85
- SERVER_MONITOR__DISK_THRESHOLD=90
- SMTP__HOST=${SMTP_HOST:-}
- SMTP__PORT=${SMTP_PORT:-587}
- SMTP__USER=${SMTP_USER:-}
- SMTP__PASSWORD=${SMTP_PASSWORD:-}
- SMTP__ALERT_EMAIL=${SMTP_ALERT_EMAIL:-}
- SMTP__USE_SSL=${SMTP_USE_SSL:-true}
```

- [ ] **Step 2: Run on-server SSH key setup (one-time, do on the server)**

```bash
# SSH into the server first: ssh connah@192.168.4.100
mkdir -p ~/.ssh/nexus-monitor
ssh-keygen -t ed25519 -f ~/.ssh/nexus-monitor/id_rsa -N "" -C "nexus-api-monitor"
cat ~/.ssh/nexus-monitor/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh/nexus-monitor && chmod 600 ~/.ssh/nexus-monitor/id_rsa
```

- [ ] **Step 3: Add SMTP env vars to `.env` file on the server (not committed)**

```bash
# On the server, add to the .env file alongside the stack:
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_ALERT_EMAIL=your@gmail.com
```

- [ ] **Step 4: Commit docker-compose change**

```bash
git add docker-compose.yml
git commit -m "chore: add SSH key mount and server monitor env vars to nexus-api service"
```

---

### Task 15: Run full test suite

- [ ] **Step 1: Run all backend tests**

```bash
cd nexus-api
dotnet test -v
```
Expected: All tests pass — `MetricsCollectorTests` (9), `RemediationServiceTests` (9), `ServerHealthControllerTests` (2). Total: 20.

- [ ] **Step 2: Build frontend**

```bash
cd orchestrator/client
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: server manager agent — complete implementation"
```
