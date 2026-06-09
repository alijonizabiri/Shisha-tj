using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Shisha.Application.Abstractions;
using Shisha.Application.Analytics;
using Shisha.Domain.Enums;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class AnalyticsService(
    AppDbContext db,
    IMemoryCache cache,
    ICurrentUser currentUser) : IAnalyticsService
{
    private static readonly LeadStatus[] ClosedStatuses =
        [LeadStatus.Installed, LeadStatus.Closed];

    private static readonly LeadStatus[] ActiveExcluded =
        [LeadStatus.Refused, LeadStatus.Closed];

    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

    private string Key(string method, DateOnly? from, DateOnly? to) =>
        $"analytics:{currentUser.TenantId}:{method}:{from}:{to}";

    private Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> fetch) =>
        cache.GetOrCreateAsync(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            return fetch();
        })!;

    // ── Dashboard ─────────────────────────────────────────────────────────────

    public Task<DashboardDto> GetDashboardAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        GetOrSetAsync(Key("dashboard", from, to), () => ComputeDashboardAsync(from, to, ct));

    private async Task<DashboardDto> ComputeDashboardAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var q = db.Leads
            .Where(l => (!from.HasValue || l.CallDate >= from)
                     && (!to.HasValue   || l.CallDate <= to));

        var total  = await q.CountAsync(ct);
        var active = await q.CountAsync(l => !ActiveExcluded.Contains(l.Status), ct);

        var closedQ = q.Where(l => ClosedStatuses.Contains(l.Status));
        var closedCount = await closedQ.CountAsync(ct);

        var revenue = closedCount > 0
            ? await closedQ
                .SelectMany(l => l.Measurements)
                .SumAsync(m => m.DealPriceTjs ?? 0m, ct)
            : 0m;

        decimal? conversionRate = total > 0
            ? Math.Round((decimal)closedCount / total * 100, 1)
            : null;

        decimal? avgDeal = closedCount > 0
            ? await closedQ
                .SelectMany(l => l.Measurements)
                .Where(m => m.DealPriceTjs != null && m.DealPriceTjs > 0)
                .Select(m => (decimal?)m.DealPriceTjs)
                .AverageAsync(ct)
            : null;

        if (avgDeal.HasValue)
            avgDeal = Math.Round(avgDeal.Value, 2);

        return new DashboardDto(total, active, revenue, conversionRate, avgDeal);
    }

    // ── Funnel ────────────────────────────────────────────────────────────────

    public Task<FunnelDto> GetFunnelAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        GetOrSetAsync(Key("funnel", from, to), () => ComputeFunnelAsync(from, to, ct));

    private async Task<FunnelDto> ComputeFunnelAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var counts = await db.Leads
            .Where(l => (!from.HasValue || l.CallDate >= from)
                     && (!to.HasValue   || l.CallDate <= to))
            .GroupBy(l => l.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var rows = Enum.GetValues<LeadStatus>()
            .Select(s => new FunnelRow(
                s.ToString(),
                counts.FirstOrDefault(c => c.Status == s)?.Count ?? 0))
            .ToList();

        return new FunnelDto(rows);
    }

    // ── Refusals ──────────────────────────────────────────────────────────────

    public Task<RefusalsDto> GetRefusalsAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        GetOrSetAsync(Key("refusals", from, to), () => ComputeRefusalsAsync(from, to, ct));

    private async Task<RefusalsDto> ComputeRefusalsAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var groups = await db.Leads
            .Where(l => l.Status == LeadStatus.Refused
                     && (!from.HasValue || l.CallDate >= from)
                     && (!to.HasValue   || l.CallDate <= to))
            .GroupBy(l => l.RefusalReasonId)
            .Select(g => new { ReasonId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var total = groups.Sum(g => g.Count);
        if (total == 0)
            return new RefusalsDto([], 0);

        var reasonIds = groups
            .Where(g => g.ReasonId.HasValue)
            .Select(g => g.ReasonId!.Value)
            .ToList();

        var labels = await db.RefusalReasons
            .Where(r => reasonIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r.Label, ct);

        var rows = groups
            .OrderByDescending(g => g.Count)
            .Select(g => new RefusalRow(
                g.ReasonId.HasValue
                    ? labels.GetValueOrDefault(g.ReasonId.Value, "Неизвестно")
                    : "Без причины",
                g.Count,
                Math.Round((decimal)g.Count / total * 100, 1)))
            .ToList();

        return new RefusalsDto(rows, total);
    }

    // ── By product ────────────────────────────────────────────────────────────

    public Task<ByProductDto> GetByProductAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        GetOrSetAsync(Key("by-product", from, to), () => ComputeByProductAsync(from, to, ct));

    private async Task<ByProductDto> ComputeByProductAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var rows = await db.Leads
            .Where(l => (!from.HasValue || l.CallDate >= from)
                     && (!to.HasValue   || l.CallDate <= to))
            .Select(l => new
            {
                l.Product,
                l.Status,
                Revenue = ClosedStatuses.Contains(l.Status)
                    ? (decimal?)l.Measurements.Sum(m => m.DealPriceTjs ?? 0m)
                    : null,
            })
            .GroupBy(l => l.Product)
            .Select(g => new ProductRow(
                g.Key,
                g.Count(),
                g.Sum(l => l.Revenue ?? 0m)))
            .OrderByDescending(r => r.LeadCount)
            .ToListAsync(ct);

        return new ByProductDto(rows);
    }

    // ── By color ──────────────────────────────────────────────────────────────

    public Task<ByColorDto> GetByColorAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        GetOrSetAsync(Key("by-color", from, to), () => ComputeByColorAsync(from, to, ct));

    private async Task<ByColorDto> ComputeByColorAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        // Convert DateOnly to DateTime boundaries for the DateTime field
        var fromDt = from?.ToDateTime(TimeOnly.MinValue);
        var toDt   = to?.ToDateTime(TimeOnly.MaxValue);

        var mq = db.Measurements
            .Where(m => (!fromDt.HasValue || m.MeasuredAt >= fromDt)
                     && (!toDt.HasValue   || m.MeasuredAt <= toDt));

        var glassColors = await mq
            .GroupBy(m => m.GlassColor)
            .Select(g => new ColorRow(g.Key.ToString(), g.Count()))
            .OrderByDescending(r => r.Count)
            .ToListAsync(ct);

        var hwColors = await mq
            .GroupBy(m => m.HardwareColor)
            .Select(g => new ColorRow(g.Key.ToString(), g.Count()))
            .OrderByDescending(r => r.Count)
            .ToListAsync(ct);

        return new ByColorDto(glassColors, hwColors);
    }

    // ── By measurer ───────────────────────────────────────────────────────────

    public Task<ByMeasurerDto> GetByMeasurerAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        GetOrSetAsync(Key("by-measurer", from, to), () => ComputeByMeasurerAsync(from, to, ct));

    private async Task<ByMeasurerDto> ComputeByMeasurerAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var leadData = await db.Leads
            .Where(l => l.AssignedMeasurerId != null
                     && (!from.HasValue || l.CallDate >= from)
                     && (!to.HasValue   || l.CallDate <= to))
            .Select(l => new
            {
                UserId      = l.AssignedMeasurerId!.Value,
                IsClosed    = ClosedStatuses.Contains(l.Status),
                Revenue     = ClosedStatuses.Contains(l.Status)
                    ? (decimal?)l.Measurements.Sum(m => m.DealPriceTjs ?? 0m)
                    : null,
            })
            .ToListAsync(ct);

        var data = leadData
            .GroupBy(l => l.UserId)
            .Select(g => new
            {
                UserId      = g.Key,
                LeadCount   = g.Count(),
                ClosedCount = g.Count(l => l.IsClosed),
                RevenueTjs  = g.Sum(l => l.Revenue ?? 0m),
            })
            .ToList();

        var userIds = data.Select(d => d.UserId).ToList();
        var names = await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        var rows = data
            .OrderByDescending(d => d.RevenueTjs)
            .Select(d => new MeasurerRow(
                d.UserId,
                names.GetValueOrDefault(d.UserId, "Неизвестно"),
                d.LeadCount,
                d.RevenueTjs,
                d.LeadCount > 0
                    ? Math.Round((decimal)d.ClosedCount / d.LeadCount * 100, 1)
                    : null))
            .ToList();

        return new ByMeasurerDto(rows);
    }
}
