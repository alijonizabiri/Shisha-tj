using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Finances;
using Shisha.Application.Leads;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/leads")]
[Authorize]
public sealed class LeadsController(ILeadService leadService, IProfitCalculator profitCalculator) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Operator,Measurer")]
    public async Task<ActionResult<PagedLeadsResponse>> GetList(
        [FromQuery] string? search,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = new LeadsQuery(search, from, to, page, pageSize);
        return Ok(await leadService.GetListAsync(query, ct));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Operator,Measurer")]
    public async Task<ActionResult<LeadDetailResponse>> GetById(Guid id, CancellationToken ct)
    {
        return Ok(await leadService.GetByIdAsync(id, ct));
    }

    [HttpGet("{id:guid}/finances")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<LeadFinancesDto>> GetFinances(Guid id, CancellationToken ct)
    {
        return Ok(await profitCalculator.CalculateAsync(id, ct));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<LeadDetailResponse>> Create(
        CreateLeadRequest request, CancellationToken ct)
    {
        var result = await leadService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<LeadDetailResponse>> Update(
        Guid id, UpdateLeadRequest request, CancellationToken ct)
    {
        return Ok(await leadService.UpdateAsync(id, request, ct));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await leadService.DeleteAsync(id, ct);
        return NoContent();
    }
}
