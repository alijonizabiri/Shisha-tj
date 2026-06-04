using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Leads;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/leads")]
[Authorize]
public sealed class LeadsController(ILeadService leadService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Operator,Measurer")]
    public async Task<ActionResult<PagedLeadsResponse>> GetList(
        [FromQuery] string? status,
        [FromQuery] Guid? assignedTo,
        [FromQuery] string? search,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = new LeadsQuery(status, assignedTo, search, from, to, page, pageSize);
        return Ok(await leadService.GetListAsync(query, ct));
    }

    [HttpGet("kanban")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<KanbanResponse>> GetKanban(CancellationToken ct)
    {
        return Ok(await leadService.GetKanbanAsync(ct));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Operator,Measurer")]
    public async Task<ActionResult<LeadDetailResponse>> GetById(Guid id, CancellationToken ct)
    {
        return Ok(await leadService.GetByIdAsync(id, ct));
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

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<IActionResult> PatchStatus(
        Guid id, PatchStatusRequest request, CancellationToken ct)
    {
        await leadService.PatchStatusAsync(id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/assign-measurer")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<IActionResult> AssignMeasurer(
        Guid id, AssignMeasurerRequest request, CancellationToken ct)
    {
        await leadService.AssignMeasurerAsync(id, request, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await leadService.DeleteAsync(id, ct);
        return NoContent();
    }
}
