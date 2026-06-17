# SHISHA_TJ — Phase 1 Fixes Report
Дата: 2026-06-17

## Шаг 0 — Документация

### `docs/Database.md`
- Раздел **`### leads`**: убран `status` и связанные поля из таблицы; добавлено явное примечание, что `Lead` — только контакт-контейнер (имя/телефон/продукт/источник/дата звонка), а Kanban-статус и финансовые поля перенесены на `Measurement` миграцией `MoveStatusToMeasurement` (Phase 3.5 Step 14).
- Раздел **`### measurements`**: добавлены поля `status`, `assigned_measurer_id`, `refusal_reason_id`, `refusal_note`, `product` с примечанием "moved from `leads.*`"; уточнено, что `measurer_id`/`lead_id` теперь nullable.
- Раздел **`## Indexes`**: `leads.status` заменён на `measurements.status` с пометкой о переносе.
- Раздел **`## Migration plan`**: добавлены пункты 9 (`MoveStatusToMeasurement`) и 10 (`AddProductToMeasurement`) — они существовали в коде ([backend/src/Shisha.Infrastructure/Persistence/Migrations](backend/src/Shisha.Infrastructure/Persistence/Migrations)), но не были описаны в docs.

### `docs/StateMachines.md`
- Заголовок секции: `## Lead status transitions` → `## Measurement status transitions`, добавлено вступление о переносе state machine с `Lead` на `Measurement` (миграция `MoveStatusToMeasurement`).
- Таблица **"Allowed transitions"**: переписана построчно под фактическую реализацию `MeasurementStatusTransitionService.ApplyTransition` — в частности:
  - `Measurement → Thinking` требует **≥1 стекла у этого замера** (`GLASSES_REQUIRED`), а не "lead has ≥1 measurement" (это больше не имеет смысла, т.к. state machine теперь на Measurement).
  - `OrderedAtFactory → GlassArrived` и `Installed → Closed` честно помечены как **не enforced** в `ApplyTransition` (доки раньше обещали проверки, которых в коде нет) — это не моя задача чинить в Фазе 1, только задокументировать как есть.
  - Добавлена новая строка `Buying → OrderedAtFactory` с описанием defense-in-depth проверки депозита (добавлена в Шаге 1).
- Новый раздел **"Factory order auto-creation (Buying → OrderedAtFactory)"** — описывает фактическое поведение `AutoCreateFactoryOrderAsync`: система сама создаёт `Draft`-заказ при переходе, а не требует существующий `Sent`-заказ (как было неверно написано в старой версии docs).
- Таблица **"Error codes"**: `MEASUREMENT_REQUIRED` заменён на `GLASSES_REQUIRED` (соответствует реальному коду), добавлено примечание про `DEPOSIT_BELOW_MINIMUM` теперь и на `OrderedAtFactory`.
- Раздел **"API enforcement"**: `LeadStatusTransitionService`/`LeadService` → `MeasurementStatusTransitionService`/`MeasurementService`, `LeadTransitionArgs` → `MeasurementTransitionArgs`; добавлен пункт про `AutoCreateFactoryOrderAsync`.
- Раздел **"Factory order status"**, переход `Received → Closed`: уточнено, что авто-закрытие триггерится переходом **Measurement** (не Lead) в `Installed` и реализовано в `MeasurementService.PatchStatusAsync` (соответствует коду, добавленному в Шаге 2).

## Шаг 1 — Защита аванса перед OrderedAtFactory
- Файл: [backend/src/Shisha.Application/Measurements/MeasurementStatusTransitionService.cs](backend/src/Shisha.Application/Measurements/MeasurementStatusTransitionService.cs), новый `case LeadStatus.OrderedAtFactory` добавлен сразу после `case LeadStatus.Buying:` (строки ~67-72 после правки).
- Логика: если `args.DepositSumTjs < LeadBusinessRules.MinDepositTjs` → бросается `DomainValidationException`.
- Текст ошибки (идентичен проверке на `Buying`, для консистентности):
  ```
  DEPOSIT_BELOW_MINIMUM: A deposit of at least {LeadBusinessRules.MinDepositTjs} TJS is required.
  ```
- Комментарий в коде поясняет, что это defense-in-depth (Buying уже требует депозит, но повторная проверка защищает от будущих обходов).
- Другие `case`'ы (`Refused`, `Installed`, `New`) не тронуты.

