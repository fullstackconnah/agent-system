// nexus-api/NexusApi/Services/IVaultService.cs
namespace NexusApi.Services;

public interface IVaultService
{
    Task<string> LoadProjectMemoryAsync(string project);
    Task<string> LoadConventionsAsync();
    Task<string> WriteRunNoteAsync(string project, string taskId, string output);
}
