using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NexusApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "marketplaces",
                columns: table => new
                {
                    MarketplaceId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    SourceType = table.Column<string>(type: "text", nullable: false),
                    SourceUrl = table.Column<string>(type: "text", nullable: false),
                    AutoUpdate = table.Column<bool>(type: "boolean", nullable: false),
                    AddedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastUpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_marketplaces", x => x.MarketplaceId);
                });

            migrationBuilder.CreateTable(
                name: "tasks",
                columns: table => new
                {
                    TaskId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    ExternalId = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Body = table.Column<string>(type: "text", nullable: false),
                    Project = table.Column<string>(type: "text", nullable: false),
                    Priority = table.Column<string>(type: "text", nullable: false, defaultValue: "medium"),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "pending"),
                    VaultNotePath = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tasks", x => x.TaskId);
                });

            migrationBuilder.CreateTable(
                name: "plugins",
                columns: table => new
                {
                    PluginId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    MarketplaceId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    HomepageUrl = table.Column<string>(type: "text", nullable: true),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    Scope = table.Column<string>(type: "text", nullable: false),
                    InstalledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plugins", x => x.PluginId);
                    table.ForeignKey(
                        name: "FK_plugins_marketplaces_MarketplaceId",
                        column: x => x.MarketplaceId,
                        principalTable: "marketplaces",
                        principalColumn: "MarketplaceId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "agent_runs",
                columns: table => new
                {
                    RunId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    TaskId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ContainerId = table.Column<string>(type: "text", nullable: true),
                    ExitCode = table.Column<int>(type: "integer", nullable: true),
                    Output = table.Column<string>(type: "text", nullable: true),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_agent_runs", x => x.RunId);
                    table.ForeignKey(
                        name: "FK_agent_runs_tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "tasks",
                        principalColumn: "TaskId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "log_entries",
                columns: table => new
                {
                    LogId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    Ts = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Level = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Source = table.Column<string>(type: "text", nullable: false),
                    RunId = table.Column<long>(type: "bigint", nullable: true),
                    Metadata = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_log_entries", x => x.LogId);
                    table.ForeignKey(
                        name: "FK_log_entries_agent_runs_RunId",
                        column: x => x.RunId,
                        principalTable: "agent_runs",
                        principalColumn: "RunId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_agent_runs_StartedAt",
                table: "agent_runs",
                column: "StartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_agent_runs_Status",
                table: "agent_runs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_agent_runs_TaskId",
                table: "agent_runs",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_Level",
                table: "log_entries",
                column: "Level");

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_RunId",
                table: "log_entries",
                column: "RunId");

            migrationBuilder.CreateIndex(
                name: "IX_log_entries_Ts",
                table: "log_entries",
                column: "Ts")
                .Annotation("Npgsql:IndexMethod", "brin");

            migrationBuilder.CreateIndex(
                name: "IX_marketplaces_Name",
                table: "marketplaces",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_plugins_Enabled",
                table: "plugins",
                column: "Enabled");

            migrationBuilder.CreateIndex(
                name: "IX_plugins_MarketplaceId",
                table: "plugins",
                column: "MarketplaceId");

            migrationBuilder.CreateIndex(
                name: "IX_plugins_Name_MarketplaceId",
                table: "plugins",
                columns: new[] { "Name", "MarketplaceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tasks_CreatedAt",
                table: "tasks",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_ExternalId",
                table: "tasks",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tasks_Priority_Status",
                table: "tasks",
                columns: new[] { "Priority", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_tasks_Project",
                table: "tasks",
                column: "Project");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_Status",
                table: "tasks",
                column: "Status");

            migrationBuilder.Sql("CREATE INDEX log_entries_metadata_gin ON log_entries USING gin (\"Metadata\");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS log_entries_metadata_gin;");

            migrationBuilder.DropTable(
                name: "log_entries");

            migrationBuilder.DropTable(
                name: "plugins");

            migrationBuilder.DropTable(
                name: "agent_runs");

            migrationBuilder.DropTable(
                name: "marketplaces");

            migrationBuilder.DropTable(
                name: "tasks");
        }
    }
}
