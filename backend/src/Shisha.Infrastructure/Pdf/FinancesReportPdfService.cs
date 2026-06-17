using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Shisha.Application.Analytics;
using SkiaSharp;

namespace Shisha.Infrastructure.Pdf;

public sealed class FinancesReportPdfService : IFinancesReportPdfService
{
    private static readonly byte[] LogoPng = RenderLogoPng(100);

    public byte[] Generate(ExportDataDto data) =>
        Document.Create(c => new FinancesReportDocument(data, LogoPng).Compose(c)).GeneratePdf();

    private static byte[] RenderLogoPng(int size)
    {
        using var surface = SKSurface.Create(new SKImageInfo(size, size));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.Transparent);

        using var bgPaint = new SKPaint { Color = new SKColor(0x18, 0x18, 0x1b), IsAntialias = true };
        canvas.DrawRoundRect(0, 0, size, size, size * 0.1875f, size * 0.1875f, bgPaint);

        using var font = new SKFont(SKTypeface.Default, size * 0.58f);
        using var textPaint = new SKPaint { Color = SKColors.White, IsAntialias = true };
        var textWidth = font.MeasureText("S");
        canvas.DrawText("S", size / 2f - textWidth / 2f, size * 0.68f, font, textPaint);

        using var image = surface.Snapshot();
        using var skData = image.Encode(SKEncodedImageFormat.Png, 100);
        return skData.ToArray();
    }
}

// ── Document ──────────────────────────────────────────────────────────────────

internal sealed class FinancesReportDocument(ExportDataDto data, byte[] logoPng) : IDocument
{
    private const string DarkBlue = "#1a2744";
    private const string Gold     = "#c9a84c";
    private const string LightGray = "#f8f9fa";

    private static readonly string[] MonthLabels =
        ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

