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

    // ── TransitionAsync — happy paths ───────────────────────────────────────

    [Fact]
    public async Task Transition_NewToMeasurement_Succeeds()
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
    public async Task Transition_ToBuying_Succeeds_WhenQualifyingMeasurementExists()
    {
        var lead = NewLead(LeadStatus.Measurement);

        await _sut.TransitionAsync(lead, LeadStatus.Buying,
            new LeadTransitionArgs(
                MeasurementCount: 1,
                HasQualifyingMeasurementForBuying: true));

        Assert.Equal(LeadStatus.Buying, lead.Status);
    }

    [Fact]
    public async Task Transition_InstalledToClosed_Succeeds()
    {
        var lead = NewLead(LeadStatus.Installed);

        await _sut.TransitionAsync(lead, LeadStatus.Closed, new LeadTransitionArgs());

        Assert.Equal(LeadStatus.Closed, lead.Status);
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

        await _sut.TransitionAsync(lead, LeadStatus.Buying, new LeadTransitionArgs());

        Assert.Equal(LeadStatus.Buying, lead.Status);
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
    public async Task Transition_ForbiddenTransition_ThrowsConflictException()
    {
        var lead = NewLead(LeadStatus.New);

        await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Buying, new LeadTransitionArgs()));
    }

    [Fact]
    public async Task Transition_GlassArrivedToInstalled_FutureInstallationDate_Throws()
    {
        var lead = NewLead(LeadStatus.GlassArrived);

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Installed,
                new LeadTransitionArgs(
                    LatestInstallationDate: DateOnly.FromDateTime(DateTime.UtcNow).AddDays(5))));

        Assert.True(ex.Errors.ContainsKey("installationDate"));
    }

    [Fact]
    public async Task Transition_GlassArrivedToInstalled_NoInstallationDate_Succeeds()
    {
        var lead = NewLead(LeadStatus.GlassArrived);

        await _sut.TransitionAsync(lead, LeadStatus.Installed,
            new LeadTransitionArgs(TotalDealPriceTjs: 1000m, TotalPaidTjs: 1000m));

        Assert.Equal(LeadStatus.Installed, lead.Status);
    }

    // ── Step 8 / Step 13: stricter transition guards ─────────────────────────

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
                new LeadTransitionArgs(MeasurementCount: 0, HasQualifyingMeasurementForBuying: false)));

        Assert.True(ex.Errors.ContainsKey("measurement"));
    }

    [Fact]
    public async Task Transition_ToBuying_NoQualifyingMeasurement_Throws()
    {
        var lead = NewLead(LeadStatus.Measurement);

        // Has measurement but no deal price or deposit
        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Buying,
                new LeadTransitionArgs(MeasurementCount: 1, HasQualifyingMeasurementForBuying: false)));

        Assert.True(ex.Errors.ContainsKey("deposit"));
        Assert.Contains("DEPOSIT_BELOW_MINIMUM", ex.Errors["deposit"][0]);
    }

    [Fact]
    public async Task Transition_ToBuying_QualifyingMeasurementExists_Succeeds()
    {
        var lead = NewLead(LeadStatus.Measurement);

        await _sut.TransitionAsync(lead, LeadStatus.Buying,
            new LeadTransitionArgs(
                MeasurementCount: 1,
                HasQualifyingMeasurementForBuying: true));

        Assert.Equal(LeadStatus.Buying, lead.Status);
    }

    [Fact]
    public async Task Transition_ToInstalled_BalanceNotPaid_Throws()
    {
        var lead = NewLead(LeadStatus.GlassArrived);

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Installed,
                new LeadTransitionArgs(TotalDealPriceTjs: 2000m, TotalPaidTjs: 1000m)));

        Assert.True(ex.Errors.ContainsKey("balance"));
        Assert.Contains("BALANCE_NOT_PAID", ex.Errors["balance"][0]);
    }

    [Fact]
    public async Task Transition_ToInstalled_FullyPaid_Succeeds()
    {
        var lead = NewLead(LeadStatus.GlassArrived);

        await _sut.TransitionAsync(lead, LeadStatus.Installed,
            new LeadTransitionArgs(TotalDealPriceTjs: 2000m, TotalPaidTjs: 2000m));

        Assert.Equal(LeadStatus.Installed, lead.Status);
    }

    [Fact]
    public async Task Transition_ToBuying_MultipleMeasurements_OneQualifies_Succeeds()
    {
        // Lead has 2 measurements: one with dealPrice=0, one with dealPrice=5000 and deposit=100
        var lead = NewLead(LeadStatus.Measurement);

        await _sut.TransitionAsync(lead, LeadStatus.Buying,
            new LeadTransitionArgs(
                MeasurementCount: 2,
                HasQualifyingMeasurementForBuying: true));  // computed in LeadService

        Assert.Equal(LeadStatus.Buying, lead.Status);
    }

    [Fact]
    public async Task Transition_ToBuying_MultipleMeasurements_NoneQualify_Throws()
    {
        var lead = NewLead(LeadStatus.Measurement);

        var ex = await Assert.ThrowsAsync<DomainValidationException>(() =>
            _sut.TransitionAsync(lead, LeadStatus.Buying,
                new LeadTransitionArgs(
                    MeasurementCount: 2,
                    HasQualifyingMeasurementForBuying: false)));

        Assert.True(ex.Errors.ContainsKey("deposit"));
    }
}
