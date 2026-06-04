namespace Shisha.Application.Payments;

public interface IPaymentService
{
    Task<PaymentDto> CreateAsync(CreatePaymentRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
