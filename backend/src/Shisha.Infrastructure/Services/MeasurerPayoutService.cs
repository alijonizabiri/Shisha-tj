using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Application.MeasurerPayouts;
using Shisha.Domain.Entities;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class MeasurerPayoutService(AppDbContext db, ICurrentUser currentUser) : IMeasurerPayoutService
{
    public async Task<MeasurerPayoutDto> CreateAsync(
        CreateMeasurerPayoutRequest request,
        CancellationToken ct = default)
    {
        var existing = await db.MeasurerPayouts
            .AnyAsync(p => p.MeasurementId == request.MeasurementId, ct);

        if (existing)
            throw new ConflictException("Для этого замера уже существует выплата замерщику.");

        var measurer = await db.Users.FindAsync([request.MeasurerId], ct)
            ?? throw new NotFoundException($"User {request.MeasurerId} not found.");

        if (measurer.MeasurerFixedFeeTjs is null)
            throw new DomainValidationException("measurerId",
                "У замерщика не задана ставка. Укажите ставку в профиле пользователя.");

        _ = await db.Measurements.FindAsync([request.MeasurementId], ct)
            ?? throw new NotFoundException($"Measurement {request.MeasurementId} not found.");

        var calculated = measurer.MeasurerFixedFeeTjs.Value;
        var actual = request.ActualAmountTjs ?? calculated;

        var payout = new MeasurerPayout
        {
            TenantId = currentUser.TenantId,
            MeasurementId = request.MeasurementId,
            MeasurerId = request.MeasurerId,
            CalculatedAmountTjs = calculated,
            ActualAmountTjs = actual,
        };

        db.MeasurerPayouts.Add(payout);
        await db.SaveChangesAsync(ct);

        return ToDto(payout, measurer.FullName);
    }

    public async Task<MeasurerPayoutDto> MarkPaidAsync(
        Guid payoutId,
        MarkPaidRequest request,
        CancellationToken ct = default)
    {
        var payout = await db.MeasurerPayouts
            .Include(p => p.Measurer)
            .FirstOrDefaultAsync(p => p.Id == payoutId, ct)
            ?? throw new NotFoundException($"MeasurerPayout {payoutId} not found.");

        payout.IsPaid = true;
        payout.PaidAt = request.PaidAt ?? DateOnly.FromDateTime(DateTime.UtcNow);

        await db.SaveChangesAsync(ct);

        return ToDto(payout, payout.Measurer.FullName);
    }

    public async Task<MeasurerPayoutDto?> GetByMeasurementAsync(
        Guid measurementId,
        CancellationToken ct = default)
    {
        var payout = await db.MeasurerPayouts
            .Include(p => p.Measurer)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.MeasurementId == measurementId, ct);

        return payout is null ? null : ToDto(payout, payout.Measurer.FullName);
    }

    private static MeasurerPayoutDto ToDto(MeasurerPayout p, string measurerName) => new(
        p.Id,
        p.MeasurementId,
        p.MeasurerId,
        measurerName,
        p.CalculatedAmountTjs,
        p.ActualAmountTjs,
        p.IsPaid,
        p.PaidAt,
        p.Note,
        p.CreatedAt);
}
