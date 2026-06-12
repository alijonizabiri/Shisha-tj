using Shisha.Application.Measurements;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;

namespace Shisha.Application.Tests.Measurements;

public sealed class MeasurementStatusTransitionServiceTests
{
    private readonly MeasurementStatusTransitionService _sut = new();

    private static Measurement NewMeasurement(LeadStatus status = LeadStatus.New) => new()
    {
        Address = "ул. Рудаки 1",
        MeasureMm = 1560,
        HeightMm = 2000,
        GlassColor = GlassColor.Transparent,
        HardwareColor = HardwareColor.BlackMatte,
        TenantId = Guid.NewGuid(),
        Status = status,
    };

    // ── CanTransition ────────────────────────────────────────────────────────

    [Theory]
    [InlineData(LeadStatus.New,              LeadStatus.Measurement)]
    [InlineData(LeadStatus.New,              LeadStatus.Refused)]
    [InlineData(LeadStatus.Measurement,      LeadStatus.Thinking)]
    [InlineData(LeadStatus.Measurement,      LeadStatus.Buying)]
    [InlineData(LeadStatus.Measurement,      LeadStatus.Refused)]
    [InlineData(LeadStatus.Thinking,         LeadStatus.Buying)]
    [InlineData(LeadStatus.Thinking,         LeadStatus.Refused)]
    [InlineData(LeadStatus.Buying,           LeadStatus.OrderedAtFactory)]
    [InlineData(LeadStatus.OrderedAtFactory, LeadStatus.GlassArrived)]
    [InlineData(LeadStatus.GlassArrived,     LeadStatus.Installed)]
    [InlineData(LeadStatus.Installed,        LeadStatus.Closed)]
    [InlineData(LeadStatus.Refused,          LeadStatus.New)]
    public void CanTransition_AllowedTransitions_ReturnsTrue(LeadStatus from, LeadStatus to)
        => Assert.True(_sut.CanTransition(from, to));

    [Theory]
    [InlineData(LeadStatus.New,     LeadStatus.New)]
    [InlineData(LeadStatus.Buying,  LeadStatus.Buying)]
    [InlineData(LeadStatus.Closed,  LeadStatus.Closed)]
    public void CanTransition_SameStatus_ReturnsTrue(LeadStatus from, LeadStatus to)
        => Assert.True(_sut.CanTransition(from, to));

    [Theory]
    [InlineData(LeadStatus.New,       LeadStatus.Buying)]
    [InlineData(LeadStatus.New,       LeadStatus.Closed)]
    [InlineData(LeadStatus.Closed,    LeadStatus.Installed)]
    [InlineData(LeadStatus.Closed,    LeadStatus.New)]
    [InlineData(LeadStatus.Installed, LeadStatus.New)]
    [InlineData(LeadStatus.Buying,    LeadStatus.Measurement)]
    public void CanTransition_ForbiddenTransitions_ReturnsFalse(LeadStatus from, LeadStatus to)
        => Assert.False(_sut.CanTransition(from, to));

    // ── Happy paths ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Transition_NewToMeasurement_Succeeds()
    {
        var m = NewMeasurement();
        await _sut.TransitionAsync(m, LeadStatus.Measurement, new MeasurementTransitionArgs());
        Assert.Equal(LeadStatus.Measurement, m.Status);
    }

    [Fact]
    public async Task Transition_ToRefused_SetsMeasurementRefusalFields()
    {
        var m = NewMeasurement();
        var reasonId = Guid.NewGuid();

        await _sut.TransitionAsync(m, LeadStatus.Refused,
            new MeasurementTransitionArgs(RefusalReasonId: reasonId, RefusalNote: "Дорого"));

        Assert.Equal(LeadStatus.Refused, m.Status);
        Assert.Equal(reasonId, m.RefusalReasonId);
        Assert.Equal("Дорого", m.RefusalNote);
    }

    [Fact]
    public async Task Transition_RefusedToNew_ClearsRefusalData()
    {
        var m = NewMeasurement(LeadStatus.Refused);
        m.RefusalReasonId = Guid.NewGuid();
        m.RefusalNote = "Дорого";

        await _sut.TransitionAsync(m, LeadStatus.New, new MeasurementTransitionArgs());

        Assert.Equal(LeadStatus.New, m.Status);
        Assert.Null(m.RefusalReasonId);
        Assert.Null(m.RefusalNote);
    }

    [Fact]
    public async Task Transition_SameStatus_IsNoOp()
    {
        var m = NewMeasurement(LeadStatus.Buying);
        await _sut.TransitionAsync(m, LeadStatus.Buying, new MeasurementTransitionArgs());
        Assert.Equal(LeadStatus.Buying, m.Status);
    }

    [Fact]
    public async Task Transition_InstalledToClosed_Succeeds()
    {
        var m = NewMeasurement(LeadStatus.Installed);
        await _sut.TransitionAsync(m, LeadStatus.Closed, new MeasurementTransitionArgs());
        Assert.Equal(LeadStatus.Closed, m.Status);
    }

    // ── Thinking guard ───────────────────────────────────────────────────────

