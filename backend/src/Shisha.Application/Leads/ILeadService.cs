namespace Shisha.Application.Leads;

public interface ILeadService
{
    Task<PagedLeadsResponse> GetListAsync(LeadsQuery query, CancellationToken ct = default);
    Task<KanbanResponse> GetKanbanAsync(CancellationToken ct = default);
    Task<LeadDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<LeadDetailResponse> CreateAsync(CreateLeadRequest request, CancellationToken ct = default);
    Task<LeadDetailResponse> UpdateAsync(Guid id, UpdateLeadRequest request, CancellationToken ct = default);
    Task PatchStatusAsync(Guid id, PatchStatusRequest request, CancellationToken ct = default);
    Task AssignMeasurerAsync(Guid id, AssignMeasurerRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<RefusalReasonDto>> GetRefusalReasonsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ProductDto>> GetProductsAsync(CancellationToken ct = default);
}
