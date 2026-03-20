// nexus-api/NexusApi/Controllers/AuthController.cs
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NexusApi.Models;
using NexusApi.Options;
using NexusApi.Services;

namespace NexusApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    IDockerService docker,
    IOptions<AgentOptions> opts,
    ILogger<AuthController> log) : ControllerBase
{
    private readonly AgentOptions _opts = opts.Value;

    /// <summary>
    /// GET /api/auth/status — reads credentials file and reports token status
    /// </summary>
    [HttpGet("status")]
    public IActionResult Status()
    {
        var authMode = string.IsNullOrEmpty(_opts.AnthropicApiKey) ? "oauth" : "api-key";
        var (authenticated, expired, expiresAtIso) = ReadTokenStatus();
        return Ok(new AuthStatusResponse(authenticated, expired, expiresAtIso, authMode));
    }

    /// <summary>
    /// POST /api/auth/refresh — spawns a container running a minimal prompt to trigger OAuth token refresh
    /// </summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        try
        {
            var (_, output) = await docker.RunAuthCommandAsync(
                "claude -p 'respond with OK' --output-format json --max-turns 1",
                TimeSpan.FromSeconds(60),
                ct);

            log.LogInformation("Auth refresh output: {Output}", output.Length > 500 ? output[..500] : output);

            var (_, stillExpired, newExpiresAt) = ReadTokenStatus();

            if (stillExpired)
                return Ok(new AuthRefreshResponse(false, newExpiresAt,
                    "Token could not be refreshed automatically. Use the Login button to re-authenticate."));

            return Ok(new AuthRefreshResponse(true, newExpiresAt, null));
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Auth refresh failed");
            return Ok(new AuthRefreshResponse(false, null, ex.Message));
        }
    }

    /// <summary>
    /// POST /api/auth/login — accepts credentials JSON uploaded from a machine where the user can authenticate.
    /// The frontend reads ~/.claude/.credentials.json from a file input and POSTs the claudeAiOauth section.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] JsonElement body, CancellationToken ct)
    {
        try
        {
            var credsPath = Path.Combine(_opts.ClaudeCreds, ".credentials.json");

            // Read existing file to preserve other keys (mcpOAuth etc.)
            JsonElement existingRoot = default;
            if (System.IO.File.Exists(credsPath))
            {
                try
                {
                    using var existingDoc = JsonDocument.Parse(System.IO.File.ReadAllText(credsPath));
                    existingRoot = existingDoc.RootElement.Clone();
                }
                catch { /* start fresh if corrupt */ }
            }

            // Merge: take the uploaded claudeAiOauth, keep everything else
            using var ms = new System.IO.MemoryStream();
            using (var writer = new Utf8JsonWriter(ms, new JsonWriterOptions { Indented = true }))
            {
                writer.WriteStartObject();

                // Write the uploaded OAuth section
                if (body.TryGetProperty("claudeAiOauth", out var uploadedOauth))
                {
                    writer.WritePropertyName("claudeAiOauth");
                    uploadedOauth.WriteTo(writer);
                }
                else
                {
                    // Assume the entire body IS the oauth object
                    writer.WritePropertyName("claudeAiOauth");
                    body.WriteTo(writer);
                }

                // Preserve other keys from existing file
                if (existingRoot.ValueKind == JsonValueKind.Object)
                {
                    foreach (var prop in existingRoot.EnumerateObject())
                    {
                        if (prop.Name == "claudeAiOauth") continue;
                        writer.WritePropertyName(prop.Name);
                        prop.Value.WriteTo(writer);
                    }
                }

                writer.WriteEndObject();
            }

            var newJson = System.Text.Encoding.UTF8.GetString(ms.ToArray());
            await System.IO.File.WriteAllTextAsync(credsPath, newJson, ct);

            // Set restrictive permissions (best-effort on Linux)
            try
            {
                if (!OperatingSystem.IsWindows())
                    System.IO.File.SetUnixFileMode(credsPath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            }
            catch { /* non-fatal */ }

            log.LogInformation("Credentials updated via login upload");

            var (_, expired, expiresAt) = ReadTokenStatus();
            return Ok(new AuthLoginResponse(true, expiresAt, expired ? "Token uploaded but appears expired" : null));
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Auth login/upload failed");
            return Ok(new AuthLoginResponse(false, null, ex.Message));
        }
    }

    private (bool Authenticated, bool Expired, string? ExpiresAtIso) ReadTokenStatus()
    {
        var credsPath = Path.Combine(_opts.ClaudeCreds, ".credentials.json");
        if (!System.IO.File.Exists(credsPath)) return (false, true, null);

        try
        {
            var json = System.IO.File.ReadAllText(credsPath);
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("claudeAiOauth", out var oauth))
                return (false, true, null);

            var hasToken = oauth.TryGetProperty("accessToken", out var tokenProp)
                           && !string.IsNullOrEmpty(tokenProp.GetString());

            if (oauth.TryGetProperty("expiresAt", out var expProp))
            {
                var expiresAt = DateTimeOffset.FromUnixTimeMilliseconds(expProp.GetInt64());
                return (hasToken, expiresAt < DateTimeOffset.UtcNow, expiresAt.ToString("o"));
            }

            return (hasToken, true, null);
        }
        catch (Exception ex)
        {
            log.LogWarning("Failed to read credentials: {Error}", ex.Message);
            return (false, true, null);
        }
    }
}
