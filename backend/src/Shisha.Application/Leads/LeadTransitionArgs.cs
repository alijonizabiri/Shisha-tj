namespace Shisha.Application.Leads;

public record LeadTransitionArgs(
    Guid? AssignedMeasurerId = null,
    string? Address = null,
    Guid? RefusalReasonId = null,
    string? RefusalNote = null,
    decimal? DealPriceTjs = null,
    DateOnly? PromisedInstallDate = null,
    // Pre-fetched DB counts — caller (LeadService) populates before calling TransitionAsync
    int MeasurementCount = 0,
    decimal TotalDepositTjs = 0m,
    decimal TotalPaidTjs = 0m
);
