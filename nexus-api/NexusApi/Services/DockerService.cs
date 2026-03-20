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
            $"{_opts.HostVaultPath}:/home/agent/vault",
        };

        var env = new List<string>();
        if (!string.IsNullOrEmpty(_opts.AnthropicApiKey))
            env.Add($"ANTHROPIC_API_KEY={_opts.AnthropicApiKey}");
        if (!string.IsNullOrEmpty(_opts.GithubToken))
            env.Add($"GITHUB_TOKEN={_opts.GithubToken}");

        // Mount claude config rw so agents can auto-refresh OAuth tokens
        binds.Add($"{_opts.HostClaudeCreds}:/home/agent/.claude");

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
        // Plugin operations need rw access so install/uninstall can write to ~/.claude
        var binds = new List<string>
        {
            $"{_opts.HostClaudeCreds}:/home/agent/.claude",
        };
        var fullArgs = new[] { "plugin" }.Concat(args).ToArray();
        return await RunContainerAsync(
            _opts.AgentImage,
            fullArgs,
            binds,
            [],
            workingDir: "/home/agent/.claude",
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

    public async Task<(string ContainerId, string Output)> RunAuthCommandAsync(
        string command, TimeSpan? timeout = null, CancellationToken ct = default)
    {
        await PullImageAsync(_opts.AgentImage, ct);

        var binds = new List<string>
        {
            $"{_opts.HostClaudeCreds}:/home/agent/.claude",
        };

        var container = await _docker.Containers.CreateContainerAsync(new CreateContainerParameters
        {
            Image = _opts.AgentImage,
            Entrypoint = ["/bin/bash", "-c", command],
            Cmd = [],
            User = "1000:1000",
            WorkingDir = "/home/agent",
            HostConfig = new HostConfig
            {
                Binds = binds,
                AutoRemove = false,
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

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(timeout ?? TimeSpan.FromSeconds(30));

            (string stdout, string stderr) = await stream.ReadOutputToEndAsync(cts.Token);
            var output = stdout;
            if (!string.IsNullOrWhiteSpace(stderr))
                log.LogWarning("Auth container stderr: {Stderr}", stderr);

            var wait = await _docker.Containers.WaitContainerAsync(container.ID, cts.Token);
            if (wait.StatusCode != 0)
                log.LogWarning("Auth container exited with code {Code}: {Stderr}", wait.StatusCode, stderr);

            return (container.ID[..12], output);
        }
        catch (OperationCanceledException)
        {
            // For login commands, the container may still be running waiting for callback
            return (container.ID[..12], "timeout");
        }
        finally
        {
            try
            {
                var inspect = await _docker.Containers.InspectContainerAsync(container.ID, ct);
                if (inspect.State.Running)
                {
                    // Don't remove running containers (login flow waiting for callback)
                    log.LogInformation("Auth container {Id} still running", container.ID[..12]);
                }
                else
                {
                    await _docker.Containers.RemoveContainerAsync(container.ID, new ContainerRemoveParameters(), ct);
                }
            }
            catch (Exception ex)
            {
                log.LogWarning("Auth container cleanup (non-fatal): {Error}", ex.Message);
            }
        }
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
            {
                var detail = new System.Text.StringBuilder();
                detail.Append($"Container exited with code {wait.StatusCode}");
                if (!string.IsNullOrWhiteSpace(stderr))
                    detail.Append($"\nStderr: {(stderr.Length > 2000 ? stderr[..2000] + "…" : stderr)}");
                if (output.Length > 0)
                    detail.Append($"\nStdout: {(output.Length > 500 ? output.ToString()[..500] + "…" : output.ToString())}");
                throw new InvalidOperationException(detail.ToString());
            }

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
