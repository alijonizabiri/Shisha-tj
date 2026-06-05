using Microsoft.EntityFrameworkCore;
using Shisha.Application.Finances;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class ProfitCalculator(AppDbContext db) : IProfitCalculator
{
    private const decimal MasterFeePerSqM = 120m;

    public async Task<LeadFinancesDto> CalculateAsync(Guid leadId, CancellationToken ct = default)
    {
        var lead = await db.Leads
            .Include(l => l.Measurements)
                .ThenInclude(m => m.Glasses)
            .Include(l => l.Measurements)
                .ThenInclude(m => m.Hardware)
            .Include(l => l.Expenses)
            .Include(l => l.Payments)
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

        var masterFee = Math.Round(areaSqM * MasterFeePerSqM, 2);

        var deliveryCost = lead.Expenses
            .Where(e => e.Kind == ExpenseKind.Delivery)
            .Sum(e => e.AmountTjs);

        var otherCosts = lead.Expenses
            .Where(e => e.Kind == ExpenseKind.Other)
            .Sum(e => e.AmountTjs);

        var totalCost = glassCost + reworkCost + hardwareCost + masterFee + deliveryCost + otherCosts;

        var profit = lead.DealPriceTjs.HasValue
            ? lead.DealPriceTjs.Value - totalCost
            : (decimal?)null;

        var totalPaid = lead.Payments.Sum(p => p.AmountTjs);

        var balanceDue = lead.DealPriceTjs.HasValue
            ? lead.DealPriceTjs.Value - totalPaid
            : (decimal?)null;

        return new LeadFinancesDto(
            leadId,
            lead.DealPriceTjs,
            glassCost,
            reworkCost,
            hardwareCost,
            masterFee,
            deliveryCost,
            otherCosts,
            totalCost,
            profit,
            totalPaid,
            balanceDue);
    }
}
