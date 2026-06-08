using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shisha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCabinConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "configuration",
                table: "measurements");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "configuration",
                table: "measurements",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "TwoGlass");
        }
    }
}
