namespace Shisha.Application.FactoryOrders;

public interface IFactoryOrderPdfService
{
    Task<byte[]> GenerateAsync(Guid orderId, CancellationToken ct = default);
}
