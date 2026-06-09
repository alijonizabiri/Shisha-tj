using Shisha.Application.Abstractions;
using Shisha.Application.Payments;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class PaymentService(AppDbContext db, ICurrentUser currentUser) : IPaymentService
{
    public async Task<PaymentDto> CreateAsync(CreatePaymentRequest request, CancellationToken ct = default)
    {
        _ = await db.Measurements.FindAsync([request.MeasurementId], ct)
            ?? throw new BusinessRuleException(
                "MEASUREMENT_NOT_FOUND",
                $"Measurement {request.MeasurementId} not found.");

        if (!Enum.TryParse<PaymentKind>(request.Kind, out var kind))
            throw new DomainValidationException("kind", $"Unknown payment kind '{request.Kind}'.");

        if (request.AmountTjs == 0)
            throw new DomainValidationException("amountTjs", "Amount must not be zero.");

        var payment = new Payment
        {
            TenantId = currentUser.TenantId,
            MeasurementId = request.MeasurementId,
            AmountTjs = request.AmountTjs,
            Kind = kind,
            PaidAt = request.PaidAt,
            Note = request.Note,
        };

        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);

        return ToDto(payment);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var payment = await db.Payments.FindAsync([id], ct)
            ?? throw new NotFoundException($"Payment {id} not found.");

        db.Remove(payment);
        await db.SaveChangesAsync(ct);
    }

    private static PaymentDto ToDto(Payment p) => new(
        p.Id, p.MeasurementId, p.AmountTjs, p.Kind.ToString(), p.PaidAt, p.Note, p.CreatedAt);
}
