using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Shisha.Application.FactoryOrders;
using Shisha.Domain.Entities;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Pdf;

public sealed class FactoryOrderPdfService(AppDbContext db) : IFactoryOrderPdfService
{
    public async Task<byte[]> GenerateAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await db.FactoryOrders
            .Include(o => o.Items)
                .ThenInclude(i => i.Glass)
                    .ThenInclude(g => g.Holes)
            .Include(o => o.Items)
                .ThenInclude(i => i.Glass)
                    .ThenInclude(g => g.Measurement)
                        .ThenInclude(m => m!.Lead)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new NotFoundException($"Factory order {orderId} not found.");

        return Document.Create(c => new FactoryOrderDocument(order).Compose(c)).GeneratePdf();
    }
}

// ── Document ──────────────────────────────────────────────────────────────────

internal sealed class FactoryOrderDocument(FactoryOrder order) : IDocument
{
    private static readonly string[] HoleTypeOrder = ["Roller", "Handle", "Mount", "Custom"];

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
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
        var code = order.Id.ToString("N")[..8].ToUpperInvariant();
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Text("SHISHA TJ").Bold().FontSize(14);
                row.RelativeItem().AlignRight()
                   .Text($"Заказ на завод  {code}")
                   .FontSize(10).FontColor(Colors.Grey.Medium);
            });

            col.Item().PaddingBottom(3).Row(row =>
            {
                row.RelativeItem()
                   .Text($"Создан: {order.CreatedAt:dd.MM.yyyy}")
                   .FontSize(8).FontColor(Colors.Grey.Medium);

                if (order.OrderedAt.HasValue)
                    row.RelativeItem().AlignRight()
                       .Text($"Отправлен: {order.OrderedAt:dd.MM.yyyy}")
                       .FontSize(8).FontColor(Colors.Grey.Medium);
            });

            col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
        });
    }

    // ── Body ──────────────────────────────────────────────────────────────────

    private void ComposeBody(IContainer container)
    {
        var items = order.Items.OrderBy(i => i.CreatedAt).ToList();
        var glassCount = items.Count;
        var reworkCount = items.Count(i => i.IsRework);

        container.Column(col =>
        {
            // Summary
            col.Item().Row(row =>
            {
                row.RelativeItem().Text($"Статус: {LocalizeStatus(order.Status.ToString())}");
                row.RelativeItem().AlignCenter().Text($"Стёкол: {glassCount}").Bold();
                row.RelativeItem().AlignRight()
                   .Text(reworkCount > 0 ? $"Переделок: {reworkCount}" : string.Empty)
                   .FontColor(Colors.Red.Medium);
            });

            if (!string.IsNullOrWhiteSpace(order.Note))
                col.Item().PaddingTop(2)
                   .Text($"Примечание: {order.Note}")
                   .FontSize(8).Italic().FontColor(Colors.Grey.Medium);

            col.Item().PaddingVertical(5).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            // Main table
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.ConstantColumn(20);   // №
                    c.RelativeColumn(3);    // Клиент
                    c.ConstantColumn(52);   // Код
                    c.RelativeColumn(2);    // Тип
                    c.ConstantColumn(36);   // Ш, мм
                    c.ConstantColumn(36);   // В, мм
                    c.RelativeColumn(2);    // Цвет стекла
                    c.RelativeColumn(3);    // Отверстия
                });

                static IContainer HeaderCell(IContainer c) =>
                    c.DefaultTextStyle(t => t.Bold().FontSize(8))
                     .Background(Colors.Grey.Lighten4)
                     .BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                     .Padding(3);

                static IContainer DataCell(IContainer c) =>
                    c.DefaultTextStyle(t => t.FontSize(8))
                     .BorderBottom(1).BorderColor(Colors.Grey.Lighten3)
                     .Padding(3);

                static IContainer ReworkCell(IContainer c) =>
                    c.DefaultTextStyle(t => t.FontSize(8).FontColor(Colors.Red.Medium))
                     .BorderBottom(1).BorderColor(Colors.Red.Lighten3)
                     .Background(Colors.Red.Lighten5)
                     .Padding(3);

                table.Header(h =>
                {
                    h.Cell().Element(HeaderCell).Text("№");
                    h.Cell().Element(HeaderCell).Text("Клиент");
                    h.Cell().Element(HeaderCell).Text("Код");
                    h.Cell().Element(HeaderCell).Text("Тип");
                    h.Cell().Element(HeaderCell).Text("Ш, мм");
                    h.Cell().Element(HeaderCell).Text("В, мм");
                    h.Cell().Element(HeaderCell).Text("Цвет");
                    h.Cell().Element(HeaderCell).Text("Отверстия");
                });

                var rowNum = 0;
                foreach (var item in items)
                {
                    rowNum++;
                    var glass = item.Glass;
                    var cell = item.IsRework
                        ? (Func<IContainer, IContainer>)ReworkCell
                        : DataCell;

                    var clientName = glass?.Measurement?.Lead?.Name ?? "—";
                    var glassCode = glass is not null
                        ? glass.Id.ToString("N")[..8].ToUpperInvariant()
                        : "—";

                    var typeLabel = item.IsRework
                        ? $"{(glass?.IsDoor == true ? "Дверь" : "Глухое")} ⟳"
                        : (glass?.IsDoor == true ? "Дверь" : "Глухое");

                    var glassColor = glass?.Measurement is not null
                        ? LocalizeGlassColor(glass.Measurement.GlassColor.ToString())
                        : "—";

                    var holesSummary = glass is not null
                        ? FormatHoles(glass.Holes)
                        : "—";

                    table.Cell().Element(cell).Text(rowNum.ToString());
                    table.Cell().Element(cell).Text(clientName);
                    table.Cell().Element(cell).Text(glassCode).FontFamily(Fonts.CourierNew);
                    table.Cell().Element(cell).Text(typeLabel);
                    table.Cell().Element(cell).Text(glass?.WidthMm.ToString() ?? "—");
                    table.Cell().Element(cell).Text(glass?.HeightMm.ToString() ?? "—");
                    table.Cell().Element(cell).Text(glassColor);
                    table.Cell().Element(cell).Text(holesSummary);
                }
            });

            // Rework legend (only shown when there are rework items)
            if (reworkCount > 0)
            {
                col.Item().PaddingTop(6).Text("⟳ — переделка")
                   .FontSize(7).FontColor(Colors.Red.Medium).Italic();
            }

            // Hole detail section
            var itemsWithHoles = items
                .Where(i => i.Glass?.Holes.Count > 0)
                .ToList();

            if (itemsWithHoles.Count > 0)
            {
                col.Item().PaddingVertical(6).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                col.Item().Text("Расположение отверстий").Bold().FontSize(10);
                col.Item().PaddingTop(4).Table(holeTable =>
                {
                    holeTable.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(52);  // Код стекла
                        c.RelativeColumn(2);   // Тип
                        c.ConstantColumn(40);  // X, мм
                        c.ConstantColumn(40);  // Y, мм
                        c.ConstantColumn(40);  // r, мм
                    });

                    static IContainer HHCell(IContainer c) =>
                        c.DefaultTextStyle(t => t.Bold().FontSize(8))
                         .Background(Colors.Grey.Lighten4)
                         .BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                         .Padding(3);

                    static IContainer HDCell(IContainer c) =>
                        c.DefaultTextStyle(t => t.FontSize(8))
                         .BorderBottom(1).BorderColor(Colors.Grey.Lighten3)
                         .Padding(3);

                    holeTable.Header(h =>
                    {
                        h.Cell().Element(HHCell).Text("Код");
                        h.Cell().Element(HHCell).Text("Тип отв.");
                        h.Cell().Element(HHCell).Text("X, мм");
                        h.Cell().Element(HHCell).Text("Y, мм");
                        h.Cell().Element(HHCell).Text("r, мм");
                    });

                    foreach (var item in itemsWithHoles)
                    {
                        var glass = item.Glass!;
                        var glassCode = glass.Id.ToString("N")[..8].ToUpperInvariant();

                        foreach (var hole in glass.Holes.OrderBy(h => h.YMm).ThenBy(h => h.XMm))
                        {
                            holeTable.Cell().Element(HDCell)
                                     .Text(glassCode).FontFamily(Fonts.CourierNew).FontSize(7);
                            holeTable.Cell().Element(HDCell).Text(LocalizeHoleType(hole.HoleType.ToString()));
                            holeTable.Cell().Element(HDCell).Text(hole.XMm.ToString());
                            holeTable.Cell().Element(HDCell).Text(hole.YMm.ToString());
                            holeTable.Cell().Element(HDCell).Text(hole.RadiusMm.ToString());
                        }
                    }
                });
            }
        });
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

    private static string FormatHoles(ICollection<Hole> holes)
    {
        if (holes.Count == 0) return "—";

        var groups = holes
            .GroupBy(h => h.HoleType.ToString())
            .OrderBy(g => Array.IndexOf(HoleTypeOrder, g.Key))
            .Select(g => $"{LocalizeHoleType(g.Key)}: {g.Count()}");

        return string.Join("  ", groups);
    }

    private static string LocalizeHoleType(string type) => type switch
    {
        "Roller" => "Ролик",
        "Handle" => "Ручка",
        "Mount"  => "Крепёж",
        _        => "Прочее",
    };

    private static string LocalizeStatus(string status) => status switch
    {
        "Draft"    => "Черновик",
        "Sent"     => "Отправлен",
        "Received" => "Получен",
        "Closed"   => "Закрыт",
        _          => status,
    };

    private static string LocalizeGlassColor(string code) => code switch
    {
        "Transparent" => "Прозрачное",
        "Matte"       => "Матовое",
        "Iodine"      => "Йод",
        "Gray"        => "Серое",
        "EuroBronze"  => "Евробронза",
        _             => code,
    };
}
