using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ParentTaskId",
                table: "tasks",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "tasks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TaskType",
                table: "tasks",
                type: "text",
                nullable: false,
                defaultValue: "standalone");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_ParentTaskId",
                table: "tasks",
                column: "ParentTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_TaskType",
                table: "tasks",
                column: "TaskType");

            migrationBuilder.AddForeignKey(
                name: "FK_tasks_tasks_ParentTaskId",
                table: "tasks",
                column: "ParentTaskId",
                principalTable: "tasks",
                principalColumn: "TaskId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tasks_tasks_ParentTaskId",
                table: "tasks");

            migrationBuilder.DropIndex(
                name: "IX_tasks_ParentTaskId",
                table: "tasks");

            migrationBuilder.DropIndex(
                name: "IX_tasks_TaskType",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "ParentTaskId",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "Summary",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "TaskType",
                table: "tasks");
        }
    }
}