    [Fact]
    public async Task Transition_ToThinking_NoGlasses_Throws()
    {
        var m = NewMeasurement(LeadStatus.Measurement);

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(m, LeadStatus.Thinking,
                new MeasurementTransitionArgs(GlassCount: 0)));

        Assert.True(ex.Errors.ContainsKey("glasses"));
    }

    [Fact]
    public async Task Transition_ToThinking_WithGlasses_Succeeds()
    {
        var m = NewMeasurement(LeadStatus.Measurement);
        await _sut.TransitionAsync(m, LeadStatus.Thinking,
            new MeasurementTransitionArgs(GlassCount: 2));
        Assert.Equal(LeadStatus.Thinking, m.Status);
    }

    // ── Buying guard ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Transition_ToBuying_NoDealPrice_Throws()
    {
        var m = NewMeasurement(LeadStatus.Measurement);
        m.DealPriceTjs = null;

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(m, LeadStatus.Buying,
                new MeasurementTransitionArgs(DepositSumTjs: 200m)));

        Assert.True(ex.Errors.ContainsKey("dealPrice"));
        Assert.Contains("DEAL_PRICE_REQUIRED", ex.Errors["dealPrice"][0]);
    }

    [Fact]
    public async Task Transition_ToBuying_DepositBelowMinimum_Throws()
    {
        var m = NewMeasurement(LeadStatus.Measurement);
        m.DealPriceTjs = 2000m;

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(m, LeadStatus.Buying,
                new MeasurementTransitionArgs(DepositSumTjs: 50m)));

        Assert.True(ex.Errors.ContainsKey("deposit"));
        Assert.Contains("DEPOSIT_BELOW_MINIMUM", ex.Errors["deposit"][0]);
    }

    [Fact]
    public async Task Transition_ToBuying_DealPriceAndDeposit_Succeeds()
    {
        var m = NewMeasurement(LeadStatus.Measurement);
        m.DealPriceTjs = 2000m;

        await _sut.TransitionAsync(m, LeadStatus.Buying,
            new MeasurementTransitionArgs(DepositSumTjs: 100m));

        Assert.Equal(LeadStatus.Buying, m.Status);
    }

    // ── Refused guard ────────────────────────────────────────────────────────

    [Fact]
    public async Task Transition_ToRefused_MissingReasonId_Throws()
    {
        var m = NewMeasurement();
        await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(m, LeadStatus.Refused, new MeasurementTransitionArgs()));
    }

    // ── Forbidden transition ─────────────────────────────────────────────────

    [Fact]
    public async Task Transition_ForbiddenTransition_ThrowsConflictException()
    {
        var m = NewMeasurement(LeadStatus.New);
        await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.TransitionAsync(m, LeadStatus.Buying, new MeasurementTransitionArgs()));
    }

    // ── Installed guard ──────────────────────────────────────────────────────

    [Fact]
    public async Task Transition_ToInstalled_FutureInstallationDate_Throws()
    {
        var m = NewMeasurement(LeadStatus.GlassArrived);
        m.InstallationDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(5);

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(m, LeadStatus.Installed, new MeasurementTransitionArgs()));

        Assert.True(ex.Errors.ContainsKey("installationDate"));
    }

    [Fact]
    public async Task Transition_ToInstalled_BalanceNotPaid_Throws()
    {
        var m = NewMeasurement(LeadStatus.GlassArrived);
        m.DealPriceTjs = 2000m;

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(m, LeadStatus.Installed,
                new MeasurementTransitionArgs(TotalPaidTjs: 1000m)));

        Assert.True(ex.Errors.ContainsKey("balance"));
        Assert.Contains("BALANCE_NOT_PAID", ex.Errors["balance"][0]);
    }

    [Fact]
    public async Task Transition_ToInstalled_FullyPaid_Succeeds()
    {
        var m = NewMeasurement(LeadStatus.GlassArrived);
        m.DealPriceTjs = 2000m;

        await _sut.TransitionAsync(m, LeadStatus.Installed,
            new MeasurementTransitionArgs(TotalPaidTjs: 2000m));

        Assert.Equal(LeadStatus.Installed, m.Status);
    }

    [Fact]
    public async Task Transition_ToInstalled_NoInstallationDate_Succeeds()
    {
        var m = NewMeasurement(LeadStatus.GlassArrived);
        m.DealPriceTjs = 1000m;
        m.InstallationDate = null;

        await _sut.TransitionAsync(m, LeadStatus.Installed,
            new MeasurementTransitionArgs(TotalPaidTjs: 1000m));

        Assert.Equal(LeadStatus.Installed, m.Status);
    }

    // ── Two measurements for same lead can have different statuses ────────────

    [Fact]
    public async Task TwoMeasurements_IndependentStatuses_BothValid()
    {
        var m1 = NewMeasurement(LeadStatus.New);
        var m2 = NewMeasurement(LeadStatus.New);

        await _sut.TransitionAsync(m1, LeadStatus.Measurement, new MeasurementTransitionArgs());
        await _sut.TransitionAsync(m2, LeadStatus.Refused,
            new MeasurementTransitionArgs(RefusalReasonId: Guid.NewGuid()));

        Assert.Equal(LeadStatus.Measurement, m1.Status);
        Assert.Equal(LeadStatus.Refused, m2.Status);
    }
}
