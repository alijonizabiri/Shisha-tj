namespace Shisha.Application.Analytics;

public record ExportDataDto(
    DateOnly From,
    DateOnly To,
    DateTimeOffset GeneratedAt,
    string CompanyName,
    PeriodFinancesDto Summary,
    IReadOnlyList<ExportMeasurementDto> Measurements,
    IReadOnlyList<ExportFactoryPaymentDto> FactoryPayments,
    IReadOnlyList<ExportMeasurerPayoutDto> MeasurerPayouts);

public record ExportMeasurementDto(
    string ClientName,
    string ClientPhone,
    string Product,
    string? Sizes,
    DateOnly MeasuredAt,
    DateOnly LastPaymentDate,
    decimal DealPriceTjs,
    decimal TotalPaidTjs,
    decimal FactoryCostTjs,
    decimal MeasurerCostTjs,
    decimal OtherExpensesTjs,
    decimal ProfitTjs,
    decimal MarginPct);

public record ExportFactoryPaymentDto(
    string OrderCode,
    DateOnly PaidAt,
    decimal AmountTjs,
    string? Note,
    string OrderStatus,
    decimal OrderTotalPaidTjs,
    decimal OrderDebtTjs);

public record ExportMeasurerPayoutDto(
    string MeasurerName,
    string ClientName,
    DateOnly CreatedAt,
    decimal CalculatedAmountTjs,
    decimal ActualAmountTjs,
    bool IsPaid,
    DateOnly? PaidAt);
