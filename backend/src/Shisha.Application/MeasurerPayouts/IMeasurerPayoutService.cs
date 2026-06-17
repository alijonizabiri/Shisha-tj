namespace Shisha.Application.MeasurerPayouts;

public interface IMeasurerPayoutService
{
    Task<MeasurerPayoutDto> CreateAsync(CreateMeasurerPayoutRequest request, CancellationToken ct = default);
    Task<MeasurerPayoutDto> MarkPaidAsync(Guid payoutId, MarkPaidRequest request, CancellationToken ct = default);
    Task<MeasurerPayoutDto?> GetByMeasurementAsync(Guid measurementId, CancellationToken ct = default);
}
