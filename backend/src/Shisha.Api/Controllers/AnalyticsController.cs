using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Analytics;
using Shisha.Domain.Exceptions;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
[Authorize(Roles = "Admin")]
public sealed class AnalyticsController(
    IAnalyticsService analytics,
    IAnalyticsFinancesService financesService,
    IFinancesReportPdfService pdfService,
    IFinancesReportExcelService excelService) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> GetDashboard(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct) =>
        Ok(await analytics.GetDashboardAsync(from, to, ct));

    [HttpGet("funnel")]
    public async Task<ActionResult<FunnelDto>> GetFunnel(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct) =>
        Ok(await analytics.GetFunnelAsync(from, to, ct));

    [HttpGet("refusals")]
    public async Task<ActionResult<RefusalsDto>> GetRefusals(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct) =>
        Ok(await analytics.GetRefusalsAsync(from, to, ct));

    [HttpGet("by-product")]
    public async Task<ActionResult<ByProductDto>> GetByProduct(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct) =>
        Ok(await analytics.GetByProductAsync(from, to, ct));

    [HttpGet("by-color")]
    public async Task<ActionResult<ByColorDto>> GetByColor(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct) =>
        Ok(await analytics.GetByColorAsync(from, to, ct));

    [HttpGet("by-measurer")]
    public async Task<ActionResult<ByMeasurerDto>> GetByMeasurer(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct) =>
        Ok(await analytics.GetByMeasurerAsync(from, to, ct));

    [HttpGet("finances")]
    public async Task<ActionResult<PeriodFinancesDto>> GetFinances(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct)
    {
        var err = ValidateRange(from, to);
        if (err is not null) return err;

        return Ok(await financesService.GetPeriodFinancesAsync(from!.Value, to!.Value, ct));
    }

    [HttpGet("export")]
    public async Task<ActionResult<ExportDataDto>> GetExport(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct)
    {
        var err = ValidateRange(from, to);
        if (err is not null) return err;

        return Ok(await financesService.GetExportDataAsync(from!.Value, to!.Value, ct));
    }

    [HttpGet("export/pdf")]
    public async Task<IActionResult> GetExportPdf(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct)
    {
        var err = ValidateRange(from, to);
        if (err is not null) return err;

        var data = await financesService.GetExportDataAsync(from!.Value, to!.Value, ct);
        var bytes = pdfService.Generate(data);
        var filename = $"SHISHA_TJ_Report_{from.Value:yyyy-MM-dd}_{to.Value:yyyy-MM-dd}.pdf";
        return File(bytes, "application/pdf", filename);
    }

    [HttpGet("export/excel")]
    public async Task<IActionResult> GetExportExcel(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct)
    {
        var err = ValidateRange(from, to);
        if (err is not null) return err;

        var data = await financesService.GetExportDataAsync(from!.Value, to!.Value, ct);
        var bytes = excelService.Generate(data);
        var filename = $"SHISHA_TJ_Report_{from.Value:yyyy-MM-dd}_{to.Value:yyyy-MM-dd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private BadRequestObjectResult? ValidateRange(DateOnly? from, DateOnly? to)
    {
        if (!from.HasValue)
            return BadRequest(new { error = "from parameter is required." });
        if (!to.HasValue)
            return BadRequest(new { error = "to parameter is required." });
        if (to.Value < from.Value)
            return BadRequest(new { error = "to must be >= from." });
        if ((to.Value.ToDateTime(TimeOnly.MinValue) - from.Value.ToDateTime(TimeOnly.MinValue)).TotalDays > 730)
            return BadRequest(new { error = "Date range cannot exceed 2 years." });
        return null;
    }
}
