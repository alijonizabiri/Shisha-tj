using Shisha.Application.Leads;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;

namespace Shisha.Application.Measurements;

public sealed class MeasurementStatusTransitionService : IMeasurementStatusTransitionService
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
        Measurement measurement,
        LeadStatus to,
        MeasurementTransitionArgs args,
        CancellationToken ct = default)
    {
        if (measurement.Status == to)
            return Task.CompletedTask;

        if (!CanTransition(measurement.Status, to))
            throw new ConflictException(
                $"Transition {measurement.Status} → {to} is not allowed.");

        ApplyTransition(measurement, to, args);
        measurement.Status = to;

        return Task.CompletedTask;
    }

    private static void ApplyTransition(Measurement measurement, LeadStatus to, MeasurementTransitionArgs args)
    {
        switch (to)
        {
            case LeadStatus.Thinking:
                if (args.GlassCount == 0)
                    throw new DomainValidationException("glasses",
                        "GLASSES_REQUIRED: Measurement must have at least one glass panel.");
                break;

            case LeadStatus.Buying:
                if (measurement.DealPriceTjs is null or <= 0)
                    throw new DomainValidationException("dealPrice",
                        "DEAL_PRICE_REQUIRED: Measurement must have a deal price greater than 0.");
                if (args.DepositSumTjs < LeadBusinessRules.MinDepositTjs)
                    throw new DomainValidationException("deposit",
                        $"DEPOSIT_BELOW_MINIMUM: A deposit of at least {LeadBusinessRules.MinDepositTjs} TJS is required.");
                break;

            case LeadStatus.Refused:
                if (args.RefusalReasonId is null)
                    throw new DomainValidationException("refusalReasonId", "Required for Refused status.");
                measurement.RefusalReasonId = args.RefusalReasonId;
                measurement.RefusalNote = args.RefusalNote;
                break;

            case LeadStatus.Installed:
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                if (measurement.InstallationDate.HasValue && measurement.InstallationDate.Value > today)
                    throw new DomainValidationException(
                        "installationDate",
                        $"Installation date {measurement.InstallationDate} has not yet arrived.");
                if (measurement.DealPriceTjs > 0 && args.TotalPaidTjs < measurement.DealPriceTjs)
                    throw new DomainValidationException(
                        "balance",
                        $"BALANCE_NOT_PAID: Full payment required. Deal: {measurement.DealPriceTjs:F2} TJS, Paid: {args.TotalPaidTjs:F2} TJS.");
                break;

            case LeadStatus.New:
                // Re-open from Refused: clear refusal data
                measurement.RefusalReasonId = null;
                measurement.RefusalNote = null;
                break;
        }
    }
}
