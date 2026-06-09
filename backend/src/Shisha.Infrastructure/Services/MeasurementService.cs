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
    private const string DefaultAddress = "Не указан";

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
            var lead = await db.Leads.FindAsync([request.LeadId.Value], ct)
                ?? throw new NotFoundException($"Lead {request.LeadId.Value} not found.");

            if (lead.Status is not (LeadStatus.Measurement or LeadStatus.Buying
                    or LeadStatus.OrderedAtFactory or LeadStatus.GlassArrived))
                throw new DomainValidationException(
                    "leadId",
                    $"Lead must be in Measurement, Buying, OrderedAtFactory, or GlassArrived status. Got: {lead.Status}.");
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

        // Soft-delete old glasses and holes
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
            .FirstAsync(m => m.Id == id, ct);

        return new MeasurementResponse(
            m.Id,
            m.MeasurerId,
            m.LeadId,
            m.Address,
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
