using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shisha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGlassShapeAndSetId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "curvature_radius_mm",
                table: "glasses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "set_id",
                table: "glasses",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "shape",
                table: "glasses",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Flat");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "curvature_radius_mm",
                table: "glasses");

            migrationBuilder.DropColumn(
                name: "set_id",
                table: "glasses");

            migrationBuilder.DropColumn(
                name: "shape",
                table: "glasses");
        }
    }
}
