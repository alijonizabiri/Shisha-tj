using Microsoft.EntityFrameworkCore;
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
        _ = await db.Leads.FindAsync([request.LeadId], ct)
            ?? throw new NotFoundException($"Lead {request.LeadId} not found.");

        if (!Enum.TryParse<PaymentKind>(request.Kind, out var kind))
            throw new DomainValidationException("kind", $"Unknown payment kind '{request.Kind}'.");

        var hasMeasurement = await db.Measurements
            .AnyAsync(m => m.LeadId == request.LeadId, ct);
        if (!hasMeasurement)
            throw new BusinessRuleException(
                "MEASUREMENT_REQUIRED_FOR_PAYMENT",
                "Нельзя добавить платёж: у лида нет замера. Создайте замер в Дизайнере.");

        if (request.AmountTjs == 0)
            throw new DomainValidationException("amountTjs", "Amount must not be zero.");

        var payment = new Payment
        {
            TenantId = currentUser.TenantId,
            LeadId = request.LeadId,
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
        p.Id, p.LeadId, p.AmountTjs, p.Kind.ToString(), p.PaidAt, p.Note, p.CreatedAt);
}
