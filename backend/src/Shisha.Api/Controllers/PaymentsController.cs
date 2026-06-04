using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Payments;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/payments")]
[Authorize]
public sealed class PaymentsController(IPaymentService paymentService) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<PaymentDto>> Create(CreatePaymentRequest request, CancellationToken ct)
    {
        var result = await paymentService.CreateAsync(request, ct);
        return Created($"api/v1/payments/{result.Id}", result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await paymentService.DeleteAsync(id, ct);
        return NoContent();
    }
}
