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
    public IActionResult List()
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
