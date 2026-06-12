namespace Shisha.Application.Leads;

// ── Queries ───────────────────────────────────────────────────────────────────

public record LeadsQuery(
    string? Search = null,
    DateOnly? From = null,
    DateOnly? To = null,
    int Page = 1,
    int PageSize = 20);

// ── Requests ──────────────────────────────────────────────────────────────────

public record CreateLeadRequest(
    string Name,
    string Phone,
    string Product,
    string? Source,
    string? Note,
    DateOnly CallDate);

public record UpdateLeadRequest(
    string Name,
    string Phone,
    string Product,
    string? Source,
    string? Note,
    DateOnly CallDate);

// ── Responses ─────────────────────────────────────────────────────────────────

public record LeadSummaryResponse(
    Guid Id,
    string Name,
    string Phone,
    string Product,
    string? Source,
    string? Note,
    DateOnly CallDate,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedLeadsResponse(
    IReadOnlyList<LeadSummaryResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record LeadMeasurementDto(
    Guid Id,
    string Address,
    string Status,
    string GlassColor,
    string HardwareColor,
    int MeasureMm,
    int HeightMm,
    decimal? DealPriceTjs,
    decimal? DeliveryCostTjs,
    DateOnly? InstallationDate,
    DateOnly? WarrantyUntil,
    decimal TotalPaidTjs,
    decimal? BalanceDueTjs,
    string? AssignedMeasurerName,
    DateTime MeasuredAt,
    DateTime CreatedAt);

public record LeadDetailResponse(
    Guid Id,
    string Name,
    string Phone,
    string Product,
    string? Source,
    string? Note,
    DateOnly CallDate,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<LeadMeasurementDto> Measurements);

// ── Lookups ───────────────────────────────────────────────────────────────────

public record RefusalReasonDto(Guid Id, string Label);

public record ProductDto(Guid Id, string Name, bool IsActive);
