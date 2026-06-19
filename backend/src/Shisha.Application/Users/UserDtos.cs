namespace Shisha.Application.Users;

public sealed record UserDto(Guid Id, string FullName, string Email, string Role, decimal? MeasurerFixedFeeTjs);

public sealed record MeasurerDto(Guid Id, string FullName, string Email, decimal? MeasurerFixedFeeTjs);

public sealed record UpdateUserMeasurerFeeRequest(decimal? MeasurerFixedFeeTjs);
