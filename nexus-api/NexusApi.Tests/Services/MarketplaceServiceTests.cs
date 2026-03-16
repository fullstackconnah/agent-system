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
