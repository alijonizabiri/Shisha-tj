using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Shisha.Domain.Exceptions;

namespace Shisha.Api.Infrastructure;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (status, errorCode, title) = exception switch
        {
            NotFoundException         => (404, "NOT_FOUND",        "Not found"),
            ForbiddenException        => (403, "FORBIDDEN",        "Access denied"),
            ConflictException         => (409, "CONFLICT",         "Conflict"),
            DomainValidationException => (400, "VALIDATION_FAILED","Validation failed"),
            UnauthorizedException     => (401, "UNAUTHORIZED",     "Unauthorized"),
            _                         => (500, "SERVER_ERROR",     "An unexpected error occurred"),
        };

        if (status == 500)
            logger.LogError(exception, "Unhandled exception");

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Type = $"https://shisha-tj.app/errors/{errorCode.ToLower().Replace('_', '-')}",
        };

        problem.Extensions["errorCode"] = errorCode;

        if (exception is DomainValidationException dve)
            problem.Extensions["errors"] = dve.Errors;
        else
            problem.Detail = exception.Message;

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
