namespace Shisha.Application.Measurements;

// ── Requests ──────────────────────────────────────────────────────────────────

public sealed record PanelInputDto(
    int Position,
    int WidthMm,
    int HeightMm,
    bool IsDoor);

public sealed record HoleRequest(
    int PanelIndex,
    int XMm,
    int YMm,
    int RadiusMm,
    string HoleType);

public sealed record CreateMeasurementRequest(
    int MeasureMm,
    int HeightMm,
    string GlassColor,
    string HardwareColor,
    string? HandleSide,
    Guid? LeadId,
    IReadOnlyList<PanelInputDto>? Panels,
    IReadOnlyList<HoleRequest>? Holes);

public sealed record UpdateMeasurementRequest(
    int MeasureMm,
    int HeightMm,
    string GlassColor,
    string HardwareColor,
    string? HandleSide,
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
    IReadOnlyList<HoleResponse> Holes);

public sealed record MeasurementResponse(
    Guid Id,
    Guid? MeasurerId,
    int MeasureMm,
    int HeightMm,
    string GlassColor,
    string HardwareColor,
    string HandleSide,
    DateTime MeasuredAt,
    DateTime CreatedAt,
    IReadOnlyList<GlassResponse> Glasses);
