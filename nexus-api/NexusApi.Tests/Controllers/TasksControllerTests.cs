// nexus-api/NexusApi.Tests/Controllers/TasksControllerTests.cs
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using NexusApi.Data;
using NexusApi.Models;
using NexusApi.Services;
using System.Net;
using System.Net.Http.Json;

namespace NexusApi.Tests.Controllers;

public class TasksControllerTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private HttpClient CreateClient()
    {
        return factory.WithWebHostBuilder(b =>
            b.ConfigureServices(services =>
            {
                // Replace real DB with in-memory for tests.
                // Remove ALL DbContext-related registrations to avoid "multiple providers" error.
                // EF Core 9 stores provider-specific config as IDbContextOptionsConfiguration<TContext>
                // (an internal type), so we match by assembly-qualified name pattern.
                var dbDescriptors = services
                    .Where(d => d.ServiceType == typeof(DbContextOptions<NexusDbContext>)
                             || d.ServiceType == typeof(NexusDbContext)
                             || (d.ServiceType.IsGenericType
                                 && d.ServiceType.GetGenericTypeDefinition().FullName
                                    == "Microsoft.EntityFrameworkCore.Infrastructure.IDbContextOptionsConfiguration`1"))
                    .ToList();
                foreach (var d in dbDescriptors) services.Remove(d);
                services.AddDbContext<NexusDbContext>(o =>
                    o.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}"));

                // Replace Docker singleton with a no-op mock (Docker socket unavailable in tests)
                var dockerDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IDockerService));
                if (dockerDescriptor != null) services.Remove(dockerDescriptor);
                var mockDocker = new Mock<IDockerService>();
                mockDocker.Setup(d => d.RunAgentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                          .ReturnsAsync("mock output");
                mockDocker.Setup(d => d.RunPluginCommandAsync(It.IsAny<string[]>(), It.IsAny<CancellationToken>()))
                          .ReturnsAsync("mock plugin output");
                mockDocker.Setup(d => d.ListAgentContainersAsync(It.IsAny<CancellationToken>()))
                          .ReturnsAsync(Array.Empty<ContainerInfo>());
                services.AddSingleton(mockDocker.Object);
            })).CreateClient();
    }

    [Fact]
    public async Task GetTasks_ReturnsEmpty_WhenNoTasks()
    {
        var client = CreateClient();
        var response = await client.GetAsync("/api/tasks?status=pending");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tasks = await response.Content.ReadFromJsonAsync<List<TaskResponse>>();
        tasks.Should().BeEmpty();
    }

    [Fact]
    public async Task PostTask_Returns202_AndCreatesTask()
    {
        var client = CreateClient();
        var request = new CreateTaskRequest("Test task", "Do something", "myproject");
        var response = await client.PostAsJsonAsync("/api/tasks", request);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        body!["status"].Should().Be("accepted");
    }

    [Fact]
    public async Task GetTask_Returns404_WhenNotFound()
    {
        var client = CreateClient();
        var response = await client.GetAsync("/api/tasks/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
