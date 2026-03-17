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

    public async Task WriteGoalNoteAsync(string goalId, string title, string project, string status, string? summary, IEnumerable<string> subtaskTitles)
    {
        var dir = Path.Combine(_vaultRoot, "AgentSystem", "goals");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"{goalId}.md");

        var bulletList = string.Join("\n", subtaskTitles.Select(t => $"- {t}"));
        var summaryText = summary ?? "In progress...";
        var now = DateTimeOffset.UtcNow.ToString("o");

        var content = $"""
            ---
            id: {goalId}
            title: {title}
            project: {project}
            status: {status}
            updated: {now}
            ---

            # {title}

            ## Subtasks
            {bulletList}

            ## Summary
            {summaryText}
            """;

        await File.WriteAllTextAsync(path, content);
    }

    public async Task AppendProjectObservationsAsync(string project, string observations)
    {
        var dir = Path.Combine(_vaultRoot, "AgentSystem", "projects", project);
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, "memory.md");

        var now = DateTimeOffset.UtcNow.ToString("o");
        var append = $"\n\n<!-- {now} -->\n{observations}";

        await File.AppendAllTextAsync(path, append);
    }
}
