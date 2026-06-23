using Microsoft.EntityFrameworkCore;
using Shisha.Application.Analytics;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class AnalyticsFinancesService(AppDbContext db) : IAnalyticsFinancesService
{
    private sealed record ClosedEntry(Measurement Measurement, decimal PaidTotal, DateOnly LastPaidAt);

    // ── Public ────────────────────────────────────────────────────────────────

    public async Task<PeriodFinancesDto> GetPeriodFinancesAsync(
        DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var (closed, orderItems) = await LoadClosedAsync(from, to, ct);
        return BuildSummary(from, to, closed, orderItems);
    }

    public async Task<ExportDataDto> GetExportDataAsync(
        DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var (closed, orderItems) = await LoadClosedAsync(from, to, ct);
        var summary = BuildSummary(from, to, closed, orderItems);

        var measurements = closed
            .OrderBy(e => e.LastPaidAt)
            .Select(e => BuildMeasurementRow(e, orderItems))
            .ToList();

        // Factory payments whose date falls within [from, to]
        var factoryPayments = await db.FactoryPayments
            .Where(p => p.PaidAt >= from && p.PaidAt <= to)
            .Include(p => p.FactoryOrder)
                .ThenInclude(o => o.FactoryPayments)
            .AsNoTracking()
            .OrderBy(p => p.PaidAt)
            .ToListAsync(ct);

        var exportFp = factoryPayments
            .Select(p =>
            {
                var orderTotal = p.FactoryOrder.FactoryPayments.Sum(x => x.AmountTjs);
                return new ExportFactoryPaymentDto(
                    p.FactoryOrderId.ToString("N")[..8].ToUpperInvariant(),
                    p.PaidAt,
                    p.AmountTjs,
                    p.Note,
                    LocalizeFactoryStatus(p.FactoryOrder.Status.ToString()),
                    orderTotal,
                    (p.FactoryOrder.FactoryTotalTjs ?? 0m) - orderTotal);
            })
            .ToList();

        // Measurer payouts: paid in period OR unpaid but created in period
        var fromDt = from.ToDateTime(TimeOnly.MinValue);
        var toDt = to.ToDateTime(TimeOnly.MaxValue);

        var rawPayouts = await db.MeasurerPayouts
            .Where(p =>
                (p.IsPaid && p.PaidAt >= from && p.PaidAt <= to) ||
                (!p.IsPaid && p.CreatedAt >= fromDt && p.CreatedAt <= toDt))
            .Include(p => p.Measurer)
            .Include(p => p.Measurement)
                .ThenInclude(m => m.Lead)
            .AsNoTracking()
            .OrderBy(p => p.CreatedAt)
            .ToListAsync(ct);

        var exportPayouts = rawPayouts
            .Select(p => new ExportMeasurerPayoutDto(
                p.Measurer.FullName,
                p.Measurement.Lead?.Name ?? "—",
                DateOnly.FromDateTime(p.CreatedAt),
                p.CalculatedAmountTjs,
                p.ActualAmountTjs,
                p.IsPaid,
                p.PaidAt))
            .ToList();

        return new ExportDataDto(from, to, DateTimeOffset.UtcNow, "SHISHA_TJ",
            summary, measurements, exportFp, exportPayouts);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<(List<ClosedEntry> Closed, List<FactoryOrderItem> OrderItems)>
        LoadClosedAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        // Pre-filter at SQL level: only measurements with at least one non-refund payment
        // in [from, to]. The precise max-payment-date check happens in memory below.
        var allInstalled = await db.Measurements
            .Where(m => m.Status == LeadStatus.Installed
                     && m.DealPriceTjs.HasValue
                     && m.Payments.Any(p => p.Kind != PaymentKind.Refund
                                         && p.PaidAt >= from
                                         && p.PaidAt <= to))
            .Include(m => m.Payments)
            .Include(m => m.Glasses)
            .Include(m => m.Expenses)
            .Include(m => m.MeasurerPayout)
            .Include(m => m.Lead)
            .AsNoTracking()
            .ToListAsync(ct);

        var closed = allInstalled
            .Select(m =>
            {
                var nonRefund = m.Payments.Where(p => p.Kind != PaymentKind.Refund).ToList();
                var lastPaidAt = nonRefund.Count > 0
                    ? nonRefund.Max(p => p.PaidAt)
                    : (DateOnly?)null;
                return (m, PaidTotal: nonRefund.Sum(p => p.AmountTjs), LastPaidAt: lastPaidAt);
            })
            .Where(x =>
                x.LastPaidAt.HasValue &&
                x.PaidTotal >= x.m.DealPriceTjs!.Value &&
                x.LastPaidAt.Value >= from &&
                x.LastPaidAt.Value <= to)
            .Select(x => new ClosedEntry(x.m, x.PaidTotal, x.LastPaidAt!.Value))
            .ToList();

        var glassIds = closed
            .SelectMany(e => e.Measurement.Glasses.Select(g => g.Id))
            .ToHashSet();

        var orderItems = glassIds.Count > 0
            ? await db.FactoryOrderItems
                .Where(i => glassIds.Contains(i.GlassId))
                .AsNoTracking()
                .ToListAsync(ct)
            : [];

        return (closed, orderItems);
    }

    private static PeriodFinancesDto BuildSummary(
        DateOnly from, DateOnly to,
        List<ClosedEntry> closed,
        List<FactoryOrderItem> orderItems)
    {
        if (closed.Count == 0)
            return new PeriodFinancesDto(from, to, 0, 0m, 0m, 0m, 0m, 0m, 0m, 0m, []);

        var factoryCostTjs = CalcFactoryCost(orderItems);
        var measurerCostTjs = closed.Sum(e => e.Measurement.MeasurerPayout?.ActualAmountTjs ?? 0m);
        var otherExpensesTjs = closed.Sum(e => e.Measurement.Expenses.Sum(x => x.AmountTjs));
        var revenueTjs = closed.Sum(e => e.Measurement.DealPriceTjs!.Value);
        var totalCostTjs = factoryCostTjs + measurerCostTjs + otherExpensesTjs;
        var profitTjs = revenueTjs - totalCostTjs;
        var marginPct = revenueTjs > 0 ? Math.Round(profitTjs / revenueTjs * 100m, 1) : 0m;

        var monthly = closed
            .GroupBy(e => new { e.LastPaidAt.Year, e.LastPaidAt.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g =>
            {
                var monthGlassIds = g
                    .SelectMany(e => e.Measurement.Glasses.Select(gl => gl.Id))
                    .ToHashSet();
                var monthItems = orderItems.Where(i => monthGlassIds.Contains(i.GlassId)).ToList();
                var monthRevenue = g.Sum(e => e.Measurement.DealPriceTjs!.Value);
                var monthCost = CalcFactoryCost(monthItems)
                    + g.Sum(e => e.Measurement.MeasurerPayout?.ActualAmountTjs ?? 0m)
                    + g.Sum(e => e.Measurement.Expenses.Sum(x => x.AmountTjs));
                return new MonthlyBreakdownDto(
                    g.Key.Year, g.Key.Month,
                    monthRevenue, monthCost, monthRevenue - monthCost,
                    g.Count());
            })
            .ToList();

        return new PeriodFinancesDto(
            from, to, closed.Count,
            revenueTjs, factoryCostTjs, measurerCostTjs, otherExpensesTjs,
            totalCostTjs, profitTjs, marginPct, monthly);
    }

    private static ExportMeasurementDto BuildMeasurementRow(
        ClosedEntry entry, List<FactoryOrderItem> allOrderItems)
    {
        var m = entry.Measurement;
        var glassIds = m.Glasses.Select(g => g.Id).ToHashSet();
        var items = allOrderItems.Where(i => glassIds.Contains(i.GlassId)).ToList();

        var factoryCost = CalcFactoryCost(items);
        var measurerCost = m.MeasurerPayout?.ActualAmountTjs ?? 0m;
        var otherCost = m.Expenses.Sum(e => e.AmountTjs);
        var profit = m.DealPriceTjs!.Value - factoryCost - measurerCost - otherCost;
        var margin = m.DealPriceTjs.Value > 0
            ? Math.Round(profit / m.DealPriceTjs.Value * 100m, 1)
            : 0m;
        var sizes = m.MeasureMm > 0 && m.HeightMm > 0
            ? $"{m.MeasureMm} × {m.HeightMm}"
            : null;

        return new ExportMeasurementDto(
            m.Lead?.Name ?? "—",
            m.Lead?.Phone ?? "—",
            m.Product ?? "—",
            sizes,
            DateOnly.FromDateTime(m.MeasuredAt),
            entry.LastPaidAt,
            m.DealPriceTjs.Value,
            entry.PaidTotal,
            factoryCost,
            measurerCost,
            otherCost,
            profit,
            margin);
    }

    private static decimal CalcFactoryCost(IEnumerable<FactoryOrderItem> items) =>
        items.Where(i => !i.IsRework || i.ReworkReason == ReworkReason.MeasurerError)
             .Sum(i => i.GlassCostTjs ?? 0m);

    private static string LocalizeFactoryStatus(string s) => s switch
    {
        "Draft"    => "Черновик",
        "Sent"     => "Отправлен",
        "Received" => "Получен",
        "Closed"   => "Закрыт",
        _          => s,
    };
}
