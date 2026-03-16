// nexus-api/NexusApi/Services/IPluginService.cs
using NexusApi.Models;

namespace NexusApi.Services;

public interface IPluginService
{
    Task InstallAsync(string name, string marketplaceName, CancellationToken ct = default);
    Task UninstallAsync(string name, CancellationToken ct = default);
}
