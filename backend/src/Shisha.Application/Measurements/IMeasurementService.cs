namespace Shisha.Application.Measurements;

public interface IMeasurementService
{
    Task<MeasurementKanbanResponse> GetKanbanAsync(CancellationToken ct = default);

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

    Task PatchStatusAsync(
        Guid id,
        PatchMeasurementStatusRequest request,
        CancellationToken ct = default);

    Task AssignMeasurerAsync(
        Guid id,
        AssignMeasurerRequest request,
        CancellationToken ct = default);
}
