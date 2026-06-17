using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Application.FactoryOrders;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class FactoryOrderService(AppDbContext db, ICurrentUser currentUser) : IFactoryOrderService
{
    public async Task<PagedFactoryOrdersResponse> GetListAsync(FactoryOrdersQuery query, CancellationToken ct = default)
    {
        var q = db.FactoryOrders.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Status)
            && Enum.TryParse<FactoryOrderStatus>(query.Status, out var status))
            q = q.Where(o => o.Status == status);

        if (query.From.HasValue)
            q = q.Where(o => o.CreatedAt >= query.From.Value.ToDateTime(TimeOnly.MinValue));

        if (query.To.HasValue)
            q = q.Where(o => o.CreatedAt <= query.To.Value.ToDateTime(TimeOnly.MaxValue));

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var orders = await q
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .Select(o => new FactoryOrderSummaryResponse(
                o.Id,
                o.Status.ToString(),
                o.OrderedAt,
                o.ReceivedAt,
                o.FactoryTotalTjs,
                o.FactoryPayments.Sum(p => p.AmountTjs),
                o.FactoryPayments.Any() ? o.FactoryPayments.Max(p => (DateOnly?)p.PaidAt) : null,
                o.Note,
                o.Items.Count(),
                o.CreatedAt))
            .ToListAsync(ct);

        return new PagedFactoryOrdersResponse(orders, total, page, pageSize);
    }

    public async Task<FactoryOrderDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var order = await LoadOrderAsync(id, ct)
            ?? throw new NotFoundException($"Factory order {id} not found.");

        return ToDetail(order);
    }

    public async Task<FactoryOrderDetailResponse> CreateAsync(CreateFactoryOrderRequest request, CancellationToken ct = default)
    {
        if (request.GlassIds.Count == 0)
            throw new DomainValidationException("glassIds", "At least one glass must be selected.");

        var glasses = await db.Glasses
            .Where(g => request.GlassIds.Contains(g.Id))
            .ToListAsync(ct);

        if (glasses.Count != request.GlassIds.Count)
            throw new NotFoundException("One or more glasses not found.");

        // A glass may only appear in one active (non-Closed) order at a time
        var conflictingGlassIds = await db.FactoryOrderItems
            .Where(i => request.GlassIds.Contains(i.GlassId)
                     && !i.IsRework
                     && i.FactoryOrder.Status != FactoryOrderStatus.Closed)
            .Select(i => i.GlassId)
            .ToListAsync(ct);

        if (conflictingGlassIds.Count > 0)
            throw new ConflictException(
                $"Glass(es) already in an active factory order: {string.Join(", ", conflictingGlassIds)}");

        var order = new FactoryOrder
        {
            TenantId = currentUser.TenantId,
            Status = FactoryOrderStatus.Draft,
            Items = request.GlassIds
                .Select(gId => new FactoryOrderItem
                {
                    TenantId = currentUser.TenantId,
                    GlassId = gId,
                })
                .ToList(),
        };

        db.FactoryOrders.Add(order);

        // Sync: move Buying measurements to OrderedAtFactory
        var measurementIds = await db.Glasses
            .Where(g => request.GlassIds.Contains(g.Id))
            .Select(g => g.MeasurementId)
            .Distinct()
            .ToListAsync(ct);

        if (measurementIds.Count > 0)
        {
            var toBump = await db.Measurements
                .Where(m => measurementIds.Contains(m.Id) && m.Status == LeadStatus.Buying)
                .ToListAsync(ct);

            foreach (var m in toBump)
                m.Status = LeadStatus.OrderedAtFactory;
        }

        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(order.Id, ct);
    }

    public async Task<FactoryOrderDetailResponse> SendAsync(Guid id, SendFactoryOrderRequest request, CancellationToken ct = default)
    {
        var order = await db.FactoryOrders.FindAsync([id], ct)
            ?? throw new NotFoundException($"Factory order {id} not found.");

        if (order.Status != FactoryOrderStatus.Draft)
            throw new ConflictException($"Cannot send an order in status '{order.Status}'.");

        order.Status = FactoryOrderStatus.Sent;
        order.OrderedAt = request.OrderedAt ?? DateOnly.FromDateTime(DateTime.UtcNow);

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<FactoryOrderDetailResponse> ReceiveAsync(Guid id, ReceiveFactoryOrderRequest request, CancellationToken ct = default)
    {
        var order = await db.FactoryOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new NotFoundException($"Factory order {id} not found.");

        if (order.Status != FactoryOrderStatus.Sent)
            throw new ConflictException($"Cannot receive an order in status '{order.Status}'.");

        order.Status = FactoryOrderStatus.Received;
        order.ReceivedAt = request.ReceivedAt;
        order.FactoryTotalTjs = request.FactoryTotalTjs;

        if (request.ItemCosts is { Count: > 0 })
        {
            var costMap = request.ItemCosts.ToDictionary(c => c.ItemId, c => c.GlassCostTjs);
            foreach (var item in order.Items.Where(i => costMap.ContainsKey(i.Id)))
                item.GlassCostTjs = costMap[item.Id];
        }

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<FactoryOrderDetailResponse> AddReworkItemAsync(Guid id, Guid itemId, ReworkItemRequest request, CancellationToken ct = default)
    {
        _ = await db.FactoryOrders.FindAsync([id], ct)
            ?? throw new NotFoundException($"Factory order {id} not found.");

        var originalItem = await db.FactoryOrderItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.FactoryOrderId == id, ct)
            ?? throw new NotFoundException($"Factory order item {itemId} not found.");

        if (!Enum.TryParse<ReworkReason>(request.Reason, out var reworkReason))
            throw new DomainValidationException("reason", $"Unknown rework reason '{request.Reason}'.");

        var reworkItem = new FactoryOrderItem
        {
            TenantId = currentUser.TenantId,
            FactoryOrderId = id,
            GlassId = originalItem.GlassId,
            IsRework = true,
            ReworkReason = reworkReason,
        };

        db.FactoryOrderItems.Add(reworkItem);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<AddFactoryPaymentResponse> AddPaymentAsync(
        Guid orderId,
        AddFactoryPaymentRequest request,
        CancellationToken ct = default)
    {
        var order = await db.FactoryOrders
            .Include(o => o.FactoryPayments)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new NotFoundException($"Factory order {orderId} not found.");

        var payment = new FactoryPayment
        {
            TenantId = currentUser.TenantId,
            FactoryOrderId = orderId,
            AmountTjs = request.AmountTjs,
            PaidAt = request.PaidAt,
            Note = request.Note,
        };

        db.FactoryPayments.Add(payment);
        await db.SaveChangesAsync(ct);

        var detail = await GetByIdAsync(orderId, ct);

        string? warning = null;
        if (order.FactoryTotalTjs.HasValue && detail.FactoryPaidTjs > order.FactoryTotalTjs.Value)
            warning = "Сумма оплаты превышает сумму заказа";

        return new AddFactoryPaymentResponse(detail, warning);
    }

    public async Task DeletePaymentAsync(Guid orderId, Guid paymentId, CancellationToken ct = default)
    {
        _ = await db.FactoryOrders.FindAsync([orderId], ct)
            ?? throw new NotFoundException($"Factory order {orderId} not found.");

        var payment = await db.FactoryPayments
            .FirstOrDefaultAsync(p => p.Id == paymentId && p.FactoryOrderId == orderId, ct)
            ?? throw new NotFoundException($"Factory payment {paymentId} not found.");

        payment.IsDeleted = true;
        payment.DeletedAt = DateTime.UtcNow;
        payment.DeletedByUserId = currentUser.UserId;

        await db.SaveChangesAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Task<FactoryOrder?> LoadOrderAsync(Guid id, CancellationToken ct) =>
        db.FactoryOrders
            .Include(o => o.Items)
                .ThenInclude(i => i.Glass)
                    .ThenInclude(g => g.Measurement)
                        .ThenInclude(m => m!.Lead)
            .Include(o => o.FactoryPayments)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id, ct);

    private static FactoryOrderDetailResponse ToDetail(FactoryOrder o)
    {
        var paidTjs = o.FactoryPayments.Sum(p => p.AmountTjs);
        var paidAt = o.FactoryPayments.Any()
            ? o.FactoryPayments.Max(p => p.PaidAt)
            : (DateOnly?)null;

        return new FactoryOrderDetailResponse(
            o.Id,
            o.Status.ToString(),
            o.OrderedAt,
            o.ReceivedAt,
            o.FactoryTotalTjs,
            paidTjs,
            o.FactoryTotalTjs.HasValue ? o.FactoryTotalTjs.Value - paidTjs : null,
            paidAt,
            o.Note,
            o.CreatedAt,
            o.Items
                .OrderBy(i => i.CreatedAt)
                .Select(ToItemDto)
                .ToList(),
            o.FactoryPayments
                .OrderBy(p => p.PaidAt)
                .ThenBy(p => p.CreatedAt)
                .Select(ToPaymentDto)
                .ToList());
    }

    private static FactoryOrderItemDto ToItemDto(FactoryOrderItem i) => new(
        i.Id,
        i.GlassId,
        i.Glass?.WidthMm ?? 0,
        i.Glass?.HeightMm ?? 0,
        i.Glass?.IsDoor ?? false,
        i.Glass?.Position ?? 0,
        i.GlassCostTjs,
        i.IsRework,
        i.ReworkReason?.ToString(),
        i.Glass?.Measurement?.Lead?.Id,
        i.Glass?.Measurement?.Lead?.Name);

    private static FactoryPaymentDto ToPaymentDto(FactoryPayment p) => new(
        p.Id,
        p.AmountTjs,
        p.PaidAt,
        p.Note,
        p.CreatedAt);
}
