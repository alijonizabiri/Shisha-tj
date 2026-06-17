# SHISHA_TJ — Finance System Audit

Дата: 2026-06-17
Ветка: `vision`
Область: `backend/src` (Domain/Application/Infrastructure/Api), `frontend/src/features`

---

## 1. Существующие финансовые сущности

Все денежные суммы — `decimal(18,2)` в TJS. Привязка везде идёт через `MeasurementId`, **не** через `LeadId` — это уже соответствует требованию "финансы живут на Measurement" (мигрировано в `MoveFinancesToMeasurement`, см. `docs/Database.md:242`).

### `Measurement` — [Measurement.cs](backend/src/Shisha.Domain/Entities/Measurement.cs)
Главная сущность сделки. После рефактора (commit `79832ff`/state-machine move) она держит **и** замер, **и** статус Kanban, **и** деньги.

| Поле | Тип | Назначение |
|---|---|---|
| `DealPriceTjs` | `decimal?` | согласованная цена с клиентом |
| `DeliveryCostTjs` | `decimal?` | если задано — перекрывает `Expenses` с `Kind=Delivery` |
| `Status` | `LeadStatus` (enum) | Kanban-статус (бывший `Lead.Status`) |
| `Payments` | `ICollection<Payment>` | 1→N |
| `Expenses` | `ICollection<Expense>` | 1→N, nullable FK на стороне Expense |
| `Hardware` | `Hardware?` | 1→1 |

⚠️ **Важно**: `Lead` теперь не имеет `Status` — он остался только контейнером контактных данных (имя/телефон/продукт). State machine и деньги полностью на `Measurement`. `docs/Database.md` и `docs/StateMachines.md` **описывают старую модель** (статус и переходы на `Lead`) — документация не синхронизирована с кодом (см. раздел 4).

### `Payment` — [Payment.cs](backend/src/Shisha.Domain/Entities/Payment.cs)
| Поле | Тип | Связь |
|---|---|---|
| `MeasurementId` | `Guid` NOT NULL | FK → Measurement ✅ |
| `AmountTjs` | `decimal` | положительное = получено, отрицательное = возврат |
| `Kind` | `PaymentKind` enum | `Deposit \| Balance \| Refund` |
| `PaidAt` | `DateOnly` | |
| `Note` | `string?` | |

Enum [PaymentKind.cs](backend/src/Shisha.Domain/Enums/PaymentKind.cs): `Deposit, Balance, Refund`.

### `Expense` — [Expense.cs](backend/src/Shisha.Domain/Entities/Expense.cs)
| Поле | Тип | Связь |
|---|---|---|
| `MeasurementId` | `Guid?` | nullable — глобальные расходы без привязки |
| `AmountTjs` | `decimal` | |
| `Kind` | `ExpenseKind` enum | `Delivery \| Rework \| Other` |
| `Description` | `string?` | |
| `SpentAt` | `DateOnly` | |

Enum [ExpenseKind.cs](backend/src/Shisha.Domain/Enums/ExpenseKind.cs): `Delivery, Rework, Other`.

### `Hardware` — [Hardware.cs](backend/src/Shisha.Domain/Entities/Hardware.cs)
| Поле | Тип | Связь |
|---|---|---|
| `MeasurementId` | `Guid` NOT NULL, unique | 1 комплект на замер |
| `Color` | `HardwareColor` enum | |
| `CostTjs` | `decimal` | себестоимость комплекта |
| `PurchasedAt` | `DateOnly?` | |

### `FactoryOrder` — [FactoryOrder.cs](backend/src/Shisha.Domain/Entities/FactoryOrder.cs)
Партия заказа на завод. **Не привязана к Measurement напрямую** — связь идёт через `FactoryOrderItem.GlassId → Glass.MeasurementId`.

| Поле | Тип |
|---|---|
| `Status` | `FactoryOrderStatus` enum: `Draft, Sent, Received, Closed` |
| `OrderedAt` / `ReceivedAt` | `DateOnly?` |
| `FactoryTotalTjs` | `decimal?` — сколько заплатили заводу за партию (не за единицу) |
| `Items` | `ICollection<FactoryOrderItem>` |

### `FactoryOrderItem` — [FactoryOrderItem.cs](backend/src/Shisha.Domain/Entities/FactoryOrderItem.cs)
| Поле | Тип |
|---|---|
| `GlassId` | `Guid` → `Glass` (которое → `Measurement`) |
| `GlassCostTjs` | `decimal?` — себестоимость конкретного стекла |
| `IsRework` | `bool` |
| `ReworkReason` | `ReworkReason?` enum: `FactoryError, MeasurerError` |

