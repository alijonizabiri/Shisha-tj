# SHISHA_TJ — Phase 3 Report
Дата: 2026-06-18

---

## Миграции (в порядке применения)

| Порядок | Название | Что делает |
|---|---|---|
| 11 | `AddMeasurerFixedFeeToUser` | Поле `measurer_fixed_fee_tjs` на `users` (Phase 2) |
| 12 | `AddMeasurerPayouts` | Таблица `measurer_payouts` (Phase 2) |
| 13 | `AddFactoryOrderPaymentFields` | Поля `factory_paid_tjs`, `factory_paid_at` на `factory_orders` (Phase 2, убраны в Phase 3) |
| 14 | `AddFactoryPayments` | Создаёт таблицу `factory_payments` |
| 15 | `RemoveFactoryOrderPaymentFields` | Удаляет `factory_paid_tjs` и `factory_paid_at` из `factory_orders` |

Миграции 13→15 образуют заменяющую пару: сначала добавлены поля накопительного хранения, затем они заменены полноценной историей платежей.

---

## Новые сущности

### `FactoryPayment`
| Поле | Тип | Примечание |
|---|---|---|
| `Id` | `Guid` | UUID v7 |
| `TenantId` | `Guid` | FK → Tenant (multi-tenancy) |
| `FactoryOrderId` | `Guid` | FK → FactoryOrder, Restrict (нельзя удалить заказ с платежами) |
| `AmountTjs` | `decimal(18,2)` | Сумма платежа |
| `PaidAt` | `DateOnly` | Дата платежа |
| `Note` | `string?` | Опциональный комментарий |
| `IsDeleted` / `DeletedAt` / `DeletedByUserId` | soft-delete | Стандарт |
| `CreatedAt` / `UpdatedAt` | audit | Стандарт |

Навигационное свойство `FactoryOrder.FactoryPayments: ICollection<FactoryPayment>` — eager-load при вызове `GET /factory-orders/{id}`.

---

## Новые / изменённые эндпоинты

| Метод | Путь | Роль | Что делает |
|---|---|---|---|
| `POST` | `/api/v1/factory-orders/{id}/payments` | Admin, Operator | Добавить платёж заводу; если сумма превышает `FactoryTotalTjs` — warning в ответе |
| `DELETE` | `/api/v1/factory-orders/{id}/payments/{paymentId}` | Admin | Soft-delete платежа |
| `GET` | `/api/v1/factory-orders/{id}` | Admin, Operator | Теперь включает `factoryPayments[]`, `factoryPaidTjs` и `factoryPaidAt` вычисляются из истории |
| `GET` (list) | `/api/v1/factory-orders` | Admin, Operator | `factoryPaidTjs`/`factoryPaidAt` в сводке теперь вычисляются EF-подзапросом |
| `GET` | `/api/v1/analytics/finances?from=&to=` | Admin | P&L отчёт за период |
| ~~`PATCH`~~ | ~~`/api/v1/factory-orders/{id}/pay`~~ | — | Удалён, заменён на `POST /payments` |

---

## Логика P&L (бизнес-правила реализованы)

**Критерии "закрытой" сделки:**
1. Замер имеет статус `Installed`
2. У замера задан `DealPriceTjs` (согласованная цена)
3. Сумма всех платежей клиента с `Kind != Refund` ≥ `DealPriceTjs` — клиент полностью рассчитался
4. Дата последнего такого платежа попадает в период `[from, to]` — именно эта дата определяет, в какой период относится сделка

**Компоненты себестоимости:**
- `FactoryCostTjs` = GlassCostTjs из FactoryOrderItems для стёкол закрытых замеров (аллоцировано по-стекольно, консистентно с ProfitCalculator)
- `MeasurerCostTjs` = ActualAmountTjs из MeasurerPayout (если выплата создана), иначе 0
- `OtherExpensesTjs` = SUM(Expense.AmountTjs) для закрытых замеров

**Ежемесячная разбивка:** группировка по году/месяцу даты последнего платежа клиента.

**Граничные условия:**
- Нет закрытых замеров → все нули, пустой список (не 404)
- Период > 2 лет → 400 Bad Request
- `to < from` → 400 Bad Request

