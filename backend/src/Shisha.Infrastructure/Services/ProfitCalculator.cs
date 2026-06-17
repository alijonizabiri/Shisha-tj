using Microsoft.EntityFrameworkCore;
using Shisha.Application.Finances;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class ProfitCalculator(AppDbContext db) : IProfitCalculator
{
    private const decimal MasterFeePerSqM = 120m;

    // ── Per-lead aggregate ─────────────────────────────────────────────────────

    public async Task<LeadFinancesDto> CalculateAsync(Guid leadId, CancellationToken ct = default)
    {
        var lead = await db.Leads
            .Include(l => l.Measurements)
                .ThenInclude(m => m.Glasses)
            .Include(l => l.Measurements)
                .ThenInclude(m => m.Hardware)
            .Include(l => l.Measurements)
                .ThenInclude(m => m.Expenses)
            .Include(l => l.Measurements)
                .ThenInclude(m => m.Payments)
            .Include(l => l.Measurements)
                .ThenInclude(m => m.MeasurerPayout)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == leadId, ct)
            ?? throw new NotFoundException($"Lead {leadId} not found.");

        var glassIds = lead.Measurements
            .SelectMany(m => m.Glasses)
            .Select(g => g.Id)
            .ToHashSet();

        var orderItems = glassIds.Count > 0
            ? await db.FactoryOrderItems
                .Where(i => glassIds.Contains(i.GlassId))
                .AsNoTracking()
                .ToListAsync(ct)
            : [];

        var glassCost = orderItems
            .Where(i => !i.IsRework)
            .Sum(i => i.GlassCostTjs ?? 0m);

        // Factory-error reworks are absorbed by the factory and don't reduce our profit
        var reworkCost = orderItems
            .Where(i => i.IsRework && i.ReworkReason == ReworkReason.MeasurerError)
            .Sum(i => i.GlassCostTjs ?? 0m);

        var hardwareCost = lead.Measurements
            .Where(m => m.Hardware is not null)
            .Sum(m => m.Hardware!.CostTjs);

        var areaSqM = lead.Measurements
            .SelectMany(m => m.Glasses)
            .Sum(g => (decimal)g.WidthMm * g.HeightMm / 1_000_000m);

        // Use actual payout if exists, else fallback to area-based estimate
        var masterFee = lead.Measurements
            .Sum(m => m.MeasurerPayout is not null
                ? m.MeasurerPayout.ActualAmountTjs
                : Math.Round(
                    m.Glasses.Sum(g => (decimal)g.WidthMm * g.HeightMm / 1_000_000m) * MasterFeePerSqM,
                    2));

        var deliveryCost = lead.Measurements
            .SelectMany(m => m.Expenses)
            .Where(e => e.Kind == ExpenseKind.Delivery)
            .Sum(e => e.AmountTjs);

        var otherCosts = lead.Measurements
            .SelectMany(m => m.Expenses)
            .Where(e => e.Kind == ExpenseKind.Other)
            .Sum(e => e.AmountTjs);

        var totalCost = glassCost + reworkCost + hardwareCost + masterFee + deliveryCost + otherCosts;

        var totalDealPrice = lead.Measurements.Sum(m => m.DealPriceTjs ?? 0m);
        var hasDealPrice = lead.Measurements.Any(m => m.DealPriceTjs.HasValue && m.DealPriceTjs > 0);

        var profit = hasDealPrice
            ? totalDealPrice - totalCost
            : (decimal?)null;

        var totalPaid = lead.Measurements
            .SelectMany(m => m.Payments)
            .Sum(p => p.AmountTjs);

        var totalDeposit = lead.Measurements
            .SelectMany(m => m.Payments)
            .Where(p => p.Kind == PaymentKind.Deposit)
            .Sum(p => p.AmountTjs);

        var balanceDue = hasDealPrice
            ? totalDealPrice - totalPaid
            : (decimal?)null;

        return new LeadFinancesDto(
            leadId,
            hasDealPrice ? totalDealPrice : null,
            glassCost,
            reworkCost,
            hardwareCost,
            masterFee,
            deliveryCost,
            otherCosts,
            totalCost,
            profit,
            totalPaid,
            totalDeposit,
            balanceDue);
    }

    // ── Per-measurement ────────────────────────────────────────────────────────

    public async Task<MeasurementFinancesDto> CalculateForMeasurementAsync(
        Guid measurementId,
        CancellationToken ct = default)
    {
        var measurement = await db.Measurements
            .Include(m => m.Glasses)
            .Include(m => m.Hardware)
            .Include(m => m.Expenses)
            .Include(m => m.Payments)
            .Include(m => m.MeasurerPayout)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == measurementId, ct)
            ?? throw new NotFoundException($"Measurement {measurementId} not found.");

        var glassIds = measurement.Glasses.Select(g => g.Id).ToHashSet();

        var orderItems = glassIds.Count > 0
            ? await db.FactoryOrderItems
                .Where(i => glassIds.Contains(i.GlassId))
                .AsNoTracking()
                .ToListAsync(ct)
            : [];

        var glassCost = orderItems
            .Where(i => !i.IsRework)
            .Sum(i => i.GlassCostTjs ?? 0m);

        var reworkCost = orderItems
            .Where(i => i.IsRework && i.ReworkReason == ReworkReason.MeasurerError)
            .Sum(i => i.GlassCostTjs ?? 0m);

        var hardwareCost = measurement.Hardware?.CostTjs ?? 0m;

        var areaSqM = measurement.Glasses
            .Sum(g => (decimal)g.WidthMm * g.HeightMm / 1_000_000m);

        // Use actual payout if exists, else fallback to area-based estimate
        var masterFee = measurement.MeasurerPayout is not null
            ? measurement.MeasurerPayout.ActualAmountTjs
            : Math.Round(areaSqM * MasterFeePerSqM, 2);

        var deliveryCost = measurement.DeliveryCostTjs
            ?? measurement.Expenses
                .Where(e => e.Kind == ExpenseKind.Delivery)
                .Sum(e => e.AmountTjs);

        var otherCosts = measurement.Expenses
            .Where(e => e.Kind == ExpenseKind.Other)
            .Sum(e => e.AmountTjs);

        var totalCost = glassCost + reworkCost + hardwareCost + masterFee + deliveryCost + otherCosts;

        var profit = measurement.DealPriceTjs.HasValue
            ? measurement.DealPriceTjs.Value - totalCost
            : (decimal?)null;

        var totalPaid = measurement.Payments.Sum(p => p.AmountTjs);
        var totalDeposit = measurement.Payments
            .Where(p => p.Kind == PaymentKind.Deposit)
            .Sum(p => p.AmountTjs);

        var balanceDue = measurement.DealPriceTjs.HasValue
            ? measurement.DealPriceTjs.Value - totalPaid
            : (decimal?)null;

        return new MeasurementFinancesDto(
            measurementId,
            measurement.DealPriceTjs,
            glassCost,
            reworkCost,
            hardwareCost,
            masterFee,
            deliveryCost,
            otherCosts,
            totalCost,
            profit,
            totalPaid,
            totalDeposit,
            balanceDue,
            measurement.MeasurerPayout?.ActualAmountTjs,
            measurement.MeasurerPayout?.IsPaid);
    }
}
