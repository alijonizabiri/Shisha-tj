namespace Shisha.Application.Leads;

// ── Queries ───────────────────────────────────────────────────────────────────

public record LeadsQuery(
    string? Status = null,
    Guid? AssignedTo = null,
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

public record PatchStatusRequest(
    string Status,
    Guid? RefusalReasonId = null,
    string? RefusalNote = null,
    Guid? AssignedMeasurerId = null);

public record AssignMeasurerRequest(Guid UserId);

// ── Responses ─────────────────────────────────────────────────────────────────

public record LeadSummaryResponse(
    Guid Id,
    string Name,
    string Phone,
    string Product,
    string Status,
    string? Source,
    string? Note,
    Guid? RefusalReasonId,
    string? RefusalNote,
    DateOnly CallDate,
    Guid? AssignedMeasurerId,
    string? AssignedMeasurerName,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedLeadsResponse(
    IReadOnlyList<LeadSummaryResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record KanbanColumn(string Status, IReadOnlyList<LeadSummaryResponse> Items);

public record KanbanResponse(IReadOnlyList<KanbanColumn> Columns);

public record LeadMeasurementDto(
    Guid Id,
    string Address,
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
    DateTime MeasuredAt,
    DateTime CreatedAt);

public record LeadDetailResponse(
    Guid Id,
    string Name,
    string Phone,
    string Product,
    string Status,
    string? Source,
    string? Note,
    Guid? RefusalReasonId,
    string? RefusalNote,
    DateOnly CallDate,
    Guid? AssignedMeasurerId,
    string? AssignedMeasurerName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<LeadMeasurementDto> Measurements);

// ── Lookups ───────────────────────────────────────────────────────────────────

public record RefusalReasonDto(Guid Id, string Label);

public record ProductDto(Guid Id, string Name, bool IsActive);
