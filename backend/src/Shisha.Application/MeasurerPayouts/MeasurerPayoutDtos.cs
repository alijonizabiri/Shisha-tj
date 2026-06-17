namespace Shisha.Application.MeasurerPayouts;

public record CreateMeasurerPayoutRequest(
    Guid MeasurementId,
    Guid MeasurerId,
    decimal? ActualAmountTjs);

public record MarkPaidRequest(DateOnly? PaidAt);

public record MeasurerPayoutDto(
    Guid Id,
    Guid MeasurementId,
    Guid MeasurerId,
    string MeasurerName,
    decimal CalculatedAmountTjs,
    decimal ActualAmountTjs,
    bool IsPaid,
    DateOnly? PaidAt,
    string? Note,
    DateTime CreatedAt);