### Сущностей нет (искал по всей кодовой базе, не нашёл ни одного упоминания)
- **Invoice** — не существует как отдельная сущность (есть только `factory_total_tjs` на `FactoryOrder` и `glass_cost_tjs` на item).
- **MeasurerPayment / Salary** — не существует. Поиск по `measurer.*pay|MeasurerPayment|salary|Salary|комиссия|зарплат` по всему `backend/src` дал **0 совпадений**.
- **Расчёт долга клиента** — не отдельная сущность, но *вычисляется* (см. ниже).

---

## 2. Существующие API эндпоинты

| Метод | Путь | Контроллер | Что делает |
|---|---|---|---|
| `POST` | `/api/v1/payments` | [PaymentsController.cs:14](backend/src/Shisha.Api/Controllers/PaymentsController.cs#L14) | создать платёж (Admin, Operator) |
| `DELETE` | `/api/v1/payments/{id}` | [PaymentsController.cs:22](backend/src/Shisha.Api/Controllers/PaymentsController.cs#L22) | удалить платёж (Admin только) |
| `GET` | `/api/v1/measurements/{id}/finances` | [MeasurementsController.cs:75](backend/src/Shisha.Api/Controllers/MeasurementsController.cs#L75) | `MeasurementFinancesDto` — себестоимость/прибыль/долг по замеру |
| `GET` | `/api/v1/leads/{id}/finances` | [LeadsController.cs:36](backend/src/Shisha.Api/Controllers/LeadsController.cs#L36) | `LeadFinancesDto` — агрегат по всем замерам лида |
| `GET` | `/api/v1/factory-orders` | [FactoryOrdersController.cs:16](backend/src/Shisha.Api/Controllers/FactoryOrdersController.cs#L16) | список заказов (фильтр по статусу/датам) |
| `GET` | `/api/v1/factory-orders/{id}` | [FactoryOrdersController.cs:30](backend/src/Shisha.Api/Controllers/FactoryOrdersController.cs#L30) | детали заказа + items |
| `POST` | `/api/v1/factory-orders` | [FactoryOrdersController.cs:37](backend/src/Shisha.Api/Controllers/FactoryOrdersController.cs#L37) | создать Draft-заказ из списка стёкол |
| `PATCH` | `/api/v1/factory-orders/{id}/send` | [FactoryOrdersController.cs:46](backend/src/Shisha.Api/Controllers/FactoryOrdersController.cs#L46) | Draft → Sent |
| `PATCH` | `/api/v1/factory-orders/{id}/receive` | [FactoryOrdersController.cs:54](backend/src/Shisha.Api/Controllers/FactoryOrdersController.cs#L54) | Sent → Received, проставляет `FactoryTotalTjs` и `glass_cost_tjs` по items |
| `POST` | `/api/v1/factory-orders/{id}/items/{itemId}/rework` | [FactoryOrdersController.cs:62](backend/src/Shisha.Api/Controllers/FactoryOrdersController.cs#L62) | создать rework-item |
| `GET` | `/api/v1/factory-orders/{id}/pdf` | [FactoryOrdersController.cs:70](backend/src/Shisha.Api/Controllers/FactoryOrdersController.cs#L70) | PDF заказа |
| `GET` | `/api/v1/analytics/dashboard` | [AnalyticsController.cs:13](backend/src/Shisha.Api/Controllers/AnalyticsController.cs#L13) | сводка (Admin только) |
| `GET` | `/api/v1/analytics/funnel` | [AnalyticsController.cs:20](backend/src/Shisha.Api/Controllers/AnalyticsController.cs#L20) | конверсия по статусам |
| `GET` | `/api/v1/analytics/by-product` `/by-color` `/by-measurer` `/refusals` | [AnalyticsController.cs](backend/src/Shisha.Api/Controllers/AnalyticsController.cs) | разрезы аналитики |
| `PATCH` | `/api/v1/measurements/{id}/status` | [MeasurementsController.cs:102](backend/src/Shisha.Api/Controllers/MeasurementsController.cs#L102) | смена статуса с финансовыми гейтами (депозит/баланс) |

Нет ни одного эндпоинта `PATCH /payments/{id}`, `PUT /expenses`, `/hardware` или чего-то для выплат замерщику — их API просто не существует (нет и контроллера `ExpensesController`/`HardwareController`; expenses/hardware, судя по всему, заполняются только как часть `Measurement` create/update, не отдельными запросами — нужно перепроверить, но отдельных публичных CRUD для Expense/Hardware в `Controllers/` нет).

---

## 3. Что есть / чего нет

| # | Требование | Статус | Комментарий |
|---|---|---|---|
| 1 | Платежи от клиента (аванс/остаток/частичная оплата) | ✅ | `Payment` + `PaymentKind.Deposit/Balance/Refund`, `POST /api/v1/payments` — поддерживает множественные частичные платежи |
| 2 | FactoryOrder с суммой и статусом оплаты | ⚠️ | `FactoryTotalTjs` есть, но это сумма **за всю партию**, не "статус оплаты" (нет `IsPaid`/`PaidAt`/частичной оплаты заводу) |
| 3 | Выплата замерщику (фикс/%) | ❌ | Сущности `MeasurerPayment` нет вообще. `MasterFee = area_m2 * 120` считается **только как виртуальная статья себестоимости** в `ProfitCalculator` — не как реальный платёж замерщику, нет записи о факте выплаты |
| 4 | Расчёт долга клиента (`TotalPrice − платежи`) | ✅ | `balanceDue = DealPriceTjs - SUM(payments)` в [ProfitCalculator.cs:168](backend/src/Shisha.Infrastructure/Services/ProfitCalculator.cs#L168) и `:89` (по лиду) |
| 5 | Блокировка перехода в `OrderedAtFactory` без аванса | ⚠️ частично | Депозит ≥100 TJS проверяется на переходе `Measurement→Buying` ([MeasurementStatusTransitionService.cs:58-65](backend/src/Shisha.Application/Measurements/MeasurementStatusTransitionService.cs#L58-L65)), но переход `Buying→OrderedAtFactory` **сам по себе не имеет проверки** (нет `case LeadStatus.OrderedAtFactory` в `ApplyTransition`). Защита работает только транзитивно (раз дошёл до Buying — депозит уже был). Если бизнес-правило именно "нельзя в AtFactory без аванса напрямую" — сейчас это не проверяется на этом конкретном переходе |
| 6 | Агрегирующие эндпоинты (выручка/себестоимость/маржа) | ⚠️ частично | Есть `GET /leads/{id}/finances` и `/measurements/{id}/finances` (по одной сущности), и `analytics/dashboard` (общие воронки). **Нет** периодического отчёта вида "выручка/себестоимость/маржа за месяц/период" по всем замерам сразу |

---

## 4. Проблемы и несоответствия

1. **Документация устарела относительно кода.** `docs/Database.md:60-79` и весь `docs/StateMachines.md` описывают `Status` на `Lead`. В реальности `Lead.cs` ([Lead.cs](backend/src/Shisha.Domain/Entities/Lead.cs)) этого поля не содержит — статус и связанные с ним поля (`AssignedMeasurerId`, `RefusalReasonId`, `RefusalNote`) переехали в `Measurement.cs:13-16`. Это сделано в Phase 3.5 Step 14 (см. `CLAUDE.md` "Current Status"), но `docs/` не обновлены. Любой будущий агент, читающий только docs, будет проектировать против неверной модели.

2. **Транзитивная, а не явная защита аванса перед AtFactory.** [MeasurementStatusTransitionService.cs:48-91](backend/src/Shisha.Application/Measurements/MeasurementStatusTransitionService.cs#L48-L91) — `switch (to)` не содержит `case LeadStatus.OrderedAtFactory`. Если в будущем появится прямой переход или баг в проверке `Buying`, ничего не помешает попасть в `OrderedAtFactory` без аванса. Также не соответствует тексту `docs/StateMachines.md:25` ("Buying → OrderedAtFactory: lead's glasses in a factory order with status ≥ Sent") — по факту проверки такой нет, вместо этого `MeasurementService.AutoCreateFactoryOrderAsync` ([MeasurementService.cs:374-403](backend/src/Shisha.Infrastructure/Services/MeasurementService.cs#L374-L403)) сам создаёт `Draft`-заказ при переходе. Поведение инвертировано относительно документации: раньше предполагалось "нет перехода без существующего Sent-заказа", сейчас "переход создаёт заказ сам".

3. **`FactoryOrderStatus.Closed` никогда не устанавливается.** Grep по всей кодовой базе на `FactoryOrderStatus.Closed` находит только сравнения (`!= Closed`), но ни одного места присваивания. `docs/StateMachines.md:65` обещает "Received → Closed: all items installed (auto when last lead → Installed)" — это не реализовано. Заказы зависают в `Received` навечно.

4. **Нет выплаты замерщику как факта.** `MasterFee` — это расчётная себестоимость (`area_m2 * 120` TJS), используемая только для вычисления маржи. Нет ни сущности, ни эндпоинта, фиксирующего, что замерщику физически заплатили (дата, сумма, статус "выплачено/не выплачено"). Если ставка не всегда `120/м²` (фикс или % от суммы — как спрашивает заказчик), сейчас это вообще невозможно настроить — константа `MasterFeePerSqM = 120m` зашита в [ProfitCalculator.cs:11](backend/src/Shisha.Infrastructure/Services/ProfitCalculator.cs#L11).

5. **Нет периодического P&L-отчёта.** `analytics/*` эндпоинты дают воронку, отказы, разрезы по продукту/цвету/замерщику, но не агрегированную выручку/себестоимость/маржу за произвольный период по всем замерам (только по одному lead/measurement за раз).

6. **Нет валидации на уровне FluentValidation.** Несмотря на то, что `CLAUDE.md` указывает FluentValidation как обязательный стек, по всему `backend/src` не нашлось ни одного класса `*Validator`. Валидация платежей (`amountTjs != 0`, парсинг `kind`) сделана вручную в `PaymentService.CreateAsync` ([PaymentService.cs:19-23](backend/src/Shisha.Infrastructure/Services/PaymentService.cs#L19-L23)) — рабочее, но не соответствует архитектурному документу.

7. **Нет защиты от переплаты / некорректного refund.** `PaymentService.CreateAsync` не проверяет, что `SUM(payments) <= DealPriceTjs` (кроме как через статус-гейт на переходе в Installed, который проверяет только что баланс **достаточен**, а не что он не превышен), и не проверяет, что `Refund` не сделает баланс отрицательным сверх уплаченного.

8. **FactoryOrder не привязан к Measurement напрямую** — связь идёт только через `Item → Glass → MeasurementId`. Формально это нормально (FactoryOrder — это партия, может содержать стёкла разных замеров), но усложняет любые будущие отчёты "сколько мы должны заводу по конкретному замеру" — расчёт всегда требует JOIN через Glass.

---

## 5. План реализации

Ниже — порядок добавления функционала, который закрывает пробелы из разделов 3-4. Каждый шаг — отдельный `[BE]`/`[FE]`/`[FULL]` шаг в духе `docs/PROGRESS.md`.

### Шаг 0 — Синхронизировать документацию (предварительно, без кода)
- Обновить `docs/Database.md` и `docs/StateMachines.md`: перенести описание `Status`/переходов с `Lead` на `Measurement`, описать фактическое поведение `AutoCreateFactoryOrderAsync`.
- Зависимость: ничего. Делать первым, иначе следующие шаги будут проектироваться против неверного описания.

### Шаг 1 — `[BE]` Явная защита аванса перед `OrderedAtFactory`
- В `MeasurementStatusTransitionService.ApplyTransition` добавить `case LeadStatus.OrderedAtFactory`, проверяющий `args.DepositSumTjs >= LeadBusinessRules.MinDepositTjs` (повторная защита — defense in depth, не полагаться только на транзитивность через Buying).
- Тест: переход Measurement→Buying→OrderedAtFactory без депозита должен быть невозможен на любом из двух шагов.
- Зависимость: нет (чисто доменная логика, уже есть нужные данные в `MeasurementTransitionArgs`).

### Шаг 2 — `[BE]` Закрытие `FactoryOrder` при установке `Installed`
- В `MeasurementService.PatchStatusAsync`, в блоке `if (target == LeadStatus.Installed)`, найти связанный `FactoryOrder` (через Glass→Item) и, если все его items установлены (все замеры, чьи стёкла в заказе, имеют `Status == Installed`), перевести заказ в `Closed`.
- Зависимость: Шаг 1 не обязателен, но логически идёт следом — оба трогают `MeasurementService`/`MeasurementStatusTransitionService`.

### Шаг 3 — `[BE]` Защита от переплаты/некорректного возврата
- В `PaymentService.CreateAsync` добавить проверку: если `measurement.DealPriceTjs` задан, новая сумма платежей (с учётом текущего) не должна делать `TotalPaid > DealPriceTjs` для `Deposit/Balance` (опционально — мягкое предупреждение, не хард-блок, бизнес может разрешить переплату на возврат брака; уточнить у заказчика перед кодированием — это бизнес-правило, не додумывать).
- Зависимость: нет.

### Шаг 4 — `[FULL]` Сущность `MeasurerPayout` (выплата замерщику)
Самый крупный шаг — закрывает п.3 чеклиста.

**Backend, в порядке:**
1. Entity `MeasurerPayout` (`Shisha.Domain/Entities`): `Id, TenantId, MeasurementId (Guid, FK→Measurement), MeasurerId (Guid, FK→User), Mode (enum: Fixed|Percent), RateOrAmountTjs (decimal), CalculatedAmountTjs (decimal), PaidAt (DateOnly?), Note (string?)`, + soft-delete/audit.
2. Enum `MeasurerPayoutMode { Fixed, Percent }`.
3. EF Configuration + migration `AddMeasurerPayouts`.
4. `IMeasurerPayoutService` + impl в Infrastructure: `CreateAsync` (считает `CalculatedAmountTjs` из `DealPriceTjs * Rate/100` или фикс. суммы), `MarkPaidAsync`, `GetByMeasurementAsync`.
5. `MeasurerPayoutsController`: `POST /api/v1/measurer-payouts`, `PATCH /{id}/mark-paid`, `GET /api/v1/measurements/{id}/measurer-payout`.
6. Заменить хардкод `MasterFeePerSqM = 120m` в `ProfitCalculator` на чтение `MeasurerPayout.CalculatedAmountTjs`, если запись существует, иначе fallback на старую формулу (для замеров без явного payout) — обязательно уточнить у заказчика, должна ли старая формула (`area*120`) остаться как дефолт или полностью замениться.

**Frontend (после backend):**
7. `features/measurements`: добавить блок "Выплата замерщику" в карточку замера — форма (режим Fixed/Percent, сумма/ставка), кнопка "Отметить выплаченным".
8. Хук `useMeasurerPayout` (TanStack Query) + Zod-схема ответа.

Зависимость: требует `Measurement.DealPriceTjs` (уже есть) и роль `Measurer` на `User` (уже есть).

### Шаг 5 — `[BE]` Статус оплаты `FactoryOrder`
- Добавить на `FactoryOrder`: `FactoryPaidAmountTjs (decimal default 0)`, вычисляемое поле `FactoryDebtTjs = FactoryTotalTjs - FactoryPaidAmountTjs` в DTO (не хранить).
- Опционально отдельная сущность `FactoryPayment` (партиями, как `Payment` у клиента), если завод получает оплату частями — решить с заказчиком, не изобретать самостоятельно.
- Зависимость: нет, но логически проще делать после Шага 2 (раз уже трогаем `FactoryOrder`).

### Шаг 6 — `[FULL]` Периодический отчёт по марже
1. `Shisha.Application/Analytics`: новый DTO `PeriodFinancesDto(from, to, revenueTjs, costTjs, profitTjs, measurementsCount, averageMarginPct)`.
2. `IAnalyticsService.GetPeriodFinancesAsync(from, to)` — переиспользовать формулы из `ProfitCalculator`, но агрегировать по всем `Measurement` за период (по `MeasuredAt` или `InstalledAt` — уточнить семантику "за период" у заказчика: дата замера, дата сделки или дата оплаты).
3. Эндпоинт `GET /api/v1/analytics/finances?from=&to=`.
4. Frontend: страница/виджет в `features/analytics` с графиком выручка/себестоимость/маржа по месяцам (Recharts, уже в стеке).

Зависимость: использует тот же расчёт себестоимости, что и Шаг 4 (после замены MasterFee нужно убедиться, что период-отчёт берёт актуальную формулу).

### Шаг 7 — `[BE]` FluentValidation (технический долг, не блокирует остальное)
- Добавить `CreatePaymentRequestValidator`, `CreateMeasurerPayoutRequestValidator` и т.д. по мере добавления новых эндпоинтов — соответствие `CLAUDE.md` стеку. Можно делать параллельно с шагами 4-6 для новых DTO, не трогая старые ради этого аудита.

---

**Рекомендованный порядок:** 0 → 1 → 3 → 2 → 5 → 4 → 6 → 7 (документацию и быстрые защитные правки сначала, крупную фичу MeasurerPayout — когда защитные гейты уже на месте, отчёт по марже — последним, так как зависит от формулы себестоимости, которая меняется в Шаге 4).

Перед началом Шага 4 и 5 — уточнить у заказчика бизнес-правила (ставка замерщика фикс/%, нужна ли частичная оплата заводу), это явно отмечено как "не додумывать" в `CLAUDE.md`.
