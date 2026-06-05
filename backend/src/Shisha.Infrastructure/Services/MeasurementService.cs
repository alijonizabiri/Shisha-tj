using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Application.Designer;
using Shisha.Application.Measurements;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class MeasurementService(AppDbContext db, ICurrentUser currentUser) : IMeasurementService
{
    public async Task<MeasurementResponse> CreateAsync(
        CreateMeasurementRequest request,
        CancellationToken ct = default)
    {
        var config = ParseEnum<CabinConfiguration>(request.Configuration, "configuration");
        var glassColor = ParseEnum<GlassColor>(request.GlassColor, "glassColor");
        var hardwareColor = ParseEnum<HardwareColor>(request.HardwareColor, "hardwareColor");
        var handleSide = ParseEnum<HandleSide>(request.HandleSide ?? "Right", "handleSide");

        ValidateRange(request.MeasureMm, 600, 3000, "measureMm");
        ValidateRange(request.HeightMm, 1500, 2500, "heightMm");

        if (request.LeadId.HasValue)
        {
            var lead = await db.Leads.FindAsync([request.LeadId.Value], ct)
                ?? throw new NotFoundException($"Lead {request.LeadId.Value} not found.");

            if (lead.Status is not (LeadStatus.Measurement or LeadStatus.Buying
                    or LeadStatus.OrderedAtFactory or LeadStatus.GlassArrived))
                throw new DomainValidationException(
                    "leadId",
                    $"Lead must be in Measurement, Buying, OrderedAtFactory, or GlassArrived status. Got: {lead.Status}.");
        }

        var panels = PanelComputer.Compute(request.MeasureMm, request.HeightMm, config);

        var measurement = new Measurement
        {
            MeasurerId = currentUser.IsAuthenticated ? currentUser.UserId : null,
            LeadId = request.LeadId,
            MeasureMm = request.MeasureMm,
            HeightMm = request.HeightMm,
            Configuration = config,
            GlassColor = glassColor,
            HardwareColor = hardwareColor,
            HandleSide = handleSide,
            MeasuredAt = DateTime.UtcNow,
        };
        db.Measurements.Add(measurement);

        var glasses = CreateGlasses(measurement.Id, request.HeightMm, panels);

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

        var config = ParseEnum<CabinConfiguration>(request.Configuration, "configuration");
        var glassColor = ParseEnum<GlassColor>(request.GlassColor, "glassColor");
        var hardwareColor = ParseEnum<HardwareColor>(request.HardwareColor, "hardwareColor");
        var handleSide = ParseEnum<HandleSide>(request.HandleSide ?? "Right", "handleSide");

        ValidateRange(request.MeasureMm, 600, 3000, "measureMm");
        ValidateRange(request.HeightMm, 1500, 2500, "heightMm");

        // Soft-delete old glasses and holes (AuditInterceptor converts Remove → IsDeleted=true)
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
        measurement.Configuration = config;
        measurement.GlassColor = glassColor;
        measurement.HardwareColor = hardwareColor;
        measurement.HandleSide = handleSide;

        var panels = PanelComputer.Compute(request.MeasureMm, request.HeightMm, config);
        var glasses = CreateGlasses(measurement.Id, request.HeightMm, panels);
        AddHoles(glasses, request.Holes);

        await db.SaveChangesAsync(ct);
        return await LoadResponseAsync(measurement.Id, ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<Glass> CreateGlasses(
        Guid measurementId,
        int heightMm,
        IReadOnlyList<PanelComputer.Panel> panels)
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
                HeightMm = heightMm,
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
            .FirstAsync(m => m.Id == id, ct);

        return new MeasurementResponse(
            m.Id,
            m.MeasurerId,
            m.MeasureMm,
            m.HeightMm,
            m.Configuration.ToString(),
            m.GlassColor.ToString(),
            m.HardwareColor.ToString(),
            m.HandleSide.ToString(),
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
