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
    ICurrentUser currentUser) : ILeadService
{
    private bool IsMeasurer => currentUser.Role == nameof(UserRole.Measurer);

    public async Task<PagedLeadsResponse> GetListAsync(LeadsQuery query, CancellationToken ct = default)
    {
        var q = db.Leads.AsQueryable();

        // Measurer: sees leads that have at least one measurement assigned to them
        // in Measurement or Buying status
        if (IsMeasurer)
            q = q.Where(l => l.Measurements.Any(m =>
                m.AssignedMeasurerId == currentUser.UserId
                && (m.Status == LeadStatus.Measurement || m.Status == LeadStatus.Buying)));

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

    public async Task<LeadDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var lead = await db.Leads
            .Include(l => l.Measurements)
                .ThenInclude(m => m.Payments)
            .Include(l => l.Measurements)
                .ThenInclude(m => m.AssignedMeasurer)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, ct)
            ?? throw new NotFoundException($"Lead {id} not found.");

        if (IsMeasurer && !lead.Measurements.Any(m =>
                m.AssignedMeasurerId == currentUser.UserId
                && (m.Status == LeadStatus.Measurement || m.Status == LeadStatus.Buying)))
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
            Product = request.Product,
            Source = request.Source,
            Note = request.Note,
            CallDate = request.CallDate,
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
        lead.Product = request.Product;
        lead.Source = request.Source;
        lead.Note = request.Note;
        lead.CallDate = request.CallDate;

        await db.SaveChangesAsync(ct);

        db.Entry(lead).State = EntityState.Detached;
        return await LoadLeadResponseAsync(id, ct);
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
            .Include(l => l.Measurements)
                .ThenInclude(m => m.Payments)
            .Include(l => l.Measurements)
                .ThenInclude(m => m.AssignedMeasurer)
            .AsNoTracking()
            .FirstAsync(l => l.Id == id, ct);

        return ToDetail(lead);
    }

    private static LeadSummaryResponse ToSummary(Lead l) => new(
        l.Id,
        l.Name,
        l.Phone,
        l.Product,
        l.Source,
        l.Note,
        l.CallDate,
        l.CreatedAt,
        l.UpdatedAt);

    private static LeadDetailResponse ToDetail(Lead l) => new(
        l.Id,
        l.Name,
        l.Phone,
        l.Product,
        l.Source,
        l.Note,
        l.CallDate,
        l.CreatedAt,
        l.UpdatedAt,
        l.Measurements
            .OrderByDescending(m => m.MeasuredAt)
            .Select(m =>
            {
                var totalPaid = m.Payments.Sum(p => p.AmountTjs);
                var balanceDue = m.DealPriceTjs.HasValue
                    ? m.DealPriceTjs.Value - totalPaid
                    : (decimal?)null;

                return new LeadMeasurementDto(
                    m.Id,
                    m.Address,
                    m.Status.ToString(),
                    m.GlassColor.ToString(),
                    m.HardwareColor.ToString(),
                    m.MeasureMm,
                    m.HeightMm,
                    m.DealPriceTjs,
                    m.DeliveryCostTjs,
                    m.InstallationDate,
                    m.WarrantyUntil,
                    totalPaid,
                    balanceDue,
                    m.AssignedMeasurer?.FullName,
                    m.MeasuredAt,
                    m.CreatedAt);
            })
            .ToList());
}
