using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Shisha.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveFinancesToMeasurement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Step 1: Add financial + address columns to measurements ─────────

            migrationBuilder.AddColumn<string>(
                name: "address",
                table: "measurements",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "Не указан");

            migrationBuilder.AddColumn<decimal>(
                name: "deal_price_tjs",
                table: "measurements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "delivery_cost_tjs",
                table: "measurements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "installation_date",
                table: "measurements",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "installed_at",
                table: "measurements",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "warranty_until",
                table: "measurements",
                type: "date",
                nullable: true);

            // ── Step 2: Copy data from leads to their first measurement ─────────

            migrationBuilder.Sql(@"
WITH first_measurements AS (
    SELECT DISTINCT ON (lead_id) id AS measurement_id, lead_id
    FROM measurements
    WHERE is_deleted = false AND lead_id IS NOT NULL
    ORDER BY lead_id, created_at ASC
)
UPDATE measurements
SET
    address           = COALESCE(l.address, 'Не указан'),
    deal_price_tjs    = l.deal_price_tjs,
    installation_date = l.promised_install_date,
    warranty_until    = l.warranty_until
FROM first_measurements fm
JOIN leads l ON l.id = fm.lead_id
WHERE measurements.id = fm.measurement_id;
");

            // ── Step 3: Add measurement_id to payments (nullable), populate, orphan ──

            migrationBuilder.AddColumn<Guid>(
                name: "measurement_id",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
WITH first_measurements AS (
    SELECT DISTINCT ON (lead_id) id AS measurement_id, lead_id
    FROM measurements
    WHERE is_deleted = false AND lead_id IS NOT NULL
    ORDER BY lead_id, created_at ASC
)
UPDATE payments
SET measurement_id = fm.measurement_id
FROM first_measurements fm
WHERE payments.lead_id = fm.lead_id;
");

            // Soft-delete active payments that have no matching measurement
            migrationBuilder.Sql(@"
UPDATE payments
SET
    is_deleted = true,
    deleted_at = NOW(),
    note       = COALESCE(note || ' ', '') || '[orphaned: no measurement found]'
WHERE measurement_id IS NULL
  AND is_deleted = false;
");

            // Hard-delete any remaining null rows (already-soft-deleted orphans)
            migrationBuilder.Sql(@"DELETE FROM payments WHERE measurement_id IS NULL;");

            // ── Step 4: Make measurement_id NOT NULL, add FK+index, drop lead_id ──

            migrationBuilder.AlterColumn<Guid>(
                name: "measurement_id",
                table: "payments",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_payments_measurement_id",
                table: "payments",
                column: "measurement_id");

            migrationBuilder.AddForeignKey(
                name: "fk_payments_measurements_measurement_id",
                table: "payments",
                column: "measurement_id",
                principalTable: "measurements",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.DropForeignKey(
                name: "fk_payments_leads_lead_id",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_lead_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "lead_id",
                table: "payments");

            // ── Step 5: Same for expenses (measurement_id stays nullable) ──────

            migrationBuilder.AddColumn<Guid>(
                name: "measurement_id",
                table: "expenses",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
WITH first_measurements AS (
    SELECT DISTINCT ON (lead_id) id AS measurement_id, lead_id
    FROM measurements
    WHERE is_deleted = false AND lead_id IS NOT NULL
    ORDER BY lead_id, created_at ASC
)
UPDATE expenses
SET measurement_id = fm.measurement_id
FROM first_measurements fm
WHERE expenses.lead_id = fm.lead_id
  AND expenses.is_deleted = false;
");

            // Soft-delete expenses with a lead_id that couldn't be linked
            migrationBuilder.Sql(@"
UPDATE expenses
SET
    is_deleted  = true,
    deleted_at  = NOW(),
    description = COALESCE(description || ' ', '') || '[orphaned: no measurement found]'
WHERE lead_id IS NOT NULL
  AND measurement_id IS NULL
  AND is_deleted = false;
");

            migrationBuilder.CreateIndex(
                name: "ix_expenses_measurement_id",
                table: "expenses",
                column: "measurement_id");

            migrationBuilder.AddForeignKey(
                name: "fk_expenses_measurements_measurement_id",
                table: "expenses",
                column: "measurement_id",
                principalTable: "measurements",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.DropForeignKey(
                name: "fk_expenses_leads_lead_id",
                table: "expenses");

            migrationBuilder.DropIndex(
                name: "ix_expenses_lead_id",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "lead_id",
                table: "expenses");

            // ── Step 6: Drop old columns from leads ────────────────────────────

            migrationBuilder.DropColumn(name: "address",               table: "leads");
            migrationBuilder.DropColumn(name: "deal_price_tjs",        table: "leads");
            migrationBuilder.DropColumn(name: "promised_install_date", table: "leads");
            migrationBuilder.DropColumn(name: "warranty_until",        table: "leads");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ── D1: Restore columns on leads ───────────────────────────────────

            migrationBuilder.AddColumn<string>(
                name: "address",
                table: "leads",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "deal_price_tjs",
                table: "leads",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "promised_install_date",
                table: "leads",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "warranty_until",
                table: "leads",
                type: "date",
                nullable: true);

            // ── D2: Copy data back from first measurement to lead ──────────────

            migrationBuilder.Sql(@"
WITH first_measurements AS (
    SELECT DISTINCT ON (lead_id) id AS measurement_id, lead_id,
           address, deal_price_tjs, installation_date, warranty_until
    FROM measurements
    WHERE is_deleted = false AND lead_id IS NOT NULL
    ORDER BY lead_id, created_at ASC
)
UPDATE leads
SET
    address               = fm.address,
    deal_price_tjs        = fm.deal_price_tjs,
    promised_install_date = fm.installation_date,
    warranty_until        = fm.warranty_until
FROM first_measurements fm
WHERE leads.id = fm.lead_id;
");

            // ── D3: Restore lead_id on expenses ────────────────────────────────

            migrationBuilder.AddColumn<Guid>(
                name: "lead_id",
                table: "expenses",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE expenses e
SET lead_id = m.lead_id
FROM measurements m
WHERE e.measurement_id = m.id
  AND e.is_deleted = false;
");

            migrationBuilder.DropForeignKey(
                name: "fk_expenses_measurements_measurement_id",
                table: "expenses");

            migrationBuilder.DropIndex(
                name: "ix_expenses_measurement_id",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "measurement_id",
                table: "expenses");

            migrationBuilder.AddForeignKey(
                name: "fk_expenses_leads_lead_id",
                table: "expenses",
                column: "lead_id",
                principalTable: "leads",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.CreateIndex(
                name: "ix_expenses_lead_id",
                table: "expenses",
                column: "lead_id");

            // ── D4: Restore lead_id on payments ────────────────────────────────

            migrationBuilder.AddColumn<Guid>(
                name: "lead_id",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE payments p
SET lead_id = m.lead_id
FROM measurements m
WHERE p.measurement_id = m.id
  AND p.is_deleted = false;
");

            // Remove orphaned soft-deleted payments so NOT NULL won't fail
            migrationBuilder.Sql(@"
DELETE FROM payments WHERE lead_id IS NULL AND is_deleted = true;
");

            migrationBuilder.AlterColumn<Guid>(
                name: "lead_id",
                table: "payments",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropForeignKey(
                name: "fk_payments_measurements_measurement_id",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_measurement_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "measurement_id",
                table: "payments");

            migrationBuilder.AddForeignKey(
                name: "fk_payments_leads_lead_id",
                table: "payments",
                column: "lead_id",
                principalTable: "leads",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.CreateIndex(
                name: "ix_payments_lead_id",
                table: "payments",
                column: "lead_id");

            // ── D5: Drop financial columns from measurements ────────────────────

            migrationBuilder.DropColumn(name: "address",           table: "measurements");
            migrationBuilder.DropColumn(name: "deal_price_tjs",    table: "measurements");
            migrationBuilder.DropColumn(name: "delivery_cost_tjs", table: "measurements");
            migrationBuilder.DropColumn(name: "installation_date", table: "measurements");
            migrationBuilder.DropColumn(name: "installed_at",      table: "measurements");
            migrationBuilder.DropColumn(name: "warranty_until",    table: "measurements");
        }
    }
}
