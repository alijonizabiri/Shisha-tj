using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Analytics;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
[Authorize(Roles = "Admin")]
public sealed class AnalyticsController(IAnalyticsService analytics) : ControllerBase
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
}