## Шаг 2 — Автозакрытие FactoryOrder
- Файл: [backend/src/Shisha.Infrastructure/Services/MeasurementService.cs](backend/src/Shisha.Infrastructure/Services/MeasurementService.cs):
  - В `PatchStatusAsync`, после существующих веток `if (target == LeadStatus.Closed)` и `if (target == LeadStatus.OrderedAtFactory)`, добавлен вызов `if (target == LeadStatus.Installed) await CloseFactoryOrdersIfFullyInstalledAsync(id, ct);` — перед `SaveChangesAsync`.
  - Новый приватный метод `CloseFactoryOrdersIfFullyInstalledAsync(Guid measurementId, CancellationToken ct)` добавлен в секции "Factory order auto-close" (после `PatchStatusAsync`).
- Условие закрытия:
  1. Находит все `FactoryOrderItem`, чьё `Glass.MeasurementId == measurementId`, и собирает уникальные `FactoryOrderId`.
  2. Если таких заказов нет — выходит без побочных эффектов (без исключений).
  3. Загружает связанные `FactoryOrder` со статусом `Received` (включая `Items.Glass.Measurement`).
  4. Для каждого такого заказа: если **все** items его коллекции указывают на замеры со статусом `Installed` — переводит заказ в `FactoryOrderStatus.Closed`.
- Важный нюанс (учтён): на момент вызова текущий `measurement.Status` уже изменён в памяти (`transitionService.TransitionAsync` мутирует трекаемую сущность), но ещё не сохранён в БД — за счёт identity map EF Core тот же трекаемый объект подставляется в `Glass.Measurement`, поэтому проверка `== LeadStatus.Installed` для **текущего** замера корректна без предварительного `SaveChangesAsync`.
- Сборка `dotnet build` для `Shisha.Infrastructure` — 0 ошибок, 0 предупреждений.

## Шаг 3 — Защита от переплаты
- Файл: [backend/src/Shisha.Infrastructure/Services/PaymentService.cs](backend/src/Shisha.Infrastructure/Services/PaymentService.cs), метод `CreateAsync`:
  - Результат `db.Measurements.FindAsync(...)` больше не дискардится (`_ =`) — сохранён в переменную `measurement`, т.к. теперь нужен `DealPriceTjs`.
  - После проверки `amountTjs != 0` добавлен блок: если `measurement.DealPriceTjs` задан и `kind != PaymentKind.Refund`, считает `currentTotal = SUM(Payments где MeasurementId == request.MeasurementId && Kind != Refund)` и сравнивает `currentTotal + request.AmountTjs > dealPrice`.
  - Добавлен `using Microsoft.EntityFrameworkCore;` (нужен для `SumAsync`).
- Текст ошибки (`DomainValidationException`, поле `amountTjs`):
  ```
  Сумма платежей превысит согласованную цену сделки ({dealPrice} TJS). Текущий остаток: {remaining} TJS
  ```
- `Refund`-платежи не блокируются — могут уводить баланс ниже нуля, как и требовалось.
- Сборка `dotnet build` для `Shisha.Infrastructure` — 0 ошибок, 0 предупреждений.

## Финальная проверка
`dotnet build` всего solution (`backend/`) — **Build succeeded, 0 Warning(s), 0 Error(s)** (все 7 проектов: Domain, Application, Infrastructure, Domain.Tests, Application.Tests, Api, Api.IntegrationTests).

## Что НЕ тронуто
- Никаких EF Core миграций не создано — схема БД не изменена (все 3 кодовых фикса — чисто логика в существующих полях/таблицах).
- Существующие публичные эндпоинты (маршруты, контракты запросов/ответов) не изменены — изменения только во внутренней логике сервисов.
- Frontend (`frontend/`) не тронут.
- Тесты не добавлены и не изменены (xUnit-проекты собираются, но новые сценарии — Шаг 1/2/3 — не покрыты тестами; стоит добавить отдельным шагом).
- Не реализовано: `MeasurerPayout`, статус оплаты `FactoryOrder`, периодический P&L-отчёт, FluentValidation-валидаторы — это вне рамок Фазы 1 (см. `finance_audit.md`, раздел 5).

## Следующие шаги (Фаза 2)
- **MeasurerPayout** — требует ответа заказчика:
  1. Выплата замерщику — фиксированная сумма или % от `dealPriceTjs`?
  2. Оплата заводу (`FactoryOrder.FactoryTotalTjs`) — одним платежом или частями (нужна отдельная сущность типа `FactoryPayment`)?
- До получения ответов — не начинать Шаг 4/5 из `finance_audit.md` (бизнес-правила нельзя додумывать самостоятельно, согласно `CLAUDE.md`).
