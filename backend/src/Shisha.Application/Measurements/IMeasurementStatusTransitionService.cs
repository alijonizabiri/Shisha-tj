using Shisha.Domain.Entities;
using Shisha.Domain.Enums;

namespace Shisha.Application.Measurements;

public interface IMeasurementStatusTransitionService
{
    bool CanTransition(LeadStatus from, LeadStatus to);

    Task TransitionAsync(
        Measurement measurement,
        LeadStatus to,
        MeasurementTransitionArgs args,
        CancellationToken ct = default);
}
