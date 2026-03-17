// nexus-api/NexusApi/Models/Dtos.cs
namespace NexusApi.Models;

// ----- Tasks -----
public record CreateTaskRequest(string Title, string Body, string Project, string Priority = "medium");

public record TaskResponse(
    long TaskId, string ExternalId, string Title, string Project,
    string Priority, string Status, string TaskType, long? ParentTaskId, string? VaultNotePath,
    DateTimeOffset CreatedAt, DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt,
    IEnumerable<RunSummary> Runs);

// ----- Goals -----
public record CreateGoalRequest(string Title, string Body, string Project);

public record SubtaskSummary(
    long TaskId, string ExternalId, string Title,
    string Status, string? Summary,
    DateTimeOffset CreatedAt, DateTimeOffset? CompletedAt);

public record GoalResponse(
    long TaskId, string ExternalId, string Title, string Body,
    string Project, string Status, string? Summary,
    DateTimeOffset CreatedAt, DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt,
    IEnumerable<SubtaskSummary> Subtasks);

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
