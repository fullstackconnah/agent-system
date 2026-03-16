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
                ((DateTimeOffset)c.Created).ToUnixTimeSeconds()))
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
                false,
                new ContainerAttachParameters { Stream = true, Stdout = true, Stderr = true },
                ct);

            await _docker.Containers.StartContainerAsync(container.ID, null, ct);

            (string stdout, string stderr) = await stream.ReadOutputToEndAsync(ct);
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
