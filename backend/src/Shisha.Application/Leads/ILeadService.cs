namespace Shisha.Application.Leads;

public interface ILeadService
{
    Task<PagedLeadsResponse> GetListAsync(LeadsQuery query, CancellationToken ct = default);
    Task<KanbanResponse> GetKanbanAsync(CancellationToken ct = default);
    Task<LeadSummaryResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<LeadSummaryResponse> CreateAsync(CreateLeadRequest request, CancellationToken ct = default);
    Task<LeadSummaryResponse> UpdateAsync(Guid id, UpdateLeadRequest request, CancellationToken ct = default);
    Task PatchStatusAsync(Guid id, PatchStatusRequest request, CancellationToken ct = default);
    Task AssignMeasurerAsync(Guid id, AssignMeasurerRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
