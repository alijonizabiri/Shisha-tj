using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shisha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMeasurements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "measurements",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    measurer_id = table.Column<Guid>(type: "uuid", nullable: true),
                    measure_mm = table.Column<int>(type: "integer", nullable: false),
                    height_mm = table.Column<int>(type: "integer", nullable: false),
                    configuration = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    glass_color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    hardware_color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    handle_side = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    measured_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_measurements", x => x.id);
                    table.ForeignKey(
                        name: "fk_measurements_users_measurer_id",
                        column: x => x.measurer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "glasses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    measurement_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    is_door = table.Column<bool>(type: "boolean", nullable: false),
                    width_mm = table.Column<int>(type: "integer", nullable: false),
                    height_mm = table.Column<int>(type: "integer", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_glasses", x => x.id);
                    table.ForeignKey(
                        name: "fk_glasses_measurements_measurement_id",
                        column: x => x.measurement_id,
                        principalTable: "measurements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "holes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    glass_id = table.Column<Guid>(type: "uuid", nullable: false),
                    x_mm = table.Column<int>(type: "integer", nullable: false),
                    y_mm = table.Column<int>(type: "integer", nullable: false),
                    radius_mm = table.Column<int>(type: "integer", nullable: false),
                    hole_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_holes", x => x.id);
                    table.ForeignKey(
                        name: "fk_holes_glasses_glass_id",
                        column: x => x.glass_id,
                        principalTable: "glasses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_glasses_measurement_id",
                table: "glasses",
                column: "measurement_id");

            migrationBuilder.CreateIndex(
                name: "ix_glasses_tenant_id",
                table: "glasses",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_holes_glass_id",
                table: "holes",
                column: "glass_id");

            migrationBuilder.CreateIndex(
                name: "ix_holes_tenant_id",
                table: "holes",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_measurements_measurer_id",
                table: "measurements",
                column: "measurer_id");

            migrationBuilder.CreateIndex(
                name: "ix_measurements_tenant_id",
                table: "measurements",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "holes");

            migrationBuilder.DropTable(
                name: "glasses");

            migrationBuilder.DropTable(
                name: "measurements");
        }
    }
}
