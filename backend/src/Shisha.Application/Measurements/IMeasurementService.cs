namespace Shisha.Application.Measurements;

public interface IMeasurementService
{
    Task<MeasurementResponse> CreateAsync(
        CreateMeasurementRequest request,
        CancellationToken ct = default);

    Task<MeasurementResponse> GetByIdAsync(
        Guid id,
        CancellationToken ct = default);

    Task<MeasurementResponse> UpdateAsync(
        Guid id,
        UpdateMeasurementRequest request,
        CancellationToken ct = default);
}
