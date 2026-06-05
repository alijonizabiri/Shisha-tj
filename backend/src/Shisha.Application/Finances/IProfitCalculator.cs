namespace Shisha.Application.Finances;

public interface IProfitCalculator
{
    Task<LeadFinancesDto> CalculateAsync(Guid leadId, CancellationToken ct = default);
}
