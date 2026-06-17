using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.MeasurerPayouts;
using Shisha.Domain.Exceptions;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public sealed class MeasurerPayoutsController(IMeasurerPayoutService payoutService) : ControllerBase
{
    [HttpPost("measurer-payouts")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<MeasurerPayoutDto>> Create(
        CreateMeasurerPayoutRequest request, CancellationToken ct)
    {
        try
        {
            var result = await payoutService.CreateAsync(request, ct);
            return CreatedAtAction(
                nameof(GetByMeasurement),
                new { measurementId = result.MeasurementId },
                result);
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
        catch (ConflictException ex)
        {
            return Conflict(new ProblemDetails { Status = 409, Detail = ex.Message });
        }
        catch (DomainValidationException ex)
        {
            return ValidationProblem(new ValidationProblemDetails(
                new Dictionary<string, string[]>(ex.Errors)));
        }
    }

    [HttpPatch("measurer-payouts/{id:guid}/mark-paid")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<MeasurerPayoutDto>> MarkPaid(
        Guid id, MarkPaidRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await payoutService.MarkPaidAsync(id, request, ct));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("measurements/{measurementId:guid}/measurer-payout")]
    [Authorize(Roles = "Admin,Operator,Measurer")]
    public async Task<ActionResult<MeasurerPayoutDto?>> GetByMeasurement(
        Guid measurementId, CancellationToken ct)
    {
        var result = await payoutService.GetByMeasurementAsync(measurementId, ct);
        return result is null ? NoContent() : Ok(result);
    }
}
