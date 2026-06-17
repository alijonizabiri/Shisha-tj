using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shisha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFactoryPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "factory_payments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    factory_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount_tjs = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    paid_at = table.Column<DateOnly>(type: "date", nullable: false),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
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
                    table.PrimaryKey("pk_factory_payments", x => x.id);
                    table.ForeignKey(
                        name: "fk_factory_payments_factory_orders_factory_order_id",
                        column: x => x.factory_order_id,
                        principalTable: "factory_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_factory_payments_factory_order_id",
                table: "factory_payments",
                column: "factory_order_id");

            migrationBuilder.CreateIndex(
                name: "ix_factory_payments_tenant_id",
                table: "factory_payments",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "factory_payments");
        }
    }
}
