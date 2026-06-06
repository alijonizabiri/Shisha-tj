namespace Shisha.Application.Analytics;

public interface IAnalyticsService
{
    Task<DashboardDto>   GetDashboardAsync  (DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<FunnelDto>      GetFunnelAsync     (DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<RefusalsDto>    GetRefusalsAsync   (DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<ByProductDto>   GetByProductAsync  (DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<ByColorDto>     GetByColorAsync    (DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<ByMeasurerDto>  GetByMeasurerAsync (DateOnly? from, DateOnly? to, CancellationToken ct = default);
}
