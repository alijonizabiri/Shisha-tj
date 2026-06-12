using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shisha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveStatusToMeasurement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: add new columns to measurements
            migrationBuilder.AddColumn<int>(
                name: "status",
                table: "measurements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "assigned_measurer_id",
                table: "measurements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "refusal_reason_id",
                table: "measurements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "refusal_note",
                table: "measurements",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            // Step 2: migrate data — copy lead status/measurer/refusal to each measurement
            migrationBuilder.Sql("""
                UPDATE measurements m
                SET status               = l.status,
                    assigned_measurer_id = l.assigned_measurer_id,
                    refusal_reason_id    = l.refusal_reason_id,
                    refusal_note         = l.refusal_note
                FROM leads l
                WHERE m.lead_id = l.id;
                """);

            // Step 3: drop old columns and indexes from leads
            migrationBuilder.DropForeignKey(
                name: "fk_leads_refusal_reasons_refusal_reason_id",
                table: "leads");

            migrationBuilder.DropForeignKey(
                name: "fk_leads_users_assigned_measurer_id",
                table: "leads");

            migrationBuilder.DropIndex(
                name: "ix_leads_assigned_measurer_id",
                table: "leads");

            migrationBuilder.DropIndex(
                name: "ix_leads_refusal_reason_id",
                table: "leads");

            migrationBuilder.DropIndex(
                name: "ix_leads_status",
                table: "leads");

            migrationBuilder.DropColumn(
                name: "assigned_measurer_id",
                table: "leads");

            migrationBuilder.DropColumn(
                name: "refusal_note",
                table: "leads");

            migrationBuilder.DropColumn(
                name: "refusal_reason_id",
                table: "leads");

            migrationBuilder.DropColumn(
                name: "status",
                table: "leads");

            // Step 4: add indexes and FKs to measurements
            migrationBuilder.CreateIndex(
                name: "ix_measurements_assigned_measurer_id",
                table: "measurements",
                column: "assigned_measurer_id");

            migrationBuilder.CreateIndex(
                name: "ix_measurements_refusal_reason_id",
                table: "measurements",
                column: "refusal_reason_id");

            migrationBuilder.CreateIndex(
                name: "ix_measurements_status",
                table: "measurements",
                column: "status");

            migrationBuilder.AddForeignKey(
                name: "fk_measurements_refusal_reasons_refusal_reason_id",
                table: "measurements",
                column: "refusal_reason_id",
                principalTable: "refusal_reasons",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_measurements_users_assigned_measurer_id",
                table: "measurements",
                column: "assigned_measurer_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_measurements_refusal_reasons_refusal_reason_id",
                table: "measurements");

            migrationBuilder.DropForeignKey(
                name: "fk_measurements_users_assigned_measurer_id",
                table: "measurements");

            migrationBuilder.DropIndex(
                name: "ix_measurements_assigned_measurer_id",
                table: "measurements");

            migrationBuilder.DropIndex(
                name: "ix_measurements_refusal_reason_id",
                table: "measurements");

            migrationBuilder.DropIndex(
                name: "ix_measurements_status",
                table: "measurements");

            migrationBuilder.DropColumn(
                name: "assigned_measurer_id",
                table: "measurements");

            migrationBuilder.DropColumn(
                name: "refusal_note",
                table: "measurements");

            migrationBuilder.DropColumn(
                name: "refusal_reason_id",
                table: "measurements");

            migrationBuilder.DropColumn(
                name: "status",
                table: "measurements");

            migrationBuilder.AddColumn<Guid>(
                name: "assigned_measurer_id",
                table: "leads",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "refusal_note",
                table: "leads",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "refusal_reason_id",
                table: "leads",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "status",
                table: "leads",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "ix_leads_assigned_measurer_id",
                table: "leads",
                column: "assigned_measurer_id");

            migrationBuilder.CreateIndex(
                name: "ix_leads_refusal_reason_id",
                table: "leads",
                column: "refusal_reason_id");

            migrationBuilder.CreateIndex(
                name: "ix_leads_status",
                table: "leads",
                column: "status");

            migrationBuilder.AddForeignKey(
                name: "fk_leads_refusal_reasons_refusal_reason_id",
                table: "leads",
                column: "refusal_reason_id",
                principalTable: "refusal_reasons",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_leads_users_assigned_measurer_id",
                table: "leads",
                column: "assigned_measurer_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
