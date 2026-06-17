using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shisha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveFactoryOrderPaymentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "factory_paid_at",
                table: "factory_orders");

            migrationBuilder.DropColumn(
                name: "factory_paid_tjs",
                table: "factory_orders");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "factory_paid_at",
                table: "factory_orders",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "factory_paid_tjs",
                table: "factory_orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }
    }
}
