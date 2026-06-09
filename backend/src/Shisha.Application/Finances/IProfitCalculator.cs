namespace Shisha.Application.Finances;

public interface IProfitCalculator
{
    Task<LeadFinancesDto> CalculateAsync(Guid leadId, CancellationToken ct = default);
    Task<MeasurementFinancesDto> CalculateForMeasurementAsync(Guid measurementId, CancellationToken ct = default);
}
