using ClosedXML.Excel;
using Shisha.Application.Analytics;

namespace Shisha.Infrastructure.Excel;

public sealed class FinancesReportExcelService : IFinancesReportExcelService
{
    private static readonly string[] MonthLabels =
        ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

    private const string DarkBlue  = "#1a2744";
    private const string Gold      = "#c9a84c";
    private const string GreenBg   = "#dcfce7";
    private const string YellowBg  = "#fef9c3";
    private const string HeaderFg  = "#ffffff";
    private const string MoneyFmt  = "#,##0.00 \"TJS\"";
    private const string PctFmt    = "0.0\"%\"";

    public byte[] Generate(ExportDataDto data)
    {
        using var wb = new XLWorkbook();

        AddSummarySheet(wb, data);
        AddMeasurementsSheet(wb, data);
        AddFactoryPaymentsSheet(wb, data);
        AddMeasurerPayoutsSheet(wb, data);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ── Sheet 1: P&L Summary ──────────────────────────────────────────────────

    private static void AddSummarySheet(XLWorkbook wb, ExportDataDto data)
    {
        var ws = wb.Worksheets.Add("P&L Сводка");
        var s = data.Summary;

        // Title
        ws.Cell(1, 1).Value = "SHISHA_TJ — Финансовый отчёт";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml(DarkBlue);
        ws.Range(1, 1, 1, 4).Merge();

        ws.Cell(2, 1).Value = $"Период: {data.From:dd.MM.yyyy} — {data.To:dd.MM.yyyy}";
        ws.Cell(2, 1).Style.Font.Italic = true;
        ws.Cell(2, 1).Style.Font.FontColor = XLColor.FromHtml("#555555");
        ws.Range(2, 1, 2, 4).Merge();

        ws.Cell(3, 1).Value = $"Сгенерировано: {data.GeneratedAt:dd.MM.yyyy HH:mm} UTC";
        ws.Cell(3, 1).Style.Font.FontSize = 8;
        ws.Cell(3, 1).Style.Font.FontColor = XLColor.Gray;
        ws.Range(3, 1, 3, 4).Merge();

        // KPI block
        void KpiRow(int row, string label, double value, string? numFmt = null)
        {
            ws.Cell(row, 1).Value = label;
            ws.Cell(row, 1).Style.Font.Bold = true;
            ws.Cell(row, 2).Value = value;
            if (numFmt is not null)
                ws.Cell(row, 2).Style.NumberFormat.Format = numFmt;
            ws.Cell(row, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        }

        KpiRow(5,  "Выручка",                 (double)s.RevenueTjs,                 MoneyFmt);
        KpiRow(6,  "Себестоимость (итого)",    (double)s.TotalCostTjs,               MoneyFmt);
        KpiRow(7,  "  — завод",               (double)s.FactoryCostTjs,             MoneyFmt);
        KpiRow(8,  "  — замерщики",           (double)s.MeasurerCostTjs,            MoneyFmt);
        KpiRow(9,  "  — прочее",              (double)s.OtherExpensesTjs,           MoneyFmt);
        KpiRow(10, "Прибыль",                 (double)s.ProfitTjs,                  MoneyFmt);
        KpiRow(11, "Маржа",                   (double)(s.MarginPct / 100),          "0.0%");
        KpiRow(12, "Закрытых сделок",         (double)s.ClosedMeasurementsCount);

        // Color profit row
        ws.Cell(10, 2).Style.Font.FontColor = s.ProfitTjs >= 0
            ? XLColor.FromHtml("#15803d")
            : XLColor.FromHtml("#dc2626");

        if (s.MonthlyBreakdown.Count == 0)
        {
            ws.Columns().AdjustToContents();
            return;
        }

        // Monthly breakdown table starting at row 14
        var hdrs = new[] { "Месяц", "Выручка", "Себестоимость", "Прибыль", "Маржа%", "Сделок" };
        for (var i = 0; i < hdrs.Length; i++)
        {
            var cell = ws.Cell(14, i + 1);
            cell.Value = hdrs[i];
            ApplyHeader(cell);
        }

        var r = 15;
        foreach (var m in s.MonthlyBreakdown)
        {
            var mMargin = m.RevenueTjs > 0 ? Math.Round(m.ProfitTjs / m.RevenueTjs * 100m, 1) : 0m;
            ws.Cell(r, 1).Value = $"{MonthLabels[m.Month - 1]} {m.Year}";
            SetMoney(ws.Cell(r, 2), m.RevenueTjs);
            SetMoney(ws.Cell(r, 3), m.CostTjs);
            SetMoney(ws.Cell(r, 4), m.ProfitTjs);
            ws.Cell(r, 4).Style.Font.FontColor = m.ProfitTjs >= 0
                ? XLColor.FromHtml("#15803d") : XLColor.FromHtml("#dc2626");
            ws.Cell(r, 5).Value = (double)mMargin;
            ws.Cell(r, 5).Style.NumberFormat.Format = PctFmt;
            ws.Cell(r, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            ws.Cell(r, 6).Value = m.ClosedCount;
            ws.Cell(r, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            r++;
        }

        // Totals
        ApplyTotalRow(ws, r, 6);
        ws.Cell(r, 1).Value = "Итого";
        SetMoney(ws.Cell(r, 2), s.RevenueTjs);
        SetMoney(ws.Cell(r, 3), s.TotalCostTjs);
        SetMoney(ws.Cell(r, 4), s.ProfitTjs);
        ws.Cell(r, 4).Style.Font.FontColor = s.ProfitTjs >= 0
            ? XLColor.FromHtml("#15803d") : XLColor.FromHtml("#dc2626");
        ws.Cell(r, 5).Value = (double)s.MarginPct;
        ws.Cell(r, 5).Style.NumberFormat.Format = PctFmt;
        ws.Cell(r, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        ws.Cell(r, 6).Value = s.ClosedMeasurementsCount;
        ws.Cell(r, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        ws.Columns().AdjustToContents();
    }

    // ── Sheet 2: Measurements ─────────────────────────────────────────────────

    private static void AddMeasurementsSheet(XLWorkbook wb, ExportDataDto data)
    {
        var ws = wb.Worksheets.Add("Замеры");

        var hdrs = new[]
        {
            "Клиент", "Телефон", "Продукт", "Размеры",
            "Дата замера", "Посл. платёж",
            "Сделка", "Оплачено", "Завод", "Замерщик", "Прочее", "Прибыль", "Маржа%"
        };
        for (var i = 0; i < hdrs.Length; i++) ApplyHeader(ws.Cell(1, i + 1), hdrs[i]);

        ws.SheetView.FreezeRows(1);

        var totDeal = 0m; var totPaid = 0m;
        var totFactory = 0m; var totMeasurer = 0m;
        var totOther = 0m; var totProfit = 0m;

        var r = 2;
        foreach (var m in data.Measurements)
        {
            ws.Cell(r, 1).Value  = m.ClientName;
            ws.Cell(r, 2).Value  = m.ClientPhone;
            ws.Cell(r, 3).Value  = m.Product;
            ws.Cell(r, 4).Value  = m.Sizes ?? "—";
            SetDate(ws.Cell(r, 5), m.MeasuredAt);
            SetDate(ws.Cell(r, 6), m.LastPaymentDate);
            SetMoney(ws.Cell(r, 7), m.DealPriceTjs);
            SetMoney(ws.Cell(r, 8), m.TotalPaidTjs);
            SetMoney(ws.Cell(r, 9), m.FactoryCostTjs);
            SetMoney(ws.Cell(r, 10), m.MeasurerCostTjs);
            SetMoney(ws.Cell(r, 11), m.OtherExpensesTjs);
            SetMoney(ws.Cell(r, 12), m.ProfitTjs);
            ws.Cell(r, 12).Style.Font.FontColor = m.ProfitTjs >= 0
                ? XLColor.FromHtml("#15803d") : XLColor.FromHtml("#dc2626");
            ws.Cell(r, 13).Value = (double)m.MarginPct;
            ws.Cell(r, 13).Style.NumberFormat.Format = PctFmt;
            ws.Cell(r, 13).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

            totDeal     += m.DealPriceTjs;
            totPaid     += m.TotalPaidTjs;
            totFactory  += m.FactoryCostTjs;
            totMeasurer += m.MeasurerCostTjs;
            totOther    += m.OtherExpensesTjs;
            totProfit   += m.ProfitTjs;
            r++;
        }

        // Totals
        ApplyTotalRow(ws, r, hdrs.Length);
        ws.Cell(r, 1).Value = "Итого";
        SetMoney(ws.Cell(r, 7), totDeal);
        SetMoney(ws.Cell(r, 8), totPaid);
        SetMoney(ws.Cell(r, 9), totFactory);
        SetMoney(ws.Cell(r, 10), totMeasurer);
        SetMoney(ws.Cell(r, 11), totOther);
        SetMoney(ws.Cell(r, 12), totProfit);
        ws.Cell(r, 12).Style.Font.FontColor = totProfit >= 0
            ? XLColor.FromHtml("#15803d") : XLColor.FromHtml("#dc2626");
        var avgMargin = totDeal > 0 ? Math.Round(totProfit / totDeal * 100m, 1) : 0m;
        ws.Cell(r, 13).Value = (double)avgMargin;
        ws.Cell(r, 13).Style.NumberFormat.Format = PctFmt;
        ws.Cell(r, 13).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        ws.Columns().AdjustToContents();
    }

    // ── Sheet 3: Factory payments ─────────────────────────────────────────────

    private static void AddFactoryPaymentsSheet(XLWorkbook wb, ExportDataDto data)
    {
        var ws = wb.Worksheets.Add("Платежи заводу");

        var hdrs = new[]
        {
            "Номер заказа", "Дата платежа", "Сумма",
            "Комментарий", "Статус", "Оплачено по заказу", "Долг"
        };
        for (var i = 0; i < hdrs.Length; i++) ApplyHeader(ws.Cell(1, i + 1), hdrs[i]);

        ws.SheetView.FreezeRows(1);

        var total = 0m;
        var r = 2;
        foreach (var p in data.FactoryPayments)
        {
            ws.Cell(r, 1).Value = p.OrderCode;
            ws.Cell(r, 1).Style.Font.FontName = "Courier New";
            SetDate(ws.Cell(r, 2), p.PaidAt);
            SetMoney(ws.Cell(r, 3), p.AmountTjs);
            ws.Cell(r, 4).Value = p.Note ?? "—";
            ws.Cell(r, 5).Value = p.OrderStatus;
            SetMoney(ws.Cell(r, 6), p.OrderTotalPaidTjs);
            SetMoney(ws.Cell(r, 7), p.OrderDebtTjs);
            ws.Cell(r, 7).Style.Font.FontColor = p.OrderDebtTjs > 0
                ? XLColor.FromHtml("#dc2626") : XLColor.FromHtml("#15803d");

            total += p.AmountTjs;
            r++;
        }

        ApplyTotalRow(ws, r, hdrs.Length);
        ws.Cell(r, 1).Value = "Итого";
        SetMoney(ws.Cell(r, 3), total);

        ws.Columns().AdjustToContents();
    }

    // ── Sheet 4: Measurer payouts ─────────────────────────────────────────────

    private static void AddMeasurerPayoutsSheet(XLWorkbook wb, ExportDataDto data)
    {
        var ws = wb.Worksheets.Add("Выплаты замерщикам");

        var hdrs = new[]
        {
            "Замерщик", "Клиент", "Дата создания",
            "Расчётная сумма", "Фактическая сумма",
            "Статус", "Дата выплаты"
        };
        for (var i = 0; i < hdrs.Length; i++) ApplyHeader(ws.Cell(1, i + 1), hdrs[i]);

        ws.SheetView.FreezeRows(1);

        var totCalc = 0m; var totActual = 0m;
        var r = 2;
        foreach (var p in data.MeasurerPayouts)
        {
            ws.Cell(r, 1).Value = p.MeasurerName;
            ws.Cell(r, 2).Value = p.ClientName;
            SetDate(ws.Cell(r, 3), p.CreatedAt);
            SetMoney(ws.Cell(r, 4), p.CalculatedAmountTjs);
            SetMoney(ws.Cell(r, 5), p.ActualAmountTjs);

            var statusCell = ws.Cell(r, 6);
            statusCell.Value = p.IsPaid ? "Выплачено" : "Не выплачено";
            statusCell.Style.Fill.BackgroundColor = p.IsPaid
                ? XLColor.FromHtml(GreenBg)
                : XLColor.FromHtml(YellowBg);

            if (p.PaidAt.HasValue)
                SetDate(ws.Cell(r, 7), p.PaidAt.Value);
            else
                ws.Cell(r, 7).Value = "—";

            totCalc   += p.CalculatedAmountTjs;
            totActual += p.ActualAmountTjs;
            r++;
        }

        ApplyTotalRow(ws, r, hdrs.Length);
        ws.Cell(r, 1).Value = "Итого";
        SetMoney(ws.Cell(r, 4), totCalc);
        SetMoney(ws.Cell(r, 5), totActual);

        ws.Columns().AdjustToContents();
    }

    // ── Style helpers ─────────────────────────────────────────────────────────

    private static void ApplyHeader(IXLCell cell, string? text = null)
    {
        if (text is not null) cell.Value = text;
        cell.Style.Font.Bold = true;
        cell.Style.Font.FontColor = XLColor.FromHtml(HeaderFg);
        cell.Style.Fill.BackgroundColor = XLColor.FromHtml(DarkBlue);
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
    }

    private static void ApplyTotalRow(IXLWorksheet ws, int row, int cols)
    {
        var range = ws.Range(row, 1, row, cols);
        range.Style.Font.Bold = true;
        range.Style.Fill.BackgroundColor = XLColor.FromHtml("#e8ecf4");
        range.Style.Border.TopBorder = XLBorderStyleValues.Thin;
        range.Style.Border.TopBorderColor = XLColor.FromHtml("#aab4cc");
    }

    private static void SetMoney(IXLCell cell, decimal value)
    {
        cell.Value = (double)value;
        cell.Style.NumberFormat.Format = MoneyFmt;
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
    }

    private static void SetDate(IXLCell cell, DateOnly date)
    {
        cell.Value = date.ToDateTime(TimeOnly.MinValue);
        cell.Style.NumberFormat.Format = "dd.MM.yyyy";
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
    }
}
