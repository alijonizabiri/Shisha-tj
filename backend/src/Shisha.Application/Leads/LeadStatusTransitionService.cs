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
            case LeadStatus.Measurement:
                if (!string.IsNullOrWhiteSpace(args.Address))
                    lead.Address = args.Address;
                break;

            case LeadStatus.Thinking:
                if (args.MeasurementCount == 0)
                    throw new DomainValidationException("measurement",
                        "MEASUREMENT_REQUIRED: Lead must have at least one saved measurement.");
                break;

            case LeadStatus.Buying:
                if (args.MeasurementCount == 0)
                    throw new DomainValidationException("measurement",
                        "MEASUREMENT_REQUIRED: Lead must have at least one saved measurement.");
                if (args.DealPriceTjs is null or <= 0)
                    throw new DomainValidationException("dealPriceTjs",
                        "DEAL_PRICE_REQUIRED: Deal price must be greater than zero.");
                if (args.TotalDepositTjs < LeadBusinessRules.MinDepositTjs)
                    throw new DomainValidationException("deposit",
                        $"DEPOSIT_BELOW_MINIMUM: Deposit must be at least {LeadBusinessRules.MinDepositTjs} TJS. Current: {args.TotalDepositTjs:F2} TJS.");
                lead.DealPriceTjs = args.DealPriceTjs;
                if (args.PromisedInstallDate.HasValue)
                    lead.PromisedInstallDate = args.PromisedInstallDate;
                break;

            case LeadStatus.Refused:
                if (args.RefusalReasonId is null)
                    throw new DomainValidationException("refusalReasonId", "Required for Refused status.");
                lead.RefusalReasonId = args.RefusalReasonId;
                lead.RefusalNote = args.RefusalNote;
                break;

            case LeadStatus.Installed:
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                if (lead.PromisedInstallDate.HasValue && lead.PromisedInstallDate.Value > today)
                    throw new DomainValidationException(
                        "promisedInstallDate",
                        $"Promised install date {lead.PromisedInstallDate} has not yet arrived.");
                if (lead.DealPriceTjs.HasValue && args.TotalPaidTjs < lead.DealPriceTjs.Value)
                    throw new DomainValidationException(
                        "balance",
                        $"BALANCE_NOT_PAID: Full payment required. Deal: {lead.DealPriceTjs.Value:F2} TJS, Paid: {args.TotalPaidTjs:F2} TJS.");
                break;

            case LeadStatus.Closed:
                lead.WarrantyUntil = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(1);
                break;

            case LeadStatus.New:
                // Re-open from Refused: clear refusal data
                lead.RefusalReasonId = null;
                lead.RefusalNote = null;
                break;
        }
    }
}
