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
        var leadsQ = db.Leads
            .Where(l => (!from.HasValue || l.CallDate >= from)
                     && (!to.HasValue   || l.CallDate <= to));

        var total = await leadsQ.CountAsync(ct);

        // Lead is active if it has at least one measurement NOT in {Refused, Closed}
        var active = await leadsQ.CountAsync(l =>
            l.Measurements.Any(m => !ActiveExcluded.Contains(m.Status)), ct);

        // Lead is "closed/won" if it has at least one measurement in {Installed, Closed}
        var closedCount = await leadsQ.CountAsync(l =>
            l.Measurements.Any(m => ClosedStatuses.Contains(m.Status)), ct);

        var revenue = await db.Measurements
            .Where(m => ClosedStatuses.Contains(m.Status)
                     && m.Lead != null
                     && (!from.HasValue || m.Lead.CallDate >= from)
                     && (!to.HasValue   || m.Lead.CallDate <= to))
            .SumAsync(m => m.DealPriceTjs ?? 0m, ct);

        decimal? conversionRate = total > 0
            ? Math.Round((decimal)closedCount / total * 100, 1)
            : null;

        decimal? avgDeal = await db.Measurements
            .Where(m => ClosedStatuses.Contains(m.Status)
                     && m.Lead != null
                     && (!from.HasValue || m.Lead.CallDate >= from)
                     && (!to.HasValue   || m.Lead.CallDate <= to)
                     && m.DealPriceTjs != null && m.DealPriceTjs > 0)
            .Select(m => (decimal?)m.DealPriceTjs)
            .AverageAsync(ct);

        if (avgDeal.HasValue)
            avgDeal = Math.Round(avgDeal.Value, 2);

        return new DashboardDto(total, active, revenue, conversionRate, avgDeal);
    }

    // ── Funnel ────────────────────────────────────────────────────────────────

    public Task<FunnelDto> GetFunnelAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default) =>
        GetOrSetAsync(Key("funnel", from, to), () => ComputeFunnelAsync(from, to, ct));

    private async Task<FunnelDto> ComputeFunnelAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        // Funnel by measurement status; date filter via lead.callDate
        var counts = await db.Measurements
            .Where(m => m.Lead != null
                     && (!from.HasValue || m.Lead.CallDate >= from)
                     && (!to.HasValue   || m.Lead.CallDate <= to))
            .GroupBy(m => m.Status)
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
        var groups = await db.Measurements
            .Where(m => m.Status == LeadStatus.Refused
                     && m.Lead != null
                     && (!from.HasValue || m.Lead.CallDate >= from)
                     && (!to.HasValue   || m.Lead.CallDate <= to))
            .GroupBy(m => m.RefusalReasonId)
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
                Revenue = (decimal?)l.Measurements
                    .Where(m => ClosedStatuses.Contains(m.Status))
                    .Sum(m => m.DealPriceTjs ?? 0m),
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
        var measurementData = await db.Measurements
            .Where(m => m.AssignedMeasurerId != null
                     && m.Lead != null
                     && (!from.HasValue || m.Lead.CallDate >= from)
                     && (!to.HasValue   || m.Lead.CallDate <= to))
            .Select(m => new
            {
                UserId   = m.AssignedMeasurerId!.Value,
                IsClosed = ClosedStatuses.Contains(m.Status),
                Revenue  = ClosedStatuses.Contains(m.Status)
                    ? (decimal?)m.DealPriceTjs
                    : null,
            })
            .ToListAsync(ct);

        var data = measurementData
            .GroupBy(m => m.UserId)
            .Select(g => new
            {
                UserId       = g.Key,
                Count        = g.Count(),
                ClosedCount  = g.Count(m => m.IsClosed),
                RevenueTjs   = g.Sum(m => m.Revenue ?? 0m),
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
                d.Count,
                d.RevenueTjs,
                d.Count > 0
                    ? Math.Round((decimal)d.ClosedCount / d.Count * 100, 1)
                    : null))
            .ToList();

        return new ByMeasurerDto(rows);
    }
}
