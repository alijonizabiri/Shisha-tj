using Shisha.Domain.Entities;
using Shisha.Domain.Enums;

namespace Shisha.Application.Leads;

public interface ILeadStatusTransitionService
{
    bool CanTransition(LeadStatus from, LeadStatus to);

    /// <summary>
    /// Validates the transition, applies state mutations to <paramref name="lead"/>,
    /// and sets <see cref="Lead.Status"/> to <paramref name="to"/>.
    /// Payment creation for → Buying / → Installed is the caller's responsibility.
    /// Throws <see cref="Shisha.Domain.Exceptions.ConflictException"/> if the transition is forbidden.
    /// Throws <see cref="Shisha.Domain.Exceptions.DomainValidationException"/> if required args are missing.
    /// </summary>
    Task TransitionAsync(
        Lead lead,
        LeadStatus to,
        LeadTransitionArgs args,
        CancellationToken ct = default);
}