    public void Compose(IDocumentContainer container)
    {
        // Page 1: Cover
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(25, Unit.Millimetre);
            page.Content().Element(ComposeCover);
        });

        // Pages 2+: Report content with standard header/footer
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(15, Unit.Millimetre);
            page.DefaultTextStyle(t => t.FontSize(9));
            page.Header().Element(ComposePageHeader);
            page.Content().PaddingTop(8).Element(ComposeReportBody);
            page.Footer().Element(ComposePageFooter);
        });
    }

    // ── Cover ─────────────────────────────────────────────────────────────────

    private void ComposeCover(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Extend().AlignMiddle().AlignCenter().Column(inner =>
            {
                // Logo
                inner.Item().AlignCenter().Width(90).Image(logoPng);

                inner.Item().PaddingTop(20).AlignCenter()
                    .Text("SHISHA_TJ")
                    .FontSize(28).Bold().FontColor(DarkBlue);

                inner.Item().PaddingTop(8).AlignCenter()
                    .Text("Финансовый отчёт")
                    .FontSize(18).FontColor(Gold);

                inner.Item().PaddingTop(16).AlignCenter()
                    .Text($"{data.From:dd.MM.yyyy} — {data.To:dd.MM.yyyy}")
                    .FontSize(13).FontColor(DarkBlue);

                inner.Item().PaddingTop(8).AlignCenter()
                    .Text($"Сгенерировано: {data.GeneratedAt:dd.MM.yyyy HH:mm} UTC")
                    .FontSize(9).FontColor(Colors.Grey.Medium);
            });

            // Bottom accent line
            col.Item().Height(4).Background(Gold);
        });
    }

    // ── Page header (pages 2+) ────────────────────────────────────────────────

    private void ComposePageHeader(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem()
                    .Text("SHISHA_TJ  |  Финансовый отчёт")
                    .Bold().FontSize(10).FontColor(DarkBlue);
                row.RelativeItem().AlignRight()
                    .Text($"{data.From:dd.MM.yyyy} — {data.To:dd.MM.yyyy}")
                    .FontSize(9).FontColor(Colors.Grey.Medium);
            });
            col.Item().PaddingTop(3).LineHorizontal(1.5f).LineColor(DarkBlue);
        });
    }

    // ── Report body ───────────────────────────────────────────────────────────

    private void ComposeReportBody(IContainer container)
    {
        container.Column(col =>
        {
            ComposeSummarySection(col);

            if (data.Measurements.Count > 0)
            {
                col.Item().PageBreak();
                ComposeMeasurementsSection(col);
            }

            if (data.FactoryPayments.Count > 0)
            {
                col.Item().PageBreak();
                ComposeFactoryPaymentsSection(col);
            }

            if (data.MeasurerPayouts.Count > 0)
            {
                col.Item().PageBreak();
                ComposeMeasurerPayoutsSection(col);
            }
        });
    }

    // ── Section: P&L Summary ──────────────────────────────────────────────────

    private void ComposeSummarySection(ColumnDescriptor col)
    {
        col.Item().Text("P&L Сводка за период")
            .FontSize(14).Bold().FontColor(DarkBlue);
        col.Item().PaddingTop(12);

        // KPI cards in a row
        col.Item().Row(row =>
        {
            void KpiBlock(RowDescriptor r, string label, string value, string color)
            {
                r.RelativeItem().Padding(4).Border(1).BorderColor(Colors.Grey.Lighten2)
                    .Padding(10).Column(c =>
                    {
                        c.Item().Text(label).FontSize(8).FontColor(Colors.Grey.Medium);
                        c.Item().PaddingTop(4).Text(value).FontSize(16).Bold().FontColor(color);
                    });
            }

            var s = data.Summary;
            KpiBlock(row, "Выручка", FormatMoney(s.RevenueTjs), DarkBlue);
            KpiBlock(row, "Себестоимость", FormatMoney(s.TotalCostTjs), Colors.Red.Medium);
            KpiBlock(row, "Прибыль", FormatMoney(s.ProfitTjs),
                s.ProfitTjs >= 0 ? "#16a34a" : "#dc2626");
            KpiBlock(row, "Маржа", $"{s.MarginPct}%", Gold);
        });

        col.Item().PaddingTop(4).Text($"Закрытых сделок: {data.Summary.ClosedMeasurementsCount}")
            .FontSize(8).FontColor(Colors.Grey.Medium);

        if (data.Summary.MonthlyBreakdown.Count == 0) return;

        col.Item().PaddingTop(16).Text("Помесячная разбивка")
            .FontSize(11).Bold().FontColor(DarkBlue);
        col.Item().PaddingTop(8).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(2);
                c.RelativeColumn(3);
                c.RelativeColumn(3);
                c.RelativeColumn(3);
                c.RelativeColumn(2);
                c.RelativeColumn(1);
            });

            static IContainer TH(IContainer c) =>
                c.DefaultTextStyle(t => t.Bold().FontSize(8).FontColor(Colors.White))
                 .Background(DarkBlue).Padding(5);

            static IContainer TDTot(IContainer c) =>
                c.DefaultTextStyle(t => t.FontSize(8).Bold())
                 .Background(LightGray).BorderTop(1).BorderColor(Colors.Grey.Lighten1).Padding(5);

            table.Header(h =>
            {
                h.Cell().Element(TH).Text("Месяц");
                h.Cell().Element(TH).AlignRight().Text("Выручка");
                h.Cell().Element(TH).AlignRight().Text("Себестоимость");
                h.Cell().Element(TH).AlignRight().Text("Прибыль");
                h.Cell().Element(TH).AlignRight().Text("Маржа%");
                h.Cell().Element(TH).AlignRight().Text("Сделок");
            });

            var rowIdx = 0;
            foreach (var m in data.Summary.MonthlyBreakdown)
            {
                var bg = rowIdx++ % 2 == 0 ? "#ffffff" : LightGray;
                IContainer TDRow(IContainer c) => c
                    .DefaultTextStyle(t => t.FontSize(8))
                    .Background(bg)
                    .BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5);

                var mMargin = m.RevenueTjs > 0
                    ? Math.Round(m.ProfitTjs / m.RevenueTjs * 100m, 1)
                    : 0m;

                table.Cell().Element(TDRow).Text($"{MonthLabels[m.Month - 1]} {m.Year}");
                table.Cell().Element(TDRow).AlignRight().Text(FormatMoney(m.RevenueTjs));
                table.Cell().Element(TDRow).AlignRight().Text(FormatMoney(m.CostTjs));
                table.Cell().Element(TDRow).AlignRight()
                    .Text(FormatMoney(m.ProfitTjs))
                    .FontColor(m.ProfitTjs >= 0 ? "#16a34a" : "#dc2626");
                table.Cell().Element(TDRow).AlignRight().Text($"{mMargin}%");
                table.Cell().Element(TDRow).AlignRight().Text(m.ClosedCount.ToString());
            }

            // Totals row
            var s = data.Summary;
            table.Cell().Element(TDTot).Text("Итого");
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(s.RevenueTjs));
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(s.TotalCostTjs));
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(s.ProfitTjs))
                .FontColor(s.ProfitTjs >= 0 ? "#16a34a" : "#dc2626");
            table.Cell().Element(TDTot).AlignRight().Text($"{s.MarginPct}%");
            table.Cell().Element(TDTot).AlignRight().Text(s.ClosedMeasurementsCount.ToString());
        });
    }

    // ── Section: Measurements ─────────────────────────────────────────────────

    private void ComposeMeasurementsSection(ColumnDescriptor col)
    {
        col.Item().Text("Закрытые замеры")
            .FontSize(14).Bold().FontColor(DarkBlue);
        col.Item().PaddingTop(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(3); // Клиент
                c.RelativeColumn(2); // Продукт
                c.ConstantColumn(55); // Замер
                c.ConstantColumn(55); // Посл. платёж
                c.RelativeColumn(2); // Сделка
                c.RelativeColumn(2); // Оплачено
                c.RelativeColumn(2); // Прибыль
                c.ConstantColumn(38); // Маржа%
            });

            static IContainer TH(IContainer c) =>
                c.DefaultTextStyle(t => t.Bold().FontSize(7).FontColor(Colors.White))
                 .Background(DarkBlue).Padding(4);

            table.Header(h =>
            {
                h.Cell().Element(TH).Text("Клиент");
                h.Cell().Element(TH).Text("Продукт");
                h.Cell().Element(TH).Text("Дата замера");
                h.Cell().Element(TH).Text("Посл. платёж");
                h.Cell().Element(TH).AlignRight().Text("Сделка");
                h.Cell().Element(TH).AlignRight().Text("Оплачено");
                h.Cell().Element(TH).AlignRight().Text("Прибыль");
                h.Cell().Element(TH).AlignRight().Text("Маржа%");
            });

            var rowIdx = 0;
            var totDeal = 0m;
            var totPaid = 0m;
            var totProfit = 0m;

            foreach (var m in data.Measurements)
            {
                var bg = rowIdx++ % 2 == 0 ? "#ffffff" : LightGray;
                IContainer TD(IContainer c) => c
                    .DefaultTextStyle(t => t.FontSize(7))
                    .Background(bg)
                    .BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4);

                totDeal += m.DealPriceTjs;
                totPaid += m.TotalPaidTjs;
                totProfit += m.ProfitTjs;

                table.Cell().Element(TD).Column(inner =>
                {
                    inner.Item().Text(m.ClientName).Bold();
                    inner.Item().Text(m.ClientPhone).FontColor(Colors.Grey.Medium);
                });
                table.Cell().Element(TD).Text(m.Product);
                table.Cell().Element(TD).Text(m.MeasuredAt.ToString("dd.MM.yy"));
                table.Cell().Element(TD).Text(m.LastPaymentDate.ToString("dd.MM.yy"));
                table.Cell().Element(TD).AlignRight().Text(FormatMoney(m.DealPriceTjs));
                table.Cell().Element(TD).AlignRight().Text(FormatMoney(m.TotalPaidTjs));
                table.Cell().Element(TD).AlignRight()
                    .Text(FormatMoney(m.ProfitTjs))
                    .FontColor(m.ProfitTjs >= 0 ? "#16a34a" : "#dc2626");
                table.Cell().Element(TD).AlignRight().Text($"{m.MarginPct}%");
            }

            // Totals
            var avgMargin = totDeal > 0 ? Math.Round(totProfit / totDeal * 100m, 1) : 0m;
            static IContainer TDTot(IContainer c) =>
                c.DefaultTextStyle(t => t.FontSize(7).Bold())
                 .Background(LightGray).BorderTop(1).BorderColor(Colors.Grey.Lighten1).Padding(4);

            table.Cell().ColumnSpan(4).Element(TDTot).Text("Итого");
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(totDeal));
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(totPaid));
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(totProfit))
                .FontColor(totProfit >= 0 ? "#16a34a" : "#dc2626");
            table.Cell().Element(TDTot).AlignRight().Text($"{avgMargin}%");
        });
    }

    // ── Section: Factory payments ─────────────────────────────────────────────

    private void ComposeFactoryPaymentsSection(ColumnDescriptor col)
    {
        col.Item().Text("Платежи заводу")
            .FontSize(14).Bold().FontColor(DarkBlue);
        col.Item().PaddingTop(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.ConstantColumn(65);  // Заказ
                c.ConstantColumn(65);  // Дата
                c.RelativeColumn(2);   // Сумма
                c.RelativeColumn(3);   // Комментарий
                c.RelativeColumn(2);   // Статус
                c.RelativeColumn(2);   // Итого по заказу
                c.RelativeColumn(2);   // Долг
            });

            static IContainer TH(IContainer c) =>
                c.DefaultTextStyle(t => t.Bold().FontSize(7).FontColor(Colors.White))
                 .Background(DarkBlue).Padding(4);

            table.Header(h =>
            {
                h.Cell().Element(TH).Text("Заказ");
                h.Cell().Element(TH).Text("Дата");
                h.Cell().Element(TH).AlignRight().Text("Сумма");
                h.Cell().Element(TH).Text("Комментарий");
                h.Cell().Element(TH).Text("Статус");
                h.Cell().Element(TH).AlignRight().Text("Оплачено всего");
                h.Cell().Element(TH).AlignRight().Text("Долг");
            });

            var rowIdx = 0;
            var total = 0m;

            foreach (var p in data.FactoryPayments)
            {
                var bg = rowIdx++ % 2 == 0 ? "#ffffff" : LightGray;
                IContainer TD(IContainer c) => c
                    .DefaultTextStyle(t => t.FontSize(7))
                    .Background(bg)
                    .BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4);

                total += p.AmountTjs;

                table.Cell().Element(TD).Text(p.OrderCode).FontFamily(Fonts.CourierNew);
                table.Cell().Element(TD).Text(p.PaidAt.ToString("dd.MM.yyyy"));
                table.Cell().Element(TD).AlignRight().Text(FormatMoney(p.AmountTjs));
                table.Cell().Element(TD).Text(p.Note ?? "—");
                table.Cell().Element(TD).Text(p.OrderStatus);
                table.Cell().Element(TD).AlignRight().Text(FormatMoney(p.OrderTotalPaidTjs));
                table.Cell().Element(TD).AlignRight()
                    .Text(FormatMoney(p.OrderDebtTjs))
                    .FontColor(p.OrderDebtTjs > 0 ? "#dc2626" : "#16a34a");
            }

            static IContainer TDTot(IContainer c) =>
                c.DefaultTextStyle(t => t.FontSize(7).Bold())
                 .Background(LightGray).BorderTop(1).BorderColor(Colors.Grey.Lighten1).Padding(4);

            table.Cell().ColumnSpan(2).Element(TDTot).Text("Итого");
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(total));
            table.Cell().ColumnSpan(4).Element(TDTot).Text(string.Empty);
        });
    }

    // ── Section: Measurer payouts ─────────────────────────────────────────────

    private void ComposeMeasurerPayoutsSection(ColumnDescriptor col)
    {
        col.Item().Text("Выплаты замерщикам")
            .FontSize(14).Bold().FontColor(DarkBlue);
        col.Item().PaddingTop(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(3); // Замерщик
                c.RelativeColumn(3); // Клиент
                c.ConstantColumn(65); // Дата создания
                c.RelativeColumn(2); // Расчётная
                c.RelativeColumn(2); // Фактическая
                c.ConstantColumn(75); // Статус
                c.ConstantColumn(65); // Дата выплаты
            });

            static IContainer TH(IContainer c) =>
                c.DefaultTextStyle(t => t.Bold().FontSize(7).FontColor(Colors.White))
                 .Background(DarkBlue).Padding(4);

            table.Header(h =>
            {
                h.Cell().Element(TH).Text("Замерщик");
                h.Cell().Element(TH).Text("Клиент");
                h.Cell().Element(TH).Text("Создано");
                h.Cell().Element(TH).AlignRight().Text("Расчётная");
                h.Cell().Element(TH).AlignRight().Text("Фактическая");
                h.Cell().Element(TH).AlignCenter().Text("Статус");
                h.Cell().Element(TH).AlignCenter().Text("Выплачено");
            });

            var rowIdx = 0;
            var totCalc = 0m;
            var totActual = 0m;

            foreach (var p in data.MeasurerPayouts)
            {
                var bg = rowIdx++ % 2 == 0 ? "#ffffff" : LightGray;
                IContainer TD(IContainer c) => c
                    .DefaultTextStyle(t => t.FontSize(7))
                    .Background(bg)
                    .BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4);

                totCalc += p.CalculatedAmountTjs;
                totActual += p.ActualAmountTjs;

                table.Cell().Element(TD).Text(p.MeasurerName);
                table.Cell().Element(TD).Text(p.ClientName);
                table.Cell().Element(TD).Text(p.CreatedAt.ToString("dd.MM.yyyy"));
                table.Cell().Element(TD).AlignRight().Text(FormatMoney(p.CalculatedAmountTjs));
                table.Cell().Element(TD).AlignRight().Text(FormatMoney(p.ActualAmountTjs));

                // Status badge
                var (badgeBg, badgeTxt) = p.IsPaid
                    ? ("#dcfce7", "#15803d")
                    : ("#fef9c3", "#a16207");

                table.Cell().Element(TD).AlignCenter()
                    .Background(badgeBg).Padding(2)
                    .Text(p.IsPaid ? "Выплачено" : "Не выплачено")
                    .FontSize(6).FontColor(badgeTxt).Bold();

                table.Cell().Element(TD).AlignCenter()
                    .Text(p.PaidAt.HasValue ? p.PaidAt.Value.ToString("dd.MM.yyyy") : "—");
            }

            static IContainer TDTot(IContainer c) =>
                c.DefaultTextStyle(t => t.FontSize(7).Bold())
                 .Background(LightGray).BorderTop(1).BorderColor(Colors.Grey.Lighten1).Padding(4);

            table.Cell().ColumnSpan(3).Element(TDTot).Text("Итого");
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(totCalc));
            table.Cell().Element(TDTot).AlignRight().Text(FormatMoney(totActual));
            table.Cell().ColumnSpan(2).Element(TDTot).Text(string.Empty);
        });
    }

    // ── Footer ────────────────────────────────────────────────────────────────

    private void ComposePageFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
            col.Item().PaddingTop(3).Row(row =>
            {
                row.RelativeItem()
                    .Text($"SHISHA_TJ  |  Сгенерировано: {data.GeneratedAt:dd.MM.yyyy HH:mm} UTC")
                    .FontSize(7).FontColor(Colors.Grey.Medium);
                row.RelativeItem().AlignRight()
                    .Text(x =>
                    {
                        x.DefaultTextStyle(t => t.FontSize(7).FontColor(Colors.Grey.Medium));
                        x.Span("Стр. ");
                        x.CurrentPageNumber();
                        x.Span(" / ");
                        x.TotalPages();
                    });
            });
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string FormatMoney(decimal v) =>
        $"{v:N2} TJS";
}
