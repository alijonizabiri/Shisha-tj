namespace Shisha.Application.FactoryOrders;

public interface IFactoryOrderService
{
    Task<PagedFactoryOrdersResponse> GetListAsync(FactoryOrdersQuery query, CancellationToken ct = default);
    Task<FactoryOrderDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<FactoryOrderDetailResponse> CreateAsync(CreateFactoryOrderRequest request, CancellationToken ct = default);
    Task<FactoryOrderDetailResponse> SendAsync(Guid id, SendFactoryOrderRequest request, CancellationToken ct = default);
    Task<FactoryOrderDetailResponse> ReceiveAsync(Guid id, ReceiveFactoryOrderRequest request, CancellationToken ct = default);
    Task<FactoryOrderDetailResponse> AddReworkItemAsync(Guid id, Guid itemId, ReworkItemRequest request, CancellationToken ct = default);
}
