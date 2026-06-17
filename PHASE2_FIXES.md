# SHISHA_TJ — Phase 2 Report
Дата: 2026-06-18

---

## Миграции созданы

| Название | Что делает |
|---|---|
| `AddMeasurerFixedFeeToUser` | Добавляет поле `measurer_fixed_fee_tjs (decimal?, nullable)` на таблицу `users` |
| `AddMeasurerPayouts` | Создаёт таблицу `measurer_payouts` с FK на `measurements` и `users`, уникальный индекс по `measurement_id` |
| `AddFactoryOrderPaymentFields` | Добавляет `factory_paid_tjs (decimal, default 0)` и `factory_paid_at (date?)` на таблицу `factory_orders` |

---

## Новые сущности

### `MeasurerPayout`
| Поле | Тип | Примечание |
|---|---|---|
| `Id` | `Guid` | UUID v7 |
| `TenantId` | `Guid` | FK → Tenant |
| `MeasurementId` | `Guid` | FK → Measurement, уникальный (1 выплата на замер) |
| `MeasurerId` | `Guid` | FK → User |
| `CalculatedAmountTjs` | `decimal(18,2)` | Снимок ставки на момент создания |
| `ActualAmountTjs` | `decimal(18,2)` | Может быть скорректирована оператором |
| `IsPaid` | `bool` | По умолчанию false |
| `PaidAt` | `DateOnly?` | Дата фактической выплаты |
| `Note` | `string?` | Опциональный комментарий |
| `CreatedAt` | `DateTime` | Стандартные поля аудита из `BaseEntity` |

### `FactoryOrder` — новые поля
| Поле | Тип | Примечание |
|---|---|---|
| `FactoryPaidTjs` | `decimal(18,2)` | Накопительно, default 0 |
| `FactoryPaidAt` | `DateOnly?` | Дата последнего платежа |
| `FactoryDebtTjs` | вычисляемое | `FactoryTotalTjs - FactoryPaidTjs`, только в DTO, не хранится |

### `User` — новое поле
| Поле | Тип | Примечание |
|---|---|---|
| `MeasurerFixedFeeTjs` | `decimal(18,2)?` | Ставка замерщика, nullable |

---

## Новые эндпоинты

| Метод | Путь | Роль | Что делает |
|---|---|---|---|
| `PATCH` | `/api/v1/users/{id}/measurer-fee` | Admin, Operator | Задать/обновить ставку замерщика |
| `POST` | `/api/v1/measurer-payouts` | Admin, Operator | Создать выплату для замерщика (один замер = одна выплата) |
| `PATCH` | `/api/v1/measurer-payouts/{id}/mark-paid` | Admin, Operator | Отметить выплату как оплаченную |
| `GET` | `/api/v1/measurements/{id}/measurer-payout` | Admin, Operator, Measurer | Получить выплату по замеру (204 если нет) |
| `PATCH` | `/api/v1/factory-orders/{id}/pay` | Admin, Operator | Внести оплату заводу (накопительно); warning если переплата |

---

## Изменения в ProfitCalculator

### Старая логика
```csharp
const decimal MasterFeePerSqM = 120m;
var masterFee = Math.Round(areaSqM * MasterFeePerSqM, 2); // всегда area * 120
```

### Новая логика
```csharp
// Per-measurement: если есть MeasurerPayout — берём ActualAmountTjs
var masterFee = measurement.MeasurerPayout is not null
    ? measurement.MeasurerPayout.ActualAmountTjs
    : Math.Round(areaSqM * MasterFeePerSqM, 2); // fallback для старых замеров
```

Константа `MasterFeePerSqM = 120m` сохранена как fallback — работает для замеров, у которых выплата ещё не создана.

Новые поля в `MeasurementFinancesDto`: `measurerPayoutAmount (decimal?)`, `measurerPayoutIsPaid (bool?)`.

---

## Frontend изменения

### Новые хуки (`features/measurements/api.ts`)
- `useMeasurers()` — список замерщиков с их ставками
- `useMeasurerPayout(measurementId)` — выплата по замеру
- `useCreateMeasurerPayout(measurementId)` — создать выплату
- `useMarkPayoutPaid(measurementId)` — отметить выплаченным

### Новые хуки (`features/factory-orders/api.ts`)
- `usePayFactoryOrder(orderId)` — внести оплату заводу

### Новые компоненты
| Файл | Где используется | Что делает |
|---|---|---|
| `features/measurements/MeasurerPayoutSection.tsx` | `LeadFinancesPanel` (для каждого замера) | Блок 3 состояний: нет выплаты / не оплачено / оплачено |
| `features/factory-orders/components/FactoryOrderPaymentSection.tsx` | `FactoryOrderDetailDrawer` | Суммы заказ/оплачено/долг + форма платежа |
| `features/factory-orders/components/FactoryOrderDetailDrawer.tsx` | `FactoryOrdersPage` | Боковая панель с деталями заказа и оплатой (открывается кликом по строке) |

### Изменённые файлы
- `features/leads/components/LeadFinancesPanel.tsx` — добавлен `MeasurerPayoutSection` под каждый замер
- `features/factory-orders/FactoryOrdersPage.tsx` — клик по строке открывает `FactoryOrderDetailDrawer`
- `shared/api/queryKeys.ts` — добавлен `measurerPayouts.byMeasurement`

---

## Что НЕ реализовано в Фазе 2
- Периодический P&L-отчёт (выручка/себестоимость/маржа за период) — Фаза 3
- FluentValidation на новых эндпоинтах — технический долг
- Unit-тесты на `MeasurerPayoutService` и `PayAsync` — технический долг
- Регенерация `frontend/src/shared/api/types.ts` из Swagger — выполняется отдельно после деплоя

---

## Вопросы для заказчика перед Фазой 3
1. **Период P&L**: за какую дату считать прибыль/убыток — дата замера (`MeasuredAt`), дата перехода в Installed, или дата последнего платежа клиента?
2. **Частичная оплата заводу**: нужна ли история отдельных платежей (как `Payment` у клиента), или достаточно одного накопительного поля `FactoryPaidTjs`?
