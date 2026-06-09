namespace Shisha.Application.Leads;

public record LeadTransitionArgs(
    Guid? AssignedMeasurerId = null,
    Guid? RefusalReasonId = null,
    string? RefusalNote = null,
    // Pre-fetched DB state — caller (LeadService) populates before calling TransitionAsync
    int MeasurementCount = 0,
    bool HasQualifyingMeasurementForBuying = false,
    decimal TotalDealPriceTjs = 0m,
    decimal TotalPaidTjs = 0m,
    DateOnly? LatestInstallationDate = null
);
