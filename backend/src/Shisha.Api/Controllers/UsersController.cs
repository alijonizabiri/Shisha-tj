using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shisha.Application.Users;

namespace Shisha.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public sealed class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet("measurers")]
    [Authorize(Roles = "Admin,Operator")]
    public async Task<ActionResult<IReadOnlyList<MeasurerDto>>> GetMeasurers(CancellationToken ct)
    {
        return Ok(await userService.GetMeasurersAsync(ct));
    }
}
