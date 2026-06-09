namespace Shisha.Application.Payments;

// ── Requests ──────────────────────────────────────────────────────────────────

public record CreatePaymentRequest(
    Guid MeasurementId,
    decimal AmountTjs,
    string Kind,
    DateOnly PaidAt,
    string? Note);

// ── Responses ─────────────────────────────────────────────────────────────────

public record PaymentDto(
    Guid Id,
    Guid MeasurementId,
    decimal AmountTjs,
    string Kind,
    DateOnly PaidAt,
    string? Note,
    DateTime CreatedAt);
