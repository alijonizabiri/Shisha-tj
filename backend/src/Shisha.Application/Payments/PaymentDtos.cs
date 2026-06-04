namespace Shisha.Application.Payments;

// ── Requests ──────────────────────────────────────────────────────────────────

public record CreatePaymentRequest(
    Guid LeadId,
    decimal AmountTjs,
    string Kind,
    DateOnly PaidAt,
    string? Note);

// ── Responses ─────────────────────────────────────────────────────────────────

public record PaymentDto(
    Guid Id,
    Guid LeadId,
    decimal AmountTjs,
    string Kind,
    DateOnly PaidAt,
    string? Note,
    DateTime CreatedAt);
