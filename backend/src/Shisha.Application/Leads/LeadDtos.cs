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
    string? Address,
    string Product,
    string? Source,
    string? Note,
    DateOnly CallDate);

public record UpdateLeadRequest(
    string Name,
    string Phone,
    string? Address,
    string Product,
    string? Source,
    string? Note,
    DateOnly CallDate,
    DateOnly? PromisedInstallDate);

public record PatchStatusRequest(
    string Status,
    Guid? RefusalReasonId = null,
    string? RefusalNote = null,
    decimal? DealPriceTjs = null,
    Guid? AssignedMeasurerId = null,
    string? Address = null,
    DateOnly? PromisedInstallDate = null);

public record AssignMeasurerRequest(Guid UserId);

// ── Responses ─────────────────────────────────────────────────────────────────

public record LeadSummaryResponse(
    Guid Id,
    string Name,
    string Phone,
    string? Address,
    string Product,
    string Status,
    string? Source,
    string? Note,
    Guid? RefusalReasonId,
    string? RefusalNote,
    DateOnly CallDate,
    DateOnly? PromisedInstallDate,
    DateOnly? WarrantyUntil,
    Guid? AssignedMeasurerId,
    string? AssignedMeasurerName,
    decimal? DealPriceTjs,
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
    string Configuration,
    string GlassColor,
    string HardwareColor,
    int MeasureMm,
    int HeightMm,
    DateTime MeasuredAt,
    DateTime CreatedAt);

public record LeadDetailResponse(
    Guid Id,
    string Name,
    string Phone,
    string? Address,
    string Product,
    string Status,
    string? Source,
    string? Note,
    Guid? RefusalReasonId,
    string? RefusalNote,
    DateOnly CallDate,
    DateOnly? PromisedInstallDate,
    DateOnly? WarrantyUntil,
    Guid? AssignedMeasurerId,
    string? AssignedMeasurerName,
    decimal? DealPriceTjs,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<LeadMeasurementDto> Measurements);