---

## Frontend

### Новые компоненты
| Файл | Что делает |
|---|---|
| `features/analytics/AnalyticsLayout.tsx` | Обёртка с вкладками "Обзор / Финансы" для раздела аналитики |
| `features/analytics/AnalyticsFinancesPage.tsx` | P&L страница: фильтр дат, 4 KPI-карточки, ComposedChart (баргрупп + линия прибыли), помесячная таблица с итоговой строкой |

### Новые хуки
| Хук | Файл | Что делает |
|---|---|---|
| `useAddFactoryPayment(orderId)` | `features/factory-orders/api.ts` | POST платёж заводу |
| `useDeleteFactoryPayment(orderId)` | `features/factory-orders/api.ts` | DELETE платёж (Admin) |
| `usePeriodFinances(from, to)` | `features/analytics/api.ts` | GET P&L за период |

### Изменённые компоненты
| Файл | Что изменилось |
|---|---|
| `FactoryOrderPaymentSection.tsx` | Полный рефактор: список платежей с датой/суммой/комментарием, кнопка удалить (Admin), форма добавления с полем `note` |
| `FactoryOrderDetailDrawer.tsx` | Передаёт `payments={order.factoryPayments}` в новую секцию |
| `shared/api/types.ts` | Добавлены `FactoryPaymentDto`, поля `factoryPaidTjs`/`factoryPaidAt`/`factoryDebtTjs`/`factoryPayments` в `FactoryOrderDetailResponse` |
| `shared/api/queryKeys.ts` | Добавлены `factoryOrders.payments(orderId)`, `analytics.finances(from, to)` |
| `app/router.tsx` | Маршруты аналитики переведены на `AnalyticsLayout` → child routes |

---

## Что НЕ реализовано

- **FluentValidation** на новых эндпоинтах — технический долг (валидация через ручные проверки в сервисе/контроллере)
- **Unit-тесты** на `AnalyticsFinancesService` и `FactoryOrderService.AddPaymentAsync` — покрытие не добавлено
- **Export P&L в Excel/PDF** — не входило в scope
- **Аллоцирование factory payments пропорционально** — FactoryCostTjs считается через GlassCostTjs per item, а не через реальные платежи заводу (корректно для аналитики, но FactoryPayments и GlassCostTjs могут расходиться, если часть стёкол из заказа принадлежит незакрытым замерам)

---

## Финальное состояние финансовой системы (Фазы 1–3 суммарно)

### Что умеет система:

**Платежи клиента (Phase 0/3)**
- Множественные частичные платежи (`Deposit | Balance | Refund`) привязаны к `Measurement`
- Защита от переплаты: `SUM(non-refund) > DealPriceTjs` блокируется с ошибкой
- Баланс долга клиента вычисляется в реальном времени

**Ворота статусов (Phase 1)**
- `Buying`: требует депозит ≥ 100 TJS
- `OrderedAtFactory`: повторная проверка депозита (defense-in-depth)
- `Installed`: авто-закрытие связанного FactoryOrder если все стёкла установлены
- `Closed`: требует полную оплату клиента (SUM ≥ DealPriceTjs)

**Выплата замерщику (Phase 2)**
- `MeasurerPayout` — одна запись на замер с фиксированной ставкой замерщика
- `IsPaid / PaidAt` — отметка о факте выплаты
- `ActualAmountTjs` — возможность скорректировать сумму вручную

**Платежи заводу (Phase 3)**
- `FactoryPayment` — история платежей заводу по каждому заказу
- Вычисляемые `FactoryPaidTjs` и `FactoryPaidAt` (MAX/SUM по истории)
- Soft-delete платежей (только Admin)
- Warning при превышении `FactoryTotalTjs`

**P&L отчёт (Phase 3)**
- Период с `from`/`to` (до 2 лет)
- Критерий закрытой сделки: `Installed + полная оплата + дата последнего платежа в периоде`
- Компоненты: выручка / фабричная себестоимость / выплаты замерщикам / прочие расходы / прибыль / маржа
- Помесячная разбивка + ComposedChart (Recharts) в интерфейсе
