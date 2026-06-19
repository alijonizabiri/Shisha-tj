namespace Shisha.Application.Measurements;

// ── Kanban ────────────────────────────────────────────────────────────────────

public record MeasurementKanbanItemResponse(
    Guid Id,
    Guid? LeadId,
    string LeadName,
    string LeadPhone,
    string Product,
    string Status,
    string? AssignedMeasurerName,
    decimal? DealPriceTjs,
    decimal TotalPaidTjs,
    DateOnly? InstallationDate,
    DateTime CreatedAt,
    int MeasureMm,
    int HeightMm,
    string GlassColor,
    DateTime MeasuredAt);

public record MeasurementKanbanColumn(string Status, IReadOnlyList<MeasurementKanbanItemResponse> Items);

public record MeasurementKanbanResponse(IReadOnlyList<MeasurementKanbanColumn> Columns);

// ── Requests ──────────────────────────────────────────────────────────────────

public sealed record PanelInputDto(
    int Position,
    int WidthMm,
    int HeightMm,
    bool IsDoor,
    string? Shape = null,
    Guid? SetId = null,
    int? CurvatureRadiusMm = null,
    string? Mechanism = null,
    string? HingeSide = null);

public sealed record HoleRequest(
    int PanelIndex,
    int XMm,
    int YMm,
    int RadiusMm,
    string HoleType);

public sealed record PatchMeasurementStatusRequest(
    string Status,
    Guid? RefusalReasonId = null,
    string? RefusalNote = null);

public sealed record AssignMeasurerRequest(Guid UserId);

public sealed record CreateMeasurementRequest(
    int MeasureMm,
    int HeightMm,
    string GlassColor,
    string HardwareColor,
    string? HandleSide,
    Guid? LeadId,
    string? Product,
    string? Address,
    decimal? DealPriceTjs,
    decimal? DeliveryCostTjs,
    DateOnly? InstallationDate,
    IReadOnlyList<PanelInputDto>? Panels,
    IReadOnlyList<HoleRequest>? Holes);

public sealed record UpdateMeasurementRequest(
    int MeasureMm,
    int HeightMm,
    string GlassColor,
    string HardwareColor,
    string? HandleSide,
    string? Product,
    string? Address,
    decimal? DealPriceTjs,
    decimal? DeliveryCostTjs,
    DateOnly? InstallationDate,
    IReadOnlyList<PanelInputDto> Panels,
    IReadOnlyList<HoleRequest>? Holes);

// ── Responses ─────────────────────────────────────────────────────────────────

public sealed record HoleResponse(
    Guid Id,
    int XMm,
    int YMm,
    int RadiusMm,
    string HoleType);

public sealed record GlassResponse(
    Guid Id,
    int Position,
    bool IsDoor,
    int WidthMm,
    int HeightMm,
    string Shape,
    Guid? SetId,
    int? CurvatureRadiusMm,
    string? Mechanism,
    string? HingeSide,
    IReadOnlyList<HoleResponse> Holes);

public sealed record MeasurementResponse(
    Guid Id,
    Guid? MeasurerId,
    Guid? LeadId,
    string? Product,
    string Address,
    string Status,
    Guid? AssignedMeasurerId,
    string? AssignedMeasurerName,
    Guid? RefusalReasonId,
    string? RefusalNote,
    int MeasureMm,
    int HeightMm,
    string GlassColor,
    string HardwareColor,
    string HandleSide,
    decimal? DealPriceTjs,
    decimal? DeliveryCostTjs,
    DateOnly? InstallationDate,
    DateOnly? WarrantyUntil,
    DateTime MeasuredAt,
    DateTime CreatedAt,
    IReadOnlyList<GlassResponse> Glasses);
