using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shisha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadToMeasurement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "lead_id",
                table: "measurements",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_measurements_lead_id",
                table: "measurements",
                column: "lead_id");

            migrationBuilder.AddForeignKey(
                name: "fk_measurements_leads_lead_id",
                table: "measurements",
                column: "lead_id",
                principalTable: "leads",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_measurements_leads_lead_id",
                table: "measurements");

            migrationBuilder.DropIndex(
                name: "ix_measurements_lead_id",
                table: "measurements");

            migrationBuilder.DropColumn(
                name: "lead_id",
                table: "measurements");
        }
    }
}
