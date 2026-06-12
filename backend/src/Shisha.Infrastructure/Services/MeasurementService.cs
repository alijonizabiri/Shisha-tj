using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Application.Designer;
using Shisha.Application.Measurements;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class MeasurementService(
    AppDbContext db,
    ICurrentUser currentUser,
    IMeasurementStatusTransitionService transitionService) : IMeasurementService
{
    private const string DefaultAddress = "Не указан";

    private bool IsMeasurer => currentUser.Role == nameof(UserRole.Measurer);

    // ── Kanban ────────────────────────────────────────────────────────────────

    public async Task<MeasurementKanbanResponse> GetKanbanAsync(CancellationToken ct = default)
    {
        var measurements = await db.Measurements
            .Include(m => m.Lead)
            .Include(m => m.AssignedMeasurer)
            .Include(m => m.Payments)
            .AsNoTracking()
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(ct);

        if (IsMeasurer)
        {
            measurements = measurements
                .Where(m => m.AssignedMeasurerId == currentUser.UserId
                         && (m.Status == LeadStatus.Measurement || m.Status == LeadStatus.Buying))
                .ToList();
        }

        var columns = Enum.GetValues<LeadStatus>()
            .Select(status => new MeasurementKanbanColumn(
                status.ToString(),
                measurements
                    .Where(m => m.Status == status)
                    .Select(m => new MeasurementKanbanItemResponse(
                        m.Id,
                        m.LeadId,
                        m.Lead?.Name ?? string.Empty,
                        m.Lead?.Phone ?? string.Empty,
                        m.Lead?.Product ?? string.Empty,
                        m.Status.ToString(),
                        m.AssignedMeasurer?.FullName,
                        m.DealPriceTjs,
                        m.Payments.Sum(p => p.AmountTjs),
                        m.InstallationDate,
                        m.CreatedAt))
                    .ToList()))
            .ToList();

        return new MeasurementKanbanResponse(columns);
    }

    // ── Status transition ─────────────────────────────────────────────────────

    public async Task PatchStatusAsync(
        Guid id,
        PatchMeasurementStatusRequest request,
        CancellationToken ct = default)
    {
        var measurement = await db.Measurements.FindAsync([id], ct)
            ?? throw new NotFoundException($"Measurement {id} not found.");

        if (!Enum.TryParse<LeadStatus>(request.Status, ignoreCase: true, out var target))
            throw new DomainValidationException("status", $"Unknown status '{request.Status}'.");

        if (currentUser.Role == nameof(UserRole.Operator)
            && target is LeadStatus.OrderedAtFactory
                      or LeadStatus.GlassArrived
                      or LeadStatus.Installed
                      or LeadStatus.Closed)
            throw new ForbiddenException($"Operators cannot set status to {target}.");

        var glassCount = await db.Glasses.CountAsync(g => g.MeasurementId == id, ct);

        var depositSum = await db.Payments
            .Where(p => p.MeasurementId == id && p.Kind == PaymentKind.Deposit)
            .SumAsync(p => (decimal?)p.AmountTjs, ct) ?? 0m;

        var totalPaid = await db.Payments
            .Where(p => p.MeasurementId == id)
            .SumAsync(p => p.AmountTjs, ct);

        var args = new MeasurementTransitionArgs(
            RefusalReasonId: request.RefusalReasonId,
            RefusalNote: request.RefusalNote,
            GlassCount: glassCount,
            DepositSumTjs: depositSum,
            TotalPaidTjs: totalPaid);

        await transitionService.TransitionAsync(measurement, target, args, ct);

        if (target == LeadStatus.Closed)
            measurement.WarrantyUntil = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(1);

        await db.SaveChangesAsync(ct);
    }

    // ── Assign measurer ───────────────────────────────────────────────────────

    public async Task AssignMeasurerAsync(
        Guid id,
        AssignMeasurerRequest request,
        CancellationToken ct = default)
    {
        var measurement = await db.Measurements.FindAsync([id], ct)
            ?? throw new NotFoundException($"Measurement {id} not found.");

        var measurer = await db.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId && u.Role == UserRole.Measurer, ct)
            ?? throw new NotFoundException($"Measurer {request.UserId} not found.");

        measurement.AssignedMeasurerId = measurer.Id;
        await db.SaveChangesAsync(ct);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<MeasurementResponse> CreateAsync(
        CreateMeasurementRequest request,
        CancellationToken ct = default)
    {
        var glassColor = ParseEnum<GlassColor>(request.GlassColor, "glassColor");
        var hardwareColor = ParseEnum<HardwareColor>(request.HardwareColor, "hardwareColor");
        var handleSide = ParseEnum<HandleSide>(request.HandleSide ?? "Right", "handleSide");

        ValidateRange(request.MeasureMm, 600, 3000, "measureMm");
        ValidateRange(request.HeightMm, 1500, 2500, "heightMm");

        if (request.LeadId.HasValue)
        {
            if (!await db.Leads.AnyAsync(l => l.Id == request.LeadId.Value, ct))
                throw new NotFoundException($"Lead {request.LeadId.Value} not found.");
        }

        IReadOnlyList<PanelInputDto> panels;
        if (request.Panels is null or [])
        {
            panels = PanelComputer.ComputeInitial(request.MeasureMm, request.HeightMm)
                .Select(p => new PanelInputDto(p.Position, p.WidthMm, p.HeightMm, p.IsDoor))
                .ToList();
        }
        else
        {
            panels = request.Panels;
            ValidatePanels(panels, request.HeightMm);
        }

        var measurement = new Measurement
        {
            MeasurerId = currentUser.IsAuthenticated ? currentUser.UserId : null,
            LeadId = request.LeadId,
            Address = string.IsNullOrWhiteSpace(request.Address) ? DefaultAddress : request.Address,
            MeasureMm = request.MeasureMm,
            HeightMm = request.HeightMm,
            GlassColor = glassColor,
            HardwareColor = hardwareColor,
            HandleSide = handleSide,
            DealPriceTjs = request.DealPriceTjs,
            DeliveryCostTjs = request.DeliveryCostTjs,
            InstallationDate = request.InstallationDate,
            MeasuredAt = DateTime.UtcNow,
        };
        db.Measurements.Add(measurement);

        var glasses = CreateGlasses(measurement.Id, panels);
        AddHoles(glasses, request.Holes);

        await db.SaveChangesAsync(ct);
        return await LoadResponseAsync(measurement.Id, ct);
    }

    public async Task<MeasurementResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        if (!await db.Measurements.AnyAsync(m => m.Id == id, ct))
            throw new NotFoundException($"Measurement {id} not found.");

        return await LoadResponseAsync(id, ct);
    }

    public async Task<MeasurementResponse> UpdateAsync(
        Guid id,
        UpdateMeasurementRequest request,
        CancellationToken ct = default)
    {
        var measurement = await db.Measurements.FindAsync([id], ct)
            ?? throw new NotFoundException($"Measurement {id} not found.");

        var glassColor = ParseEnum<GlassColor>(request.GlassColor, "glassColor");
        var hardwareColor = ParseEnum<HardwareColor>(request.HardwareColor, "hardwareColor");
        var handleSide = ParseEnum<HandleSide>(request.HandleSide ?? "Right", "handleSide");

        ValidateRange(request.MeasureMm, 600, 3000, "measureMm");
        ValidateRange(request.HeightMm, 1500, 2500, "heightMm");
        ValidatePanels(request.Panels, request.HeightMm);

        var oldGlasses = await db.Glasses
            .Include(g => g.Holes)
            .Where(g => g.MeasurementId == id)
            .ToListAsync(ct);

        foreach (var glass in oldGlasses)
        {
            foreach (var hole in glass.Holes)
                db.Remove(hole);
            db.Remove(glass);
        }

        measurement.MeasureMm = request.MeasureMm;
        measurement.HeightMm = request.HeightMm;
        measurement.GlassColor = glassColor;
        measurement.HardwareColor = hardwareColor;
        measurement.HandleSide = handleSide;

        if (!string.IsNullOrWhiteSpace(request.Address))
            measurement.Address = request.Address;
        if (request.DealPriceTjs.HasValue)
            measurement.DealPriceTjs = request.DealPriceTjs;
        if (request.DeliveryCostTjs.HasValue)
            measurement.DeliveryCostTjs = request.DeliveryCostTjs;
        if (request.InstallationDate.HasValue)
            measurement.InstallationDate = request.InstallationDate;

        var glasses = CreateGlasses(measurement.Id, request.Panels);
        AddHoles(glasses, request.Holes);

        await db.SaveChangesAsync(ct);
        return await LoadResponseAsync(measurement.Id, ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static void ValidatePanels(IReadOnlyList<PanelInputDto> panels, int cabinHeightMm)
    {
        int doorCount = panels.Count(p => p.IsDoor);
        if (doorCount > 1)
            throw new DomainValidationException("panels", "At most one door panel is allowed.");

        foreach (var p in panels)
        {
            var minWidth = p.IsDoor ? 500 : 200;
            var maxWidth = p.IsDoor ? 800 : 3000;

            if (p.WidthMm < minWidth || p.WidthMm > maxWidth)
                throw new DomainValidationException(
                    "panels",
                    $"Panel {p.Position}: widthMm={p.WidthMm} out of range [{minWidth}, {maxWidth}].");

            if (p.HeightMm < 200 || p.HeightMm > cabinHeightMm)
                throw new DomainValidationException(
                    "panels",
                    $"Panel {p.Position}: heightMm={p.HeightMm} must be between 200 and cabin height ({cabinHeightMm}).");
        }
    }

    private List<Glass> CreateGlasses(Guid measurementId, IReadOnlyList<PanelInputDto> panels)
    {
        var glasses = new List<Glass>(panels.Count);
        foreach (var panel in panels)
        {
            var glass = new Glass
            {
                MeasurementId = measurementId,
                Position = panel.Position,
                IsDoor = panel.IsDoor,
                WidthMm = panel.WidthMm,
                HeightMm = panel.HeightMm,
            };
            db.Glasses.Add(glass);
            glasses.Add(glass);
        }
        return glasses;
    }

    private void AddHoles(List<Glass> glasses, IReadOnlyList<HoleRequest>? holes)
    {
        if (holes is null or []) return;

        foreach (var req in holes)
        {
            var glass = glasses.FirstOrDefault(g => g.Position == req.PanelIndex);
            if (glass is null) continue;

            var holeType = ParseEnum<HoleType>(req.HoleType, "holes.holeType");
            db.Holes.Add(new Hole
            {
                GlassId = glass.Id,
                XMm = req.XMm,
                YMm = req.YMm,
                RadiusMm = req.RadiusMm,
                HoleType = holeType,
            });
        }
    }

    private async Task<MeasurementResponse> LoadResponseAsync(Guid id, CancellationToken ct)
    {
        var m = await db.Measurements
            .AsNoTracking()
            .Include(m => m.Glasses)
                .ThenInclude(g => g.Holes)
            .Include(m => m.AssignedMeasurer)
            .FirstAsync(m => m.Id == id, ct);

        return new MeasurementResponse(
            m.Id,
            m.MeasurerId,
            m.LeadId,
            m.Address,
            m.Status.ToString(),
            m.AssignedMeasurerId,
            m.AssignedMeasurer?.FullName,
            m.RefusalReasonId,
            m.RefusalNote,
            m.MeasureMm,
            m.HeightMm,
            m.GlassColor.ToString(),
            m.HardwareColor.ToString(),
            m.HandleSide.ToString(),
            m.DealPriceTjs,
            m.DeliveryCostTjs,
            m.InstallationDate,
            m.WarrantyUntil,
            m.MeasuredAt,
            m.CreatedAt,
            m.Glasses
                .OrderBy(g => g.Position)
                .Select(g => new GlassResponse(
                    g.Id,
                    g.Position,
                    g.IsDoor,
                    g.WidthMm,
                    g.HeightMm,
                    g.Holes
                        .Select(h => new HoleResponse(h.Id, h.XMm, h.YMm, h.RadiusMm, h.HoleType.ToString()))
                        .ToList()))
                .ToList());
    }

    private static T ParseEnum<T>(string value, string field) where T : struct, Enum
    {
        if (!Enum.TryParse<T>(value, ignoreCase: true, out var result))
            throw new DomainValidationException(field, $"Invalid value '{value}' for {typeof(T).Name}.");
        return result;
    }

    private static void ValidateRange(int value, int min, int max, string field)
    {
        if (value < min || value > max)
            throw new DomainValidationException(field, $"Must be between {min} and {max}.");
    }
}
