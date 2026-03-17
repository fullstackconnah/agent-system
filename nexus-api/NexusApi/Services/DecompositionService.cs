// nexus-api/NexusApi/Services/DecompositionService.cs
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using NexusApi.Options;

namespace NexusApi.Services;

public class DecompositionService(
    HttpClient http,
    IOptions<AgentOptions> opts,
    ILogger<DecompositionService> log) : IDecompositionService
{
    private readonly AgentOptions _opts = opts.Value;

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public async Task<IReadOnlyList<SubtaskSpec>> DecomposeAsync(
        string goalTitle, string goalBody, string project, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_opts.AnthropicApiKey))
        {
            log.LogWarning("No ANTHROPIC_API_KEY — returning single subtask");
            return [new SubtaskSpec(goalTitle, goalBody)];
        }

        try
        {
            var systemPrompt = """
                You are a technical project manager. Decompose the given goal into 1-5 concrete,
                independent subtasks that can each be completed by a software engineer in one session.
                Each subtask should be specific and actionable.

                Respond with ONLY a JSON array in this exact format, no markdown, no explanation:
                [
                  {"title": "Subtask title", "body": "Detailed description of what to do"},
                  ...
                ]
                """;

            var userPrompt = $"Project: {project}\n\nGoal: {goalTitle}\n\n{goalBody}";

            var requestBody = JsonSerializer.Serialize(new
            {
                model = _opts.OrchestratorModel,
                max_tokens = 2048,
                system = systemPrompt,
                messages = new[] { new { role = "user", content = userPrompt } }
            });

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", _opts.AnthropicApiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(requestBody, Encoding.UTF8, "application/json");

            var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(responseJson);

            var text = doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "";

            var subtasks = JsonSerializer.Deserialize<List<SubtaskSpecDto>>(text.Trim(), JsonOpts);
            if (subtasks is null or { Count: 0 })
                return [new SubtaskSpec(goalTitle, goalBody)];

            return subtasks.Select(s => new SubtaskSpec(s.Title, s.Body)).ToList();
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Decomposition API call failed — falling back to single subtask");
            return [new SubtaskSpec(goalTitle, goalBody)];
        }
    }

    private record SubtaskSpecDto(string Title, string Body);
}
