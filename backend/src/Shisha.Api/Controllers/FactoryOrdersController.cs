using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.FactoryOrders;
using Shisha.Domain.Exceptions;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/factory-orders")]
[Authorize]
public sealed class FactoryOrdersController(
    IFactoryOrderService factoryOrderService,
    IFactoryOrderPdfService factoryOrderPdfService) : ControllerBase
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

    // ── Factory payments ──────────────────────────────────────────────────────

    [HttpPost("{id:guid}/payments")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<AddFactoryPaymentResponse>> AddPayment(
        Guid id, AddFactoryPaymentRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await factoryOrderService.AddPaymentAsync(id, request, ct));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}/payments/{paymentId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeletePayment(Guid id, Guid paymentId, CancellationToken ct)
    {
        try
        {
            await factoryOrderService.DeletePaymentAsync(id, paymentId, ct);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/pdf")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<IActionResult> GetPdf(Guid id, CancellationToken ct)
    {
        var bytes = await factoryOrderPdfService.GenerateAsync(id, ct);
        var filename = $"factory-order-{id.ToString("N")[..8].ToUpperInvariant()}.pdf";
        return File(bytes, "application/pdf", filename);
    }
}
