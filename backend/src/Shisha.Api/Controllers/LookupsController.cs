using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Leads;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public sealed class LookupsController(ILeadService leadService) : ControllerBase
{
    [HttpGet("refusal-reasons")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<IReadOnlyList<RefusalReasonDto>>> GetRefusalReasons(CancellationToken ct)
    {
        return Ok(await leadService.GetRefusalReasonsAsync(ct));
    }

    [HttpGet("products")]
    [Authorize(Roles = "Admin,Operator,Measurer")]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetProducts(CancellationToken ct)
    {
        return Ok(await leadService.GetProductsAsync(ct));
    }
}
