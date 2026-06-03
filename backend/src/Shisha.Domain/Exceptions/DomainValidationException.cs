namespace Shisha.Domain.Exceptions;

public sealed class DomainValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public DomainValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public DomainValidationException(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = [message] })
    {
    }
}
