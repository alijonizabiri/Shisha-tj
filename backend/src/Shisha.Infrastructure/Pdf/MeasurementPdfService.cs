using System.Text;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Shisha.Application.Measurements;

namespace Shisha.Infrastructure.Pdf;

public sealed class MeasurementPdfService : IMeasurementPdfService
{
    public byte[] Generate(MeasurementResponse measurement, string format) =>
        Document.Create(c => new MeasurementDocument(measurement, format).Compose(c))
                .GeneratePdf();
}

// ── Document ──────────────────────────────────────────────────────────────────

internal sealed class MeasurementDocument(MeasurementResponse m, string format) : IDocument
{
    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(format == "a3" ? PageSizes.A3 : PageSizes.A4);
            page.Margin(15, Unit.Millimetre);
            page.DefaultTextStyle(t => t.FontSize(10));

            page.Header().Element(ComposeHeader);
            page.Content().PaddingTop(8).Element(ComposeBody);
            page.Footer().Element(ComposeFooter);
        });
    }

    // ── Header ────────────────────────────────────────────────────────────────

    private void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem()
                   .Text("SHISHA TJ")
                   .Bold().FontSize(14);

                row.RelativeItem().AlignRight()
                   .Text($"Замер  {m.Id.ToString("N")[..8].ToUpperInvariant()}")
                   .FontSize(10).FontColor(Colors.Grey.Medium);
            });

            col.Item().PaddingBottom(3)
               .Text($"Дата: {m.MeasuredAt:dd.MM.yyyy}")
               .FontSize(8).FontColor(Colors.Grey.Medium);

            col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
        });
    }

    // ── Body ──────────────────────────────────────────────────────────────────

    private void ComposeBody(IContainer container)
    {
        container.Column(col =>
        {
            // Config summary
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(left =>
                {
                    left.Item().Text($"Конфигурация: {LocalizeConfig(m.Configuration)}");
                    left.Item().Text($"Ширина проёма: {m.MeasureMm} мм");
                    left.Item().Text($"Высота: {m.HeightMm} мм");
                });
                row.RelativeItem().Column(right =>
                {
                    right.Item().Text($"Цвет стекла: {LocalizeGlassColor(m.GlassColor)}");
                    right.Item().Text($"Фурнитура: {LocalizeHardwareColor(m.HardwareColor)}");
                    right.Item().Text($"Ручка: {(m.HandleSide == "Right" ? "Правая" : "Левая")}");
                });
            });

            col.Item().PaddingVertical(6).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            // SVG drawing — mirrors the frontend DrawingCanvas exactly
            col.Item()
               .Height(format == "a3" ? 160 : 110, Unit.Millimetre)
               .Svg(BuildCabinSvg());

            // Width labels row (proportional columns matching panel widths)
            col.Item().PaddingTop(2).Row(row =>
            {
                foreach (var glass in m.Glasses.OrderBy(g => g.Position))
                {
                    row.RelativeItem(glass.WidthMm)
                       .AlignCenter()
                       .Text($"{glass.WidthMm}")
                       .FontSize(8).FontColor(Colors.Grey.Medium);
                }
            });

            col.Item().AlignCenter()
               .Text($"Общая ширина: {m.Glasses.Sum(g => g.WidthMm)} мм  ·  Высота: {m.HeightMm} мм")
               .FontSize(8).Bold();

            col.Item().PaddingVertical(6).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            // Glass table
            col.Item().Text("Стёкла").Bold().FontSize(10);
            col.Item().PaddingTop(3).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.ConstantColumn(24);
                    c.RelativeColumn(2);
                    c.RelativeColumn(2);
                    c.RelativeColumn(2);
                    c.RelativeColumn(2);
                    c.RelativeColumn(1);
                });

                static IContainer HeaderCell(IContainer c) =>
                    c.DefaultTextStyle(t => t.Bold().FontSize(9))
                     .BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                     .PaddingBottom(2);

                static IContainer DataCell(IContainer c) =>
                    c.DefaultTextStyle(t => t.FontSize(9))
                     .BorderBottom(1).BorderColor(Colors.Grey.Lighten3)
                     .PaddingVertical(2);

                table.Header(h =>
                {
                    h.Cell().Element(HeaderCell).Text("№");
                    h.Cell().Element(HeaderCell).Text("Тип");
                    h.Cell().Element(HeaderCell).Text("Ширина, мм");
                    h.Cell().Element(HeaderCell).Text("Высота, мм");
                    h.Cell().Element(HeaderCell).Text("Площадь, м²");
                    h.Cell().Element(HeaderCell).Text("Отв.");
                });

                foreach (var g in m.Glasses.OrderBy(g => g.Position))
                {
                    var area = Math.Round((double)g.WidthMm / 1000 * g.HeightMm / 1000, 4);
                    table.Cell().Element(DataCell).Text((g.Position + 1).ToString());
                    table.Cell().Element(DataCell).Text(g.IsDoor ? "Дверь" : "Глухое");
                    table.Cell().Element(DataCell).Text(g.WidthMm.ToString());
                    table.Cell().Element(DataCell).Text(g.HeightMm.ToString());
                    table.Cell().Element(DataCell).Text($"{area:F4}");
                    table.Cell().Element(DataCell).Text(g.Holes.Count.ToString());
                }
            });

            col.Item().PaddingVertical(6).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            // Financials
            var totalWidthMm = m.Glasses.Sum(g => g.WidthMm);
            var areaSqM = Math.Round((double)totalWidthMm / 1000 * m.HeightMm / 1000, 2);
            var masterFee = Math.Round(areaSqM * 120, 2);

            col.Item().Text("Расчёт").Bold().FontSize(10);
            col.Item().PaddingTop(3).Row(row =>
            {
                row.RelativeItem().Text($"Площадь: {areaSqM:F2} м²");
                row.RelativeItem().Text($"Работа мастера: {masterFee:F2} сом");
            });
        });
    }

    // ── SVG cabin drawing ─────────────────────────────────────────────────────

    private string BuildCabinSvg()
    {
        var glasses = m.Glasses.OrderBy(g => g.Position).ToList();
        var totalWidthMm = glasses.Sum(g => g.WidthMm);
        var heightMm = m.HeightMm;
        const int pad = 60;

        var sb = new StringBuilder();
        sb.Append($"""
            <svg viewBox="{-pad} {-pad} {totalWidthMm + pad * 2} {heightMm + pad * 2}"
                 xmlns="http://www.w3.org/2000/svg">
            """);

        float cursorX = 0;
        foreach (var glass in glasses)
        {
            var w = glass.WidthMm;
            var fill = glass.IsDoor ? "#dbeafe" : "#f8fafc";

            sb.Append($"""
                <rect x="{cursorX}" y="0" width="{w}" height="{heightMm}"
                      fill="{fill}" stroke="#334155" stroke-width="2"/>
                """);

            if (glass.IsDoor)
            {
                sb.Append($"""
                    <line x1="{cursorX + 2}" y1="6" x2="{cursorX + w - 2}" y2="6"
                          stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>
                    """);
            }

            var label = glass.IsDoor ? "Дверь" : "Глухое";
            sb.Append($"""
                <text x="{cursorX + w / 2}" y="{heightMm - 20}"
                      text-anchor="middle" font-size="22" fill="#94a3b8">{label}</text>
                """);

            foreach (var hole in glass.Holes)
            {
                var stroke = HoleStroke(hole.HoleType);
                sb.Append($"""
                    <circle cx="{cursorX + hole.XMm}" cy="{hole.YMm}" r="{hole.RadiusMm}"
                            fill="white" stroke="{stroke}" stroke-width="2"/>
                    """);
            }

            // Individual width dimension line
            sb.Append($"""
                <line x1="{cursorX}" y1="{heightMm + 22}" x2="{cursorX + w}" y2="{heightMm + 22}"
                      stroke="#94a3b8" stroke-width="1"/>
                <text x="{cursorX + w / 2}" y="{heightMm + 40}"
                      text-anchor="middle" font-size="18" fill="#64748b">{w}</text>
                """);

            cursorX += w;
        }

        // Total width dimension
        sb.Append($"""
            <line x1="0" y1="{heightMm + 50}" x2="{totalWidthMm}" y2="{heightMm + 50}"
                  stroke="#94a3b8" stroke-width="1"/>
            <text x="{totalWidthMm / 2}" y="{heightMm + 58}"
                  text-anchor="middle" font-size="18" fill="#334155" font-weight="600">{totalWidthMm}</text>
            """);

        // Height dimension
        sb.Append($"""
            <line x1="{totalWidthMm + 22}" y1="0" x2="{totalWidthMm + 22}" y2="{heightMm}"
                  stroke="#94a3b8" stroke-width="1"/>
            <text x="{totalWidthMm + 36}" y="{heightMm / 2}"
                  dominant-baseline="middle" font-size="18" fill="#64748b">{heightMm}</text>
            """);

        sb.Append("</svg>");
        return sb.ToString();
    }

    // ── Footer ────────────────────────────────────────────────────────────────

    private void ComposeFooter(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem()
               .Text("SHISHA TJ — Душанбе, Таджикистан")
               .FontSize(7).FontColor(Colors.Grey.Medium);

            row.RelativeItem().AlignRight()
               .Text(x =>
               {
                   x.DefaultTextStyle(t => t.FontSize(7).FontColor(Colors.Grey.Medium));
                   x.Span("Стр. ");
                   x.CurrentPageNumber();
               });
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string HoleStroke(string holeType) => holeType switch
    {
        "Roller" => "#3b82f6",
        "Handle" => "#1e40af",
        "Mount" => "#64748b",
        _ => "#94a3b8",
    };

    private static string LocalizeConfig(string code) => code switch
    {
        "TwoGlass" => "2 стекла",
        "ThreeGlass" => "3 стекла",
        _ => code,
    };

    private static string LocalizeGlassColor(string code) => code switch
    {
        "Transparent" => "Прозрачное",
        "Matte" => "Матовое",
        "Iodine" => "Йод",
        "Gray" => "Серое",
        "EuroBronze" => "Евробронза",
        _ => code,
    };

    private static string LocalizeHardwareColor(string code) => code switch
    {
        "BlackMatte" => "Матовый чёрный",
        "Gold" => "Золото",
        "Nickel" => "Никель",
        "MatteGold" => "Матовое золото",
        "WetAsphalt" => "Мокрый асфальт",
        _ => code,
    };
}
