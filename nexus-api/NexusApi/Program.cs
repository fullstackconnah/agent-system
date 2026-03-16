// nexus-api/NexusApi/Program.cs
using Microsoft.EntityFrameworkCore;
using NexusApi.Data;
using NexusApi.Options;
using NexusApi.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
builder.Host.UseSerilog((ctx, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .Enrich.FromLogContext()
       .WriteTo.Console());

// Options — appsettings.json section first, then env vars override (env vars win)
builder.Services.Configure<AgentOptions>(builder.Configuration.GetSection(AgentOptions.Section));
builder.Services.Configure<AgentOptions>(opts =>
{
    opts.VaultPath = Environment.GetEnvironmentVariable("VAULT_PATH") ?? opts.VaultPath;
    opts.ProjectsPath = Environment.GetEnvironmentVariable("PROJECTS_PATH") ?? opts.ProjectsPath;
    opts.HostVaultPath = Environment.GetEnvironmentVariable("HOST_VAULT_PATH") ?? opts.HostVaultPath;
    opts.HostProjectsPath = Environment.GetEnvironmentVariable("HOST_PROJECTS_PATH") ?? opts.HostProjectsPath;
    opts.ClaudeCreds = Environment.GetEnvironmentVariable("CLAUDE_CREDS") ?? opts.ClaudeCreds;
    opts.HostClaudeCreds = Environment.GetEnvironmentVariable("HOST_CLAUDE_CREDS") ?? opts.HostClaudeCreds;
    opts.AgentImage = Environment.GetEnvironmentVariable("AGENT_IMAGE") ?? opts.AgentImage;
    opts.AnthropicApiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
    opts.GithubToken = Environment.GetEnvironmentVariable("GITHUB_TOKEN");
});

// Database
var connStr = builder.Configuration.GetConnectionString("Default")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__Default")
    ?? "Host=localhost;Database=nexus_dev;Username=nexus;Password=nexus"; // fallback for tests

builder.Services.AddDbContext<NexusDbContext>(o => o.UseNpgsql(connStr));

// Services
builder.Services.AddSingleton<IDockerService, DockerService>();
builder.Services.AddScoped<IVaultService, VaultService>();
builder.Services.AddHttpClient();  // registers IHttpClientFactory for general use (e.g. RepositoriesController)
builder.Services.AddHttpClient<IMarketplaceService, MarketplaceService>();
builder.Services.AddScoped<IPluginService, PluginService>();
builder.Services.AddScoped<TaskRunnerService>();
builder.Services.AddHostedService<TaskSchedulerService>();

// API
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS for dev
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Auto-migrate on startup (guarded — in-memory provider used in integration tests doesn't support migrations)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
    if (db.Database.IsRelational())
        await db.Database.MigrateAsync();
    else
        await db.Database.EnsureCreatedAsync();
    Log.Information("Database ready");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseStaticFiles();  // serve built React app from wwwroot/
app.MapControllers();
app.MapFallbackToFile("index.html");  // SPA fallback

app.Run();

// Required for WebApplicationFactory<Program> in integration tests
public partial class Program { }
