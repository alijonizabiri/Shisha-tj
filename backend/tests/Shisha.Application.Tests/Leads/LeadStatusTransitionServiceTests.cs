using Shisha.Application.Leads;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;

namespace Shisha.Application.Tests.Leads;

public sealed class LeadStatusTransitionServiceTests
{
    private readonly LeadStatusTransitionService _sut = new();

    private static Lead NewLead(LeadStatus status = LeadStatus.New) => new()
    {
        Name = "Test User",
        Phone = "+992000000000",
        Product = "Душевая кабина",
        CallDate = DateOnly.FromDateTime(DateTime.UtcNow),
        Status = status,
        TenantId = Guid.NewGuid(),
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
    [InlineData(LeadStatus.New,         LeadStatus.New)]
    [InlineData(LeadStatus.Buying,      LeadStatus.Buying)]
    [InlineData(LeadStatus.Closed,      LeadStatus.Closed)]
    public void CanTransition_SameStatus_ReturnsTrue(LeadStatus from, LeadStatus to)
        => Assert.True(_sut.CanTransition(from, to));

    [Theory]
    [InlineData(LeadStatus.New,     LeadStatus.Buying)]      // skip two steps
    [InlineData(LeadStatus.New,     LeadStatus.Closed)]      // skip to end
    [InlineData(LeadStatus.Closed,  LeadStatus.Installed)]   // back from terminal
    [InlineData(LeadStatus.Closed,  LeadStatus.New)]
    [InlineData(LeadStatus.Installed, LeadStatus.New)]       // backwards
    [InlineData(LeadStatus.Buying,  LeadStatus.Measurement)] // backwards
    public void CanTransition_ForbiddenTransitions_ReturnsFalse(LeadStatus from, LeadStatus to)
        => Assert.False(_sut.CanTransition(from, to));

    // ── TransitionAsync — happy paths ───────────────────────────────────────

    [Fact]
    public async Task Transition_NewToMeasurement_SetsAddress()
    {
        var lead = NewLead();

        await _sut.TransitionAsync(lead, LeadStatus.Measurement,
            new LeadTransitionArgs(Address: "ул. Рудаки 1"));

        Assert.Equal(LeadStatus.Measurement, lead.Status);
        Assert.Equal("ул. Рудаки 1", lead.Address);
    }

    [Fact]
    public async Task Transition_NewToMeasurement_WithoutAddress_StillSucceeds()
    {
        var lead = NewLead();

        await _sut.TransitionAsync(lead, LeadStatus.Measurement, new LeadTransitionArgs());

        Assert.Equal(LeadStatus.Measurement, lead.Status);
    }

    [Fact]
    public async Task Transition_ToRefused_SetsRefusalFields()
    {
        var lead = NewLead();
        var reasonId = Guid.NewGuid();

        await _sut.TransitionAsync(lead, LeadStatus.Refused,
            new LeadTransitionArgs(RefusalReasonId: reasonId, RefusalNote: "Дорого"));

        Assert.Equal(LeadStatus.Refused, lead.Status);
        Assert.Equal(reasonId, lead.RefusalReasonId);
        Assert.Equal("Дорого", lead.RefusalNote);
    }

    [Fact]
    public async Task Transition_ToBuying_SetsDealPrice()
    {
        var lead = NewLead(LeadStatus.Measurement);

        await _sut.TransitionAsync(lead, LeadStatus.Buying,
            new LeadTransitionArgs(
                DealPriceTjs: 1500.00m,
                PromisedInstallDate: DateOnly.FromDateTime(DateTime.UtcNow),
                MeasurementCount: 1,
                TotalDepositTjs: LeadBusinessRules.MinDepositTjs));

        Assert.Equal(LeadStatus.Buying, lead.Status);
        Assert.Equal(1500.00m, lead.DealPriceTjs);
    }

    [Fact]
    public async Task Transition_InstalledToClosed_SetsWarrantyUntil()
    {
        var lead = NewLead(LeadStatus.Installed);

        await _sut.TransitionAsync(lead, LeadStatus.Closed, new LeadTransitionArgs());

        Assert.Equal(LeadStatus.Closed, lead.Status);
        Assert.NotNull(lead.WarrantyUntil);
        Assert.True(lead.WarrantyUntil!.Value >= DateOnly.FromDateTime(DateTime.UtcNow).AddYears(1).AddDays(-1));
    }

    [Fact]
    public async Task Transition_RefusedToNew_ClearsRefusalData()
    {
        var lead = NewLead(LeadStatus.Refused);
        lead.RefusalReasonId = Guid.NewGuid();
        lead.RefusalNote = "Дорого";

        await _sut.TransitionAsync(lead, LeadStatus.New, new LeadTransitionArgs());

        Assert.Equal(LeadStatus.New, lead.Status);
        Assert.Null(lead.RefusalReasonId);
        Assert.Null(lead.RefusalNote);
    }

    [Fact]
    public async Task Transition_SameStatus_IsNoOp()
    {
        var lead = NewLead(LeadStatus.Buying);
        lead.DealPriceTjs = 1000m;

        await _sut.TransitionAsync(lead, LeadStatus.Buying, new LeadTransitionArgs());

        Assert.Equal(LeadStatus.Buying, lead.Status);
        Assert.Equal(1000m, lead.DealPriceTjs);
    }

    // ── TransitionAsync — validation errors ──────────────────────────────────

    [Fact]
    public async Task Transition_ToRefused_MissingReasonId_Throws()
    {
        var lead = NewLead();

        await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Refused, new LeadTransitionArgs()));
    }

    [Fact]
    public async Task Transition_ToBuying_MissingDealPrice_Throws()
    {
        var lead = NewLead(LeadStatus.Measurement);

        await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Buying, new LeadTransitionArgs()));
    }

    [Fact]
    public async Task Transition_ForbiddenTransition_ThrowsConflictException()
    {
        var lead = NewLead(LeadStatus.New);

        await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Buying, new LeadTransitionArgs()));
    }

    [Fact]
    public async Task Transition_GlassArrivedToInstalled_FuturePromisedDate_Throws()
    {
        var lead = NewLead(LeadStatus.GlassArrived);
        lead.PromisedInstallDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(5);

        await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Installed, new LeadTransitionArgs()));
    }

    [Fact]
    public async Task Transition_GlassArrivedToInstalled_NoPromisedDate_Succeeds()
    {
        var lead = NewLead(LeadStatus.GlassArrived);
        lead.PromisedInstallDate = null;
        lead.DealPriceTjs = 1000m;

        await _sut.TransitionAsync(lead, LeadStatus.Installed,
            new LeadTransitionArgs(TotalPaidTjs: 1000m));

        Assert.Equal(LeadStatus.Installed, lead.Status);
    }

    // ── Step 8: stricter transition guards ──────────────────────────────────────

    [Fact]
    public async Task Transition_ToThinking_NoMeasurement_Throws()
    {
        var lead = NewLead(LeadStatus.Measurement);

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Thinking,
                new LeadTransitionArgs(MeasurementCount: 0)));

        Assert.True(ex.Errors.ContainsKey("measurement"));
    }

    [Fact]
    public async Task Transition_ToBuying_NoMeasurement_Throws()
    {
        var lead = NewLead(LeadStatus.Measurement);

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Buying,
                new LeadTransitionArgs(DealPriceTjs: 1000m, MeasurementCount: 0, TotalDepositTjs: 100m)));

        Assert.True(ex.Errors.ContainsKey("measurement"));
    }

    [Fact]
    public async Task Transition_ToBuying_DepositTooLow_Throws()
    {
        var lead = NewLead(LeadStatus.Measurement);

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Buying,
                new LeadTransitionArgs(DealPriceTjs: 1000m, MeasurementCount: 1, TotalDepositTjs: 50m)));

        Assert.True(ex.Errors.ContainsKey("deposit"));
        Assert.Contains("DEPOSIT_BELOW_MINIMUM", ex.Errors["deposit"][0]);
    }

    [Fact]
    public async Task Transition_ToBuying_ExactMinimumDeposit_Succeeds()
    {
        var lead = NewLead(LeadStatus.Measurement);

        await _sut.TransitionAsync(lead, LeadStatus.Buying,
            new LeadTransitionArgs(
                DealPriceTjs: 1000m,
                MeasurementCount: 1,
                TotalDepositTjs: LeadBusinessRules.MinDepositTjs));

        Assert.Equal(LeadStatus.Buying, lead.Status);
    }

    [Fact]
    public async Task Transition_ToInstalled_BalanceNotPaid_Throws()
    {
        var lead = NewLead(LeadStatus.GlassArrived);
        lead.DealPriceTjs = 2000m;

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Installed,
                new LeadTransitionArgs(TotalPaidTjs: 1000m)));

        Assert.True(ex.Errors.ContainsKey("balance"));
        Assert.Contains("BALANCE_NOT_PAID", ex.Errors["balance"][0]);
    }

    [Fact]
    public async Task Transition_ToInstalled_FullyPaid_Succeeds()
    {
        var lead = NewLead(LeadStatus.GlassArrived);
        lead.DealPriceTjs = 2000m;

        await _sut.TransitionAsync(lead, LeadStatus.Installed,
            new LeadTransitionArgs(TotalPaidTjs: 2000m));

        Assert.Equal(LeadStatus.Installed, lead.Status);
    }
}
