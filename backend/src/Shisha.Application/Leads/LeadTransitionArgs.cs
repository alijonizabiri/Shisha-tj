namespace Shisha.Application.Leads;

public record LeadTransitionArgs(
    Guid? AssignedMeasurerId = null,
    string? Address = null,
    Guid? RefusalReasonId = null,
    string? RefusalNote = null,
    decimal? DealPriceTjs = null,
    DateOnly? PromisedInstallDate = null
);
