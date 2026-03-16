// nexus-api/NexusApi.Tests/Services/VaultServiceTests.cs
using FluentAssertions;
using Microsoft.Extensions.Options;
using NexusApi.Options;
using NexusApi.Services;
using MsOptions = Microsoft.Extensions.Options.Options;

namespace NexusApi.Tests.Services;

public class VaultServiceTests : IDisposable
{
    private readonly string _vaultRoot;
    private readonly VaultService _sut;

    public VaultServiceTests()
    {
        _vaultRoot = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        Directory.CreateDirectory(_vaultRoot);
        var opts = MsOptions.Create(new AgentOptions { VaultPath = _vaultRoot });
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
