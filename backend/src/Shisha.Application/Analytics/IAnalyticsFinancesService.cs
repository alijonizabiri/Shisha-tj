namespace Shisha.Application.Analytics;

public interface IAnalyticsFinancesService
{
    Task<PeriodFinancesDto> GetPeriodFinancesAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken ct = default);

    Task<ExportDataDto> GetExportDataAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken ct = default);
}
