using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;

namespace Shisha.Application.Leads;

public sealed class LeadStatusTransitionService : ILeadStatusTransitionService
{
    private static readonly HashSet<(LeadStatus From, LeadStatus To)> AllowedTransitions =
    [
        (LeadStatus.New,              LeadStatus.Measurement),
        (LeadStatus.New,              LeadStatus.Refused),
        (LeadStatus.Measurement,      LeadStatus.Thinking),
        (LeadStatus.Measurement,      LeadStatus.Buying),
        (LeadStatus.Measurement,      LeadStatus.Refused),
        (LeadStatus.Thinking,         LeadStatus.Buying),
        (LeadStatus.Thinking,         LeadStatus.Refused),
        (LeadStatus.Buying,           LeadStatus.OrderedAtFactory),
        (LeadStatus.OrderedAtFactory, LeadStatus.GlassArrived),
        (LeadStatus.GlassArrived,     LeadStatus.Installed),
        (LeadStatus.Installed,        LeadStatus.Closed),
        (LeadStatus.Refused,          LeadStatus.New),
    ];

    public bool CanTransition(LeadStatus from, LeadStatus to)
        => from == to || AllowedTransitions.Contains((from, to));

    public Task TransitionAsync(
        Lead lead,
        LeadStatus to,
        LeadTransitionArgs args,
        CancellationToken ct = default)
    {
        if (lead.Status == to)
            return Task.CompletedTask;

        if (!CanTransition(lead.Status, to))
            throw new ConflictException(
                $"Transition {lead.Status} → {to} is not allowed.");

        ApplyTransition(lead, to, args);
        lead.Status = to;

        return Task.CompletedTask;
    }

    private static void ApplyTransition(Lead lead, LeadStatus to, LeadTransitionArgs args)
    {
        switch (to)
        {
            case LeadStatus.Thinking:
                if (args.MeasurementCount == 0)
                    throw new DomainValidationException("measurement",
                        "MEASUREMENT_REQUIRED: Lead must have at least one saved measurement.");
                break;

            case LeadStatus.Buying:
                if (args.MeasurementCount == 0)
                    throw new DomainValidationException("measurement",
                        "MEASUREMENT_REQUIRED: Lead must have at least one saved measurement.");
                if (!args.HasQualifyingMeasurementForBuying)
                    throw new DomainValidationException("deposit",
                        $"DEPOSIT_BELOW_MINIMUM: No measurement has both a deal price > 0 and a deposit of at least {LeadBusinessRules.MinDepositTjs} TJS.");
                break;

            case LeadStatus.Refused:
                if (args.RefusalReasonId is null)
                    throw new DomainValidationException("refusalReasonId", "Required for Refused status.");
                lead.RefusalReasonId = args.RefusalReasonId;
                lead.RefusalNote = args.RefusalNote;
                break;

            case LeadStatus.Installed:
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                if (args.LatestInstallationDate.HasValue && args.LatestInstallationDate.Value > today)
                    throw new DomainValidationException(
                        "installationDate",
                        $"Installation date {args.LatestInstallationDate} has not yet arrived.");
                if (args.TotalDealPriceTjs > 0 && args.TotalPaidTjs < args.TotalDealPriceTjs)
                    throw new DomainValidationException(
                        "balance",
                        $"BALANCE_NOT_PAID: Full payment required. Deal: {args.TotalDealPriceTjs:F2} TJS, Paid: {args.TotalPaidTjs:F2} TJS.");
                break;

            case LeadStatus.New:
                // Re-open from Refused: clear refusal data
                lead.RefusalReasonId = null;
                lead.RefusalNote = null;
                break;
        }
    }
}
