using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Users;
using Shisha.Domain.Exceptions;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public sealed class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll(CancellationToken ct)
    {
        return Ok(await userService.GetAllUsersAsync(ct));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserDto>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await userService.GetUserByIdAsync(id, ct));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("measurers")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<IReadOnlyList<MeasurerDto>>> GetMeasurers(CancellationToken ct)
    {
        return Ok(await userService.GetMeasurersAsync(ct));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        try
        {
            var user = await userService.CreateUserAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
        }
        catch (ConflictException ex)
        {
            return Conflict(new { detail = ex.Message });
        }
        catch (DomainValidationException ex)
        {
            return BadRequest(new { title = ex.Message, errors = ex.Errors });
        }
    }

    [HttpPatch("{id:guid}/measurer-fee")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<MeasurerDto>> UpdateMeasurerFee(
        Guid id, UpdateUserMeasurerFeeRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await userService.UpdateMeasurerFeeAsync(id, request, ct));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await userService.DeleteUserAsync(id, ct);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
        catch (DomainValidationException ex)
        {
            return BadRequest(new { title = ex.Message });
        }
    }
}
