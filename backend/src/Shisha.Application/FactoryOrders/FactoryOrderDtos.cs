namespace Shisha.Application.FactoryOrders;

// ── Queries ───────────────────────────────────────────────────────────────────

public record FactoryOrdersQuery(
    string? Status = null,
    DateOnly? From = null,
    DateOnly? To = null,
    int Page = 1,
    int PageSize = 20);

// ── Requests ──────────────────────────────────────────────────────────────────

public record CreateFactoryOrderRequest(IList<Guid> GlassIds);

public record SendFactoryOrderRequest(DateOnly? OrderedAt);

public record ItemCostDto(Guid ItemId, decimal GlassCostTjs);

public record ReceiveFactoryOrderRequest(
    DateOnly ReceivedAt,
    decimal? FactoryTotalTjs,
    IList<ItemCostDto>? ItemCosts);

public record ReworkItemRequest(string Reason);

// ── Responses ─────────────────────────────────────────────────────────────────

public record FactoryOrderItemDto(
    Guid Id,
    Guid GlassId,
    int WidthMm,
    int HeightMm,
    bool IsDoor,
    int Position,
    decimal? GlassCostTjs,
    bool IsRework,
    string? ReworkReason,
    Guid? LeadId,
    string? LeadName);

public record FactoryOrderSummaryResponse(
    Guid Id,
    string Status,
    DateOnly? OrderedAt,
    DateOnly? ReceivedAt,
    decimal? FactoryTotalTjs,
    string? Note,
    int ItemCount,
    DateTime CreatedAt);

public record FactoryOrderDetailResponse(
    Guid Id,
    string Status,
    DateOnly? OrderedAt,
    DateOnly? ReceivedAt,
    decimal? FactoryTotalTjs,
    string? Note,
    DateTime CreatedAt,
    IReadOnlyList<FactoryOrderItemDto> Items);

public record PagedFactoryOrdersResponse(
    IReadOnlyList<FactoryOrderSummaryResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);
