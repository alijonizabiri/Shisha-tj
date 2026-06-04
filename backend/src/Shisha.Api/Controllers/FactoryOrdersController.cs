using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.FactoryOrders;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/factory-orders")]
[Authorize]
public sealed class FactoryOrdersController(IFactoryOrderService factoryOrderService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<PagedFactoryOrdersResponse>> GetList(
        [FromQuery] string? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = new FactoryOrdersQuery(status, from, to, page, pageSize);
        return Ok(await factoryOrderService.GetListAsync(query, ct));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<FactoryOrderDetailResponse>> GetById(Guid id, CancellationToken ct)
    {
        return Ok(await factoryOrderService.GetByIdAsync(id, ct));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<FactoryOrderDetailResponse>> Create(
        CreateFactoryOrderRequest request, CancellationToken ct)
    {
        var result = await factoryOrderService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}/send")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<FactoryOrderDetailResponse>> Send(
        Guid id, SendFactoryOrderRequest request, CancellationToken ct)
    {
        return Ok(await factoryOrderService.SendAsync(id, request, ct));
    }

    [HttpPatch("{id:guid}/receive")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<FactoryOrderDetailResponse>> Receive(
        Guid id, ReceiveFactoryOrderRequest request, CancellationToken ct)
    {
        return Ok(await factoryOrderService.ReceiveAsync(id, request, ct));
    }

    [HttpPost("{id:guid}/items/{itemId:guid}/rework")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<FactoryOrderDetailResponse>> AddRework(
        Guid id, Guid itemId, ReworkItemRequest request, CancellationToken ct)
    {
        return Ok(await factoryOrderService.AddReworkItemAsync(id, itemId, request, ct));
    }
}
