using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Application.Leads;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class LeadService(
    AppDbContext db,
    ICurrentUser currentUser,
    ILeadStatusTransitionService transitionService) : ILeadService
{
    private bool IsMeasurer => currentUser.Role == nameof(UserRole.Measurer);

    public async Task<PagedLeadsResponse> GetListAsync(LeadsQuery query, CancellationToken ct = default)
    {
        var q = db.Leads.Include(l => l.AssignedMeasurer).AsQueryable();

        if (IsMeasurer)
            q = q.Where(l => l.AssignedMeasurerId == currentUser.UserId
                          && (l.Status == LeadStatus.Measurement || l.Status == LeadStatus.Buying));

        if (!string.IsNullOrWhiteSpace(query.Status) && Enum.TryParse<LeadStatus>(query.Status, out var statusFilter))
            q = q.Where(l => l.Status == statusFilter);

        if (query.AssignedTo.HasValue)
            q = q.Where(l => l.AssignedMeasurerId == query.AssignedTo.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(l => l.Name.ToLower().Contains(s) || l.Phone.Contains(s));
        }

        if (query.From.HasValue)
            q = q.Where(l => l.CallDate >= query.From.Value);

        if (query.To.HasValue)
            q = q.Where(l => l.CallDate <= query.To.Value);

        var total = await q.CountAsync(ct);

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var items = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync(ct);

        return new PagedLeadsResponse(
            items.Select(ToSummary).ToList(),
            total,
            page,
            pageSize);
    }

    public async Task<KanbanResponse> GetKanbanAsync(CancellationToken ct = default)
    {
        var leads = await db.Leads
            .Include(l => l.AssignedMeasurer)
            .AsNoTracking()
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(ct);

        var columns = Enum.GetValues<LeadStatus>()
            .Select(status => new KanbanColumn(
                status.ToString(),
                leads.Where(l => l.Status == status).Select(ToSummary).ToList()))
            .ToList();

        return new KanbanResponse(columns);
    }

    public async Task<LeadDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var lead = await db.Leads
            .Include(l => l.AssignedMeasurer)
            .Include(l => l.Measurements)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, ct)
            ?? throw new NotFoundException($"Lead {id} not found.");

        if (IsMeasurer && (lead.AssignedMeasurerId != currentUser.UserId
            || (lead.Status != LeadStatus.Measurement && lead.Status != LeadStatus.Buying)))
            throw new NotFoundException($"Lead {id} not found.");

        return ToDetail(lead);
    }

    public async Task<LeadDetailResponse> CreateAsync(CreateLeadRequest request, CancellationToken ct = default)
    {
        var lead = new Lead
        {
            TenantId = currentUser.TenantId,
            Name = request.Name,
            Phone = request.Phone,
            Address = request.Address,
            Product = request.Product,
            Source = request.Source,
            Note = request.Note,
            CallDate = request.CallDate,
            Status = LeadStatus.New,
        };

        db.Leads.Add(lead);
        await db.SaveChangesAsync(ct);

        return await LoadLeadResponseAsync(lead.Id, ct);
    }

    public async Task<LeadDetailResponse> UpdateAsync(Guid id, UpdateLeadRequest request, CancellationToken ct = default)
    {
        var lead = await db.Leads.FindAsync([id], ct)
            ?? throw new NotFoundException($"Lead {id} not found.");

        lead.Name = request.Name;
        lead.Phone = request.Phone;
        lead.Address = request.Address;
        lead.Product = request.Product;
        lead.Source = request.Source;
        lead.Note = request.Note;
        lead.CallDate = request.CallDate;
        lead.PromisedInstallDate = request.PromisedInstallDate;

        await db.SaveChangesAsync(ct);

        db.Entry(lead).State = EntityState.Detached;
        return await LoadLeadResponseAsync(id, ct);
    }

    public async Task PatchStatusAsync(Guid id, PatchStatusRequest request, CancellationToken ct = default)
    {
        var lead = await db.Leads.FindAsync([id], ct)
            ?? throw new NotFoundException($"Lead {id} not found.");

        if (!Enum.TryParse<LeadStatus>(request.Status, ignoreCase: true, out var target))
            throw new DomainValidationException("status", $"Unknown status '{request.Status}'.");

        // Operators can only advance through Refused/Measurement/Thinking/Buying
        if (currentUser.Role == nameof(UserRole.Operator)
            && target is LeadStatus.OrderedAtFactory
                      or LeadStatus.GlassArrived
                      or LeadStatus.Installed
                      or LeadStatus.Closed)
            throw new ForbiddenException($"Operators cannot set status to {target}.");

        var args = new LeadTransitionArgs(
            AssignedMeasurerId: request.AssignedMeasurerId,
            Address: request.Address,
            RefusalReasonId: request.RefusalReasonId,
            RefusalNote: request.RefusalNote,
            DealPriceTjs: request.DealPriceTjs,
            PromisedInstallDate: request.PromisedInstallDate);

        // Payment side-effects (→ Buying, → Installed) will be added in Phase 3
        await transitionService.TransitionAsync(lead, target, args, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task AssignMeasurerAsync(Guid id, AssignMeasurerRequest request, CancellationToken ct = default)
    {
        var lead = await db.Leads.FindAsync([id], ct)
            ?? throw new NotFoundException($"Lead {id} not found.");

        // Global query filter ensures measurer belongs to the same tenant
        var measurer = await db.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId && u.Role == UserRole.Measurer, ct)
            ?? throw new NotFoundException($"Measurer {request.UserId} not found.");

        lead.AssignedMeasurerId = measurer.Id;
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var lead = await db.Leads.FindAsync([id], ct)
            ?? throw new NotFoundException($"Lead {id} not found.");

        db.Remove(lead);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<RefusalReasonDto>> GetRefusalReasonsAsync(CancellationToken ct = default)
    {
        return await db.RefusalReasons
            .AsNoTracking()
            .OrderBy(r => r.SortOrder)
            .Select(r => new RefusalReasonDto(r.Id, r.Label))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ProductDto>> GetProductsAsync(CancellationToken ct = default)
    {
        return await db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => new ProductDto(p.Id, p.Name, p.IsActive))
            .ToListAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<LeadDetailResponse> LoadLeadResponseAsync(Guid id, CancellationToken ct)
    {
        var lead = await db.Leads
            .Include(l => l.AssignedMeasurer)
            .Include(l => l.Measurements)
            .AsNoTracking()
            .FirstAsync(l => l.Id == id, ct);

        return ToDetail(lead);
    }

    private static LeadSummaryResponse ToSummary(Lead l) => new(
        l.Id,
        l.Name,
        l.Phone,
        l.Address,
        l.Product,
        l.Status.ToString(),
        l.Source,
        l.Note,
        l.RefusalReasonId,
        l.RefusalNote,
        l.CallDate,
        l.PromisedInstallDate,
        l.WarrantyUntil,
        l.AssignedMeasurerId,
        l.AssignedMeasurer?.FullName,
        l.DealPriceTjs,
        l.CreatedAt,
        l.UpdatedAt);

    private static LeadDetailResponse ToDetail(Lead l) => new(
        l.Id,
        l.Name,
        l.Phone,
        l.Address,
        l.Product,
        l.Status.ToString(),
        l.Source,
        l.Note,
        l.RefusalReasonId,
        l.RefusalNote,
        l.CallDate,
        l.PromisedInstallDate,
        l.WarrantyUntil,
        l.AssignedMeasurerId,
        l.AssignedMeasurer?.FullName,
        l.DealPriceTjs,
        l.CreatedAt,
        l.UpdatedAt,
        l.Measurements
            .OrderByDescending(m => m.MeasuredAt)
            .Select(m => new LeadMeasurementDto(
                m.Id,
                m.Configuration.ToString(),
                m.GlassColor.ToString(),
                m.HardwareColor.ToString(),
                m.MeasureMm,
                m.HeightMm,
                m.MeasuredAt,
                m.CreatedAt))
            .ToList());
}
