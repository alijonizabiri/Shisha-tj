namespace Shisha.Application.Analytics;

public record PeriodFinancesDto(
    DateOnly From,
    DateOnly To,
    int ClosedMeasurementsCount,
    decimal RevenueTjs,
    decimal FactoryCostTjs,
    decimal MeasurerCostTjs,
    decimal OtherExpensesTjs,
    decimal TotalCostTjs,
    decimal ProfitTjs,
    decimal MarginPct,
    IReadOnlyList<MonthlyBreakdownDto> MonthlyBreakdown);

public record MonthlyBreakdownDto(
    int Year,
    int Month,
    decimal RevenueTjs,
    decimal CostTjs,
    decimal ProfitTjs,
    int ClosedCount
    );
