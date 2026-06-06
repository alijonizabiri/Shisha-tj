namespace Shisha.Application.Analytics;

public record DashboardDto(
    int TotalLeads,
    int ActiveLeads,
    decimal RevenueTjs,
    decimal? ConversionRate,
    decimal? AvgDealSizeTjs);

public record FunnelDto(IReadOnlyList<FunnelRow> Statuses);
public record FunnelRow(string Status, int Count);

public record RefusalsDto(IReadOnlyList<RefusalRow> Reasons, int TotalRefused);
public record RefusalRow(string Label, int Count, decimal Percentage);

public record ByProductDto(IReadOnlyList<ProductRow> Products);
public record ProductRow(string Product, int LeadCount, decimal RevenueTjs);

public record ByColorDto(
    IReadOnlyList<ColorRow> GlassColors,
    IReadOnlyList<ColorRow> HardwareColors);
public record ColorRow(string Color, int Count);

public record ByMeasurerDto(IReadOnlyList<MeasurerRow> Measurers);
public record MeasurerRow(
    Guid UserId,
    string Name,
    int LeadCount,
    decimal RevenueTjs,
    decimal? ConversionRate);
