# SHISHA_TJ — Export Feature Report
Дата: 2026-06-18

---

## Новые зависимости (NuGet)

| Пакет | Версия | Назначение |
|---|---|---|
| `QuestPDF` | 2026.5.0 | PDF-генерация (уже был в проекте) |
| `SkiaSharp` | 3.119.4 | Рендер логотипа SVG → PNG (уже был в проекте) |
| `ClosedXML` | 0.102.3 | Excel-генерация (добавлен) |

---

## Новые эндпоинты

| Метод | Путь | Формат ответа | Роль |
|---|---|---|---|
| `GET` | `/api/v1/analytics/export?from=&to=` | `application/json` | Admin |
| `GET` | `/api/v1/analytics/export/pdf?from=&to=` | `application/pdf` | Admin |
| `GET` | `/api/v1/analytics/export/excel?from=&to=` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Admin |

Валидация на всех трёх: `from` обязателен, `to` обязателен, `to >= from`, диапазон ≤ 2 лет.

Content-Disposition: `attachment; filename="SHISHA_TJ_Report_{from}_{to}.{ext}"`

---

## PDF структура (5 страниц)

| Страница | Содержание |
|---|---|
| 1 | **Обложка**: логотип (SkiaSharp PNG), название, подзаголовок, период, дата генерации |
| 2 | **P&L Сводка**: 4 KPI-блока (Выручка/Себестоимость/Прибыль/Маржа), помесячная таблица с итоговой строкой |
| 3 | **Закрытые замеры**: таблица с клиентом, продуктом, датами, суммами, прибылью по замеру |
| 4 | **Платежи заводу**: таблица по дате платежа с итогами по заказу |
| 5 | **Выплаты замерщикам**: таблица со статусом (зелёный/жёлтый badge), датой выплаты |

Колонтитул на каждой странице: SHISHA_TJ + дата генерации + номер страницы / всего.  
Цветовая схема: тёмно-синий `#1a2744` (заголовки), золотой `#c9a84c` (акценты).

---

## Excel структура (4 листа)

| Лист | Содержание |
|---|---|
| `P&L Сводка` | Заголовок, период, KPI-строки (Выручка/Себестоимость/составляющие/Прибыль/Маржа/Сделки), помесячная таблица |
| `Замеры` | Все закрытые замеры с клиентом, датами, суммами, составляющими себестоимости, прибылью |
| `Платежи заводу` | FactoryPayments в периоде с итогами по заказу и долгом |
| `Выплаты замерщикам` | MeasurerPayouts с цветовой маркировкой статуса (зелёный/жёлтый фон ячейки) |

Общие правила Excel:
- Все числа как числа (не строки), формат `#,##0.00 "TJS"` для денег, `0.0%` для процентов
- Заморозка первой строки (заголовков) на листах 2-4
- `AdjustToContents()` — авто-ширина всех колонок

---

## Backend (новые файлы)

| Файл | Что делает |
|---|---|
| `Application/Analytics/ExportDtos.cs` | DTOs: `ExportDataDto`, `ExportMeasurementDto`, `ExportFactoryPaymentDto`, `ExportMeasurerPayoutDto` |
| `Application/Analytics/IFinancesReportPdfService.cs` | Интерфейс PDF-сервиса |
| `Application/Analytics/IFinancesReportExcelService.cs` | Интерфейс Excel-сервиса |
| `Infrastructure/Pdf/FinancesReportPdfService.cs` | QuestPDF реализация, рендер логотипа через SkiaSharp |
| `Infrastructure/Excel/FinancesReportExcelService.cs` | ClosedXML реализация, 4 листа |

Изменённые файлы:
- `Application/Analytics/IAnalyticsFinancesService.cs` — добавлен `GetExportDataAsync`
- `Infrastructure/Services/AnalyticsFinancesService.cs` — рефактор: выделен `LoadClosedAsync` + `BuildSummary` как приватные хелперы; реализован `GetExportDataAsync`
- `Api/Controllers/AnalyticsController.cs` — 3 новых эндпоинта, общий `ValidateRange`
- `Api/Program.cs` — регистрация двух новых сервисов (Singleton)

---

## Frontend (изменённые файлы)

| Файл | Что изменилось |
|---|---|
| `features/analytics/api.ts` | Добавлен хук `useExportReport()` — fetch с blob download |
| `features/analytics/AnalyticsFinancesPage.tsx` | Две кнопки «Экспорт PDF» / «Экспорт Excel» рядом с «Применить», спиннер во время загрузки |

Хук `useExportReport()`:
- Использует `fetch` напрямую (не axios) — нужен `blob()`
- Токен берёт из `localStorage.getItem('access_token')`
- Имя файла читает из заголовка `Content-Disposition`
- При ошибке — `alert()` (без toast, чтобы не вводить зависимость)
- `isExporting: 'pdf' | 'excel' | null` — блокирует обе кнопки пока одна работает

---

## Известные ограничения

1. **SVG логотип**: конвертация в PNG реализована вручную через SkiaSharp (рисуется тёмный прямоугольник + буква "S"), а не через Svg.Skia, чтобы не добавлять ещё одну зависимость. При смене логотипа потребуется обновить `RenderLogoPng()`.

2. **Большие периоды**: при 2 годах с большим количеством замеров генерация PDF может занять 3-10 секунд — нет progress-индикатора на сервере.

3. **Factory cost allocation**: себестоимость по замеру считается через `GlassCostTjs` из `FactoryOrderItems` (так же как в `ProfitCalculator`), а не через фактические платежи заводу. Если платёж завода охватывает несколько замеров, аллокация производится по-стекольно.

4. **Токен из localStorage**: `useExportReport` читает токен напрямую из `localStorage`. Если проект перейдёт на httpOnly cookie — потребуется рефактор хука.

5. **FluentValidation**: валидация дат на новых эндпоинтах — через ручные проверки в контроллере, не FluentValidation.

6. **Тесты**: unit-тесты для `GetExportDataAsync`, `FinancesReportPdfService` и `FinancesReportExcelService` не написаны.
