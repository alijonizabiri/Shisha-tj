namespace Shisha.Application.Measurements;

public record MeasurementTransitionArgs(
    Guid? RefusalReasonId = null,
    string? RefusalNote = null,
    // Pre-fetched from DB by caller
    int GlassCount = 0,
    decimal DepositSumTjs = 0m,
    decimal TotalPaidTjs = 0m
);
