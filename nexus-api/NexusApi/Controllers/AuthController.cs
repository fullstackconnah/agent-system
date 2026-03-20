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
        var credsPath = Path.Combine(_opts.ClaudeCreds, ".credentials.json");

        if (!System.IO.File.Exists(credsPath))
        {
            return Ok(new AuthStatusResponse(
                Authenticated: false,
                Expired: true,
                ExpiresAt: null,
                AuthMode: authMode));
        }

        try
        {
            var json = System.IO.File.ReadAllText(credsPath);
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("claudeAiOauth", out var oauth))
            {
                return Ok(new AuthStatusResponse(false, true, null, authMode));
            }

            var hasToken = oauth.TryGetProperty("accessToken", out var tokenProp)
                           && !string.IsNullOrEmpty(tokenProp.GetString());

            long expiresAtMs = 0;
            var expired = true;
            string? expiresAtIso = null;

            if (oauth.TryGetProperty("expiresAt", out var expProp))
            {
                expiresAtMs = expProp.GetInt64();
                var expiresAtDto = DateTimeOffset.FromUnixTimeMilliseconds(expiresAtMs);
                expired = expiresAtDto < DateTimeOffset.UtcNow;
                expiresAtIso = expiresAtDto.ToString("o");
            }

            return Ok(new AuthStatusResponse(
                Authenticated: hasToken,
                Expired: expired,
                ExpiresAt: expiresAtIso,
                AuthMode: authMode));
        }
        catch (Exception ex)
        {
            log.LogWarning("Failed to read credentials: {Error}", ex.Message);
            return Ok(new AuthStatusResponse(false, true, null, authMode));
        }
    }

    /// <summary>
    /// POST /api/auth/refresh — spawns a container to run 'claude auth status' which triggers token refresh
    /// </summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        try
        {
            var (_, output) = await docker.RunAuthCommandAsync(
                "claude auth status",
                TimeSpan.FromSeconds(30),
                ct);

            log.LogInformation("Auth refresh output: {Output}", output);

            // Re-read the credentials to check the new expiry
            var credsPath = Path.Combine(_opts.ClaudeCreds, ".credentials.json");
            string? newExpiresAt = null;

            if (System.IO.File.Exists(credsPath))
            {
                try
                {
                    var json = System.IO.File.ReadAllText(credsPath);
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("claudeAiOauth", out var oauth)
                        && oauth.TryGetProperty("expiresAt", out var expProp))
                    {
                        newExpiresAt = DateTimeOffset.FromUnixTimeMilliseconds(expProp.GetInt64()).ToString("o");
                    }
                }
                catch { /* best-effort */ }
            }

            return Ok(new AuthRefreshResponse(true, newExpiresAt, null));
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Auth refresh failed");
            return Ok(new AuthRefreshResponse(false, null, ex.Message));
        }
    }

    /// <summary>
    /// POST /api/auth/login — spawns a container running 'claude auth login --no-open' and returns the URL
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(CancellationToken ct)
    {
        try
        {
            // Use a longer timeout — the login command outputs a URL then waits for callback
            var (containerId, output) = await docker.RunAuthCommandAsync(
                "claude auth login --no-open 2>&1",
                TimeSpan.FromSeconds(15),
                ct);

            // Extract URL from output — look for https:// URLs
            string? url = null;
            foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var trimmed = line.Trim();
                var urlIdx = trimmed.IndexOf("https://", StringComparison.Ordinal);
                if (urlIdx >= 0)
                {
                    url = trimmed[urlIdx..].Trim();
                    break;
                }
            }

            if (url == null && output != "timeout")
            {
                return Ok(new AuthLoginResponse(false, null, null, $"No URL found in output: {output}"));
            }

            return Ok(new AuthLoginResponse(true, url, containerId, null));
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Auth login failed");
            return Ok(new AuthLoginResponse(false, null, null, ex.Message));
        }
    }

    /// <summary>
    /// GET /api/auth/login/callback-status — checks if the login container finished (token was refreshed)
    /// </summary>
    [HttpGet("login/callback-status")]
    public IActionResult CallbackStatus()
    {
        var credsPath = Path.Combine(_opts.ClaudeCreds, ".credentials.json");

        if (!System.IO.File.Exists(credsPath))
        {
            return Ok(new AuthLoginCallbackResponse(false, false, null));
        }

        try
        {
            var json = System.IO.File.ReadAllText(credsPath);
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("claudeAiOauth", out var oauth))
            {
                return Ok(new AuthLoginCallbackResponse(false, false, null));
            }

            var hasToken = oauth.TryGetProperty("accessToken", out var tokenProp)
                           && !string.IsNullOrEmpty(tokenProp.GetString());

            if (!hasToken)
            {
                return Ok(new AuthLoginCallbackResponse(false, false, null));
            }

            if (oauth.TryGetProperty("expiresAt", out var expProp))
            {
                var expiresAt = DateTimeOffset.FromUnixTimeMilliseconds(expProp.GetInt64());
                var expired = expiresAt < DateTimeOffset.UtcNow;
                return Ok(new AuthLoginCallbackResponse(true, !expired, expiresAt.ToString("o")));
            }

            return Ok(new AuthLoginCallbackResponse(true, true, null));
        }
        catch (Exception ex)
        {
            log.LogWarning("Failed to check callback status: {Error}", ex.Message);
            return Ok(new AuthLoginCallbackResponse(false, false, null));
        }
    }
}
