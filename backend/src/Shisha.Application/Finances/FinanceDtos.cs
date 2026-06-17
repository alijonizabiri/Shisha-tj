namespace Shisha.Application.Finances;

public record LeadFinancesDto(
    Guid LeadId,
    decimal? DealPriceTjs,
    decimal GlassCostTjs,
    decimal ReworkCostTjs,
    decimal HardwareCostTjs,
    decimal MasterFeeTjs,
    decimal DeliveryCostTjs,
    decimal OtherCostsTjs,
    decimal TotalCostTjs,
    decimal? ProfitTjs,
    decimal TotalPaidTjs,
    decimal TotalDepositTjs,
    decimal? BalanceDueTjs);

public record MeasurementFinancesDto(
    Guid MeasurementId,
    decimal? DealPriceTjs,
    decimal GlassCostTjs,
    decimal ReworkCostTjs,
    decimal HardwareCostTjs,
    decimal MasterFeeTjs,
    decimal DeliveryCostTjs,
    decimal OtherCostsTjs,
    decimal TotalCostTjs,
    decimal? ProfitTjs,
    decimal TotalPaidTjs,
    decimal TotalDepositTjs,
    decimal? BalanceDueTjs,
    decimal? MeasurerPayoutAmount,
    bool? MeasurerPayoutIsPaid);
