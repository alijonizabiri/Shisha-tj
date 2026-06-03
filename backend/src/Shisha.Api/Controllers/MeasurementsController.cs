using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Measurements;
using Shisha.Domain.Exceptions;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/measurements")]
[Authorize]
public sealed class MeasurementsController(IMeasurementService measurementService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<MeasurementResponse>> Create(
        CreateMeasurementRequest request, CancellationToken ct)
    {
        try
        {
            var result = await measurementService.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (DomainValidationException ex)
        {
            return ValidationProblem(new ValidationProblemDetails(
                new Dictionary<string, string[]>(ex.Errors)));
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MeasurementResponse>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await measurementService.GetByIdAsync(id, ct);
            return Ok(result);
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MeasurementResponse>> Update(
        Guid id, UpdateMeasurementRequest request, CancellationToken ct)
    {
        try
        {
            var result = await measurementService.UpdateAsync(id, request, ct);
            return Ok(result);
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
        catch (DomainValidationException ex)
        {
            return ValidationProblem(new ValidationProblemDetails(
                new Dictionary<string, string[]>(ex.Errors)));
        }
    }
}
