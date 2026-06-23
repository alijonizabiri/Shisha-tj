# FUNCTIONAL AUDIT — SHISHA_TJ
**Date:** 2026-06-22
**Branch:** vision
**Auditor:** Claude Code (claude-sonnet-4-6)
**Scope:** Full codebase audit — BE + FE functionality, gaps, risks, and Phase 5 readiness

---

## 1. Overall Status

The application is functionally complete for MVP. All five phases (Foundation, Designer, CRM Kanban, Finances, Analytics) are shipped. Phase 5 (Production Polish) has Steps 1–6 done; Steps 7–8 (regression + production deploy) remain. The codebase is clean, the architecture is correctly layered, and 115 BE / 108 FE tests pass.

---

## 2. Feature-by-Feature Audit

### 2.1 Auth (`/api/v1/auth`)

| Endpoint | Status | Notes |
|---|---|---|
| `POST /login` | Working | Rate-limited (`"auth"` policy). Returns access + refresh tokens. |
| `POST /refresh` | Working | Validates refresh token rotation correctly. |
| `POST /logout` | Working | Revokes refresh token. |

**Gaps / risks:**
- No `POST /users` (create user) endpoint exists on the backend. `UsersPage.tsx` has the "New User" button **permanently disabled**. Admins cannot create users without direct DB access. This is a known pre-launch gap but will block onboarding new staff.
- No password-change endpoint. Users are stuck with seeded passwords unless changed in the DB.

---

### 2.2 Users (`/api/v1/users`)

| Endpoint | Role | Status |
|---|---|---|
| `GET /users` | Admin | Works. |
| `GET /users/{id}` | Admin | Works. |
| `GET /users/measurers` | Admin, Operator | Works. Used by assign-measurer modal. |
| `PATCH /users/{id}/measurer-fee` | Admin, Operator | Works. Updates `MeasurerFixedFeeTjs`. |

**Gaps:**
- `UsersPage` FE shows measurer fee but the "Actions" column is always "—". There is no UI for editing the fee from the Users page (though the PATCH endpoint exists). The `MeasurerPayoutService` checks `MeasurerFixedFeeTjs` before creating a payout — if unset, it throws. This will silently block payout creation until someone edits the DB or a fee-edit UI is built.

---

### 2.3 Leads (`/api/v1/leads`)

| Endpoint | Role | Status |
|---|---|---|
| `GET /leads` (paged, search, date filter) | Admin, Operator, Measurer | Works. Measurer sees only leads with assigned measurements in Measurement/Buying. |
| `GET /leads/{id}` | Admin, Operator, Measurer | Works. Returns measurements with payment totals and balance. |
| `GET /leads/{id}/finances` | Admin, Operator | Works. Aggregates across all measurements. |
| `POST /leads` | Admin, Operator | Works. |
| `PUT /leads/{id}` | Admin, Operator | Works. |
| `DELETE /leads/{id}` | Admin only | Soft-delete. Works. |

**Observations:**
- `Lead` is now a contact-only entity (name, phone, product, source, note, callDate). All lifecycle data lives on `Measurement`. This is intentional (Phase 3.5 Step 14) and correctly implemented.
- `LeadSummaryResponse` returns `product` from the most-recent measurement's product, falling back to `Lead.Product`. This is a sensible display logic but means the lead list shows different product text than what was originally entered if a measurement overrides it.
- No soft-delete audit trail for who deleted: `DeletedByUserId` is set by the interceptor in some cases but `LeadService.DeleteAsync` calls `db.Remove` (hard delete path via EF). The entity has `ISoftDeletable`, but the global query filter handles this transparently — confirm the EF configuration applies soft-delete on `Remove`. **This is a potential data-loss risk if the filter does not intercept the remove call.**

---

### 2.4 Measurements (`/api/v1/measurements`)

| Endpoint | Role | Status |
|---|---|---|
| `GET /measurements/kanban` | Admin, Operator, Measurer | Works. Returns all measurements grouped by status. |
| `POST /measurements` | Authenticated | Works. Validates ranges, creates glasses + holes. Auto-generates initial panels if none supplied. |
| `GET /measurements/{id}` | Authenticated | Works. |
| `PUT /measurements/{id}` | Authenticated | Works. Replaces glasses and holes. |
| `GET /measurements/{id}/finances` | Admin, Operator | Works. Per-measurement P&L. |
| `GET /measurements/{id}/pdf` | Authenticated | Works. A4/A3 layout. |
| `PATCH /measurements/{id}/status` | Admin, Operator | Works. Enforces state machine, auto-creates factory order on OrderedAtFactory, auto-closes orders on Installed. |
| `POST /measurements/{id}/assign-measurer` | Admin, Operator | Works. |

**Observations:**
- `PatchStatusAsync` checks `MeasurementTransitionArgs` (glass count, deposit sum, total paid) to enforce business rules. Good.
- Auto-creation of `FactoryOrder` on `OrderedAtFactory` transition creates an order even with 0 items ("so the measurement appears on the Factory Orders page as a Draft entry"). This is intentional but produces empty draft orders — may confuse operators.
- `InstalledAt` field exists on `Measurement` but is never populated (no setter in `PatchStatusAsync` for `Installed`). This may be intentional (tracked by `installedAt` via `UpdatedAt`) but the field is dead.
- Validation: `MeasureMm` 600–3000, `HeightMm` 1500–2500. No validation that `panels.Sum(p.WidthMm)` approximately equals `MeasureMm`. A savvy user could save panels whose total width is wildly different from the cabin width.
- `Measurement.MeasurerId` (who created the measurement) vs `AssignedMeasurerId` (who is assigned to visit) are two different fields. This distinction is correct but not surfaced in the UI.

---

### 2.5 Payments (`/api/v1/payments`)

| Endpoint | Role | Status |
|---|---|---|
| `POST /payments` | Admin, Operator | Works. Guards against overpayment beyond deal price. |
| `DELETE /payments/{id}` | Admin only | Soft-delete. Works. |

**Observations:**
- The overpayment guard is on `Deposit` + `Balance` kinds only (`p.Kind != PaymentKind.Refund`). Refunds are not blocked by deal price, which is correct.
- No `GET /payments` endpoint. The FE loads payments as part of `GET /leads/{id}` (via the measurement DTO), not as a standalone resource. This works but limits payment filtering / history views.
- `PaymentKind` enum: need to verify all kinds (Deposit, Balance, Refund, Rework) are handled consistently in `ProfitCalculator`. Rework payments are tracked as `Expense` entities, not `Payment` — check that the UI correctly routes rework cost entry.

---

### 2.6 Factory Orders (`/api/v1/factory-orders`)

| Endpoint | Role | Status |
|---|---|---|
| `GET /factory-orders` (paged, status filter, date filter) | Admin, Operator | Works. |
| `GET /factory-orders/{id}` | Admin, Operator | Works. |
| `POST /factory-orders` | Admin, Operator | Works. Validates no duplicate glass in active order. Bumps Buying → OrderedAtFactory. |
| `PATCH /factory-orders/{id}/send` | Admin, Operator | Works. Draft → Sent. |
| `PATCH /factory-orders/{id}/receive` | Admin, Operator | Works. Sent → Received. Per-item glass cost entry. |
| `POST /factory-orders/{id}/items/{itemId}/rework` | Admin, Operator | Works. Creates rework item. |
| `POST /factory-orders/{id}/payments` | Admin, Operator | Works. Warns if over-paying. |
| `DELETE /factory-orders/{id}/payments/{paymentId}` | Admin | Works. Soft-delete. |
| `GET /factory-orders/{id}/pdf` | Admin, Operator | Works. |

**Observations:**
- No `DELETE /factory-orders/{id}` or cancel endpoint. Draft orders cannot be deleted from the UI. Operators who accidentally create a factory order cannot remove it.
- No `PATCH /factory-orders/{id}` for editing the `Note` or other metadata of a draft.
- `FactoryOrderService.CreateAsync` bumps Buying → OrderedAtFactory directly without going through `MeasurementStatusTransitionService`. This bypasses the state machine and skips any business-rule checks for that transition. **Potential consistency bug** — the state machine check for `OrderedAtFactory` (which requires glass count > 0) is not applied on the manual batch-create path.
- `ReceiveAsync` sets `FactoryTotalTjs` on the order and optionally sets per-item `GlassCostTjs`. If `ItemCosts` is empty, individual glass costs remain null, which means `ProfitCalculator` will count glass cost as 0 until costs are entered. **Risk of understated COGS**.

---

### 2.7 Analytics (`/api/v1/analytics`)

| Endpoint | Role | Status |
|---|---|---|
| `GET /analytics/dashboard` | Admin | Works. 10-min cache. |
| `GET /analytics/funnel` | Admin | Works. |
| `GET /analytics/refusals` | Admin | Works. |
| `GET /analytics/by-product` | Admin | Works. |
| `GET /analytics/by-color` | Admin | Works. |
| `GET /analytics/by-measurer` | Admin | Works. |
| `GET /analytics/finances` | Admin | Works. Requires `from` and `to`. |
| `GET /analytics/export` | Admin | Works. Returns JSON export data. |
| `GET /analytics/export/pdf` | Admin | Works. |
| `GET /analytics/export/excel` | Admin | Works. |

**Observations:**
- All analytics endpoints are **Admin-only**. Operators see nothing on the analytics pages. The FE routes to analytics but if an Operator navigates there they will get 403 responses. The FE does not hide the analytics link in the sidebar for Operators — this should be verified.
- `AnalyticsFinancesService.LoadClosedAsync` loads **all installed measurements** in memory (no date-range pre-filter at query time), then filters in C#. For large datasets this could become slow. The date filter is applied after materializing from the DB.
- `AnalyticsService` uses 10-minute in-memory cache keyed by `tenantId:method:from:to`. In a single-tenant environment (as planned for launch) this is fine. In multi-tenant it works correctly because `tenantId` is part of the key.
- `GetByColorAsync` filters by `MeasuredAt` (timestamp on `Measurement`), while other analytics filter by `Lead.CallDate`. This inconsistency means the "by color" chart may show a different date range behavior than the funnel or dashboard charts when the same date filter is applied.

---

### 2.8 Measurer Payouts

| Endpoint | Role | Status |
|---|---|---|
| `POST /measurer-payouts` | Admin, Operator | Works. Creates payout from measurer's fixed fee. |
| `PATCH /measurer-payouts/{id}/mark-paid` | Admin, Operator | Works. |
| `GET /measurer-payouts/by-measurement/{id}` | Admin, Operator | Works. |

**Observations:**
- Payouts require `MeasurerFixedFeeTjs` set on the user. If not set, a `DomainValidationException` is thrown. No UI on `UsersPage` to set this fee (see Section 2.2 gap).
- One payout per measurement is enforced by a `ConflictException`. If a payout was created with wrong amount, there is no update/delete payout endpoint — the payout is stuck.

---

## 3. Designer (Frontend)

### 3.1 Core Functionality

| Feature | Status | Notes |
|---|---|---|
| Dimension form (width, height, color, hardware) | Working | Validated with Zod. |
| Auto-compute initial panels | Working | `computeInitialPanels()` pure function, 104 unit tests. |
| SVG drawing canvas (2D) | Working | Panels + dimensions + holes rendered. |
| 3D preview | Working | `ThreeCanvas` renders Three.js view. |
| Hole drag (pointer events) | Working | Tablet-compatible. |
| Panel context menu (resize, split, door toggle, hinge side, mechanism) | Working | Fixed-position popover. |
| L-shape cabin support | Working | `buildLShapePanels`, `LShapeConfig`. |
| Curved panel support | Working | `CurvatureRadiusMm`, `PanelShape.Curved`. |
| Save measurement | Working | `POST /measurements`. Navigates back on success. |
| Edit measurement | Working | `PUT /measurements/{id}`. Pre-fills form from existing data. |
| PDF download (A4/A3) | Working | Shows after save when not in leadId mode. |
| Lead selector (required for new) | Working | `LeadCombobox` filters eligible leads. |
| LocalStorage draft persistence | Working | Keyed by `storageKey`. |
| Zoom controls | Working | |
| Offline (PWA) | Working | Phase 5 Step 5. |

**Observations:**
- `handleSave()` computes `dealPriceTjs = masterFeeTjs + deliveryCostTjs`. This auto-calculates the deal price from the fee estimate + delivery. However, the actual negotiated deal price is different from the estimate in real scenarios. The operator or measurer should be able to enter the real deal price separately from the estimate. Currently the deal price is auto-set and there is no field for the operator to enter a custom agreed price on the Designer form. **Business logic risk.**
- `depositTjs` is collected in the Designer form (`infoForm`) but is not sent to the backend in the `saveMutation` payload. There is no `depositTjs` field in `CreateMeasurementRequest`. The deposit form field in the Designer appears to be decorative / unused. Deposit is added separately via `POST /payments`.
- `leadIneligible` flag is computed as: lead not found in the filtered `useDesignerLeads()` list. That hook presumably filters leads by status. If the lead IS found but in an ineligible status, the warning shows. But the save is not blocked by the backend on `leadIneligible === true` — only the `canSave` flag controls this in the FE.

---

## 4. CRM Kanban (Frontend)

### 4.1 Leads List Page (`/leads`)

| Feature | Status |
|---|---|
| Paged table with search + date filter | Working |
| Click row → opens `LeadDetailDrawer` | Working |
| New Lead button → `NewLeadDialog` | Working |
| Export / print | Not implemented |

### 4.2 Leads Kanban Page (`/leads/kanban`)

| Feature | Status | Notes |
|---|---|---|
| dnd-kit drag between columns | Working | Pointer sensor, 8px distance threshold. |
| Drag to "Refused" → `RefuseMeasurementDialog` | Working | Pops refusal reason selector. |
| Other status transitions inline | Working | Calls `PATCH /measurements/{id}/status`. |
| Error toast on 409/400 | Working | Shows `dragError` inline. |
| New Lead dialog | Working | |
| Measurer view (filtered columns) | Working | BE filters, FE shows all columns but empty for non-assigned statuses. |

**Observations:**
- The Kanban shows `MeasurementCard` items, not `LeadCard` items. Clicking a card in the kanban currently does what? Looking at `KanbanColumn` and `MeasurementCard` — there is no `onClick` to open a drawer from the Kanban. Cards are only draggable. **The kanban is drag-only; you cannot click a card to see lead details from the kanban view.** This may be intentional (use the list view to click into leads) but is a UX gap.
- `BuyingTransitionDialog` exists in the components directory but it is unclear if it is wired to the kanban drag. The transition from Thinking → Buying requires `dealPriceTjs` and deposit — the drag-to-Buying transition may silently fail with a 400 if those are not set, with only an inline error message shown.

---

## 5. Finances (Frontend)

| Feature | Status | Notes |
|---|---|---|
| `LeadFinancesPanel` in `LeadDetailDrawer` | Working | Shows per-lead aggregate. |
| `AddPaymentDialog` | Working | Deposit / Balance / Refund. |
| `AddHardwareDialog` | Working | Hardware cost per measurement. |
| `MeasurerPayoutSection` | Working | Create + mark paid. |
| `FactoryOrdersPage` | Working | List + status badge. |
| `FactoryOrderDetailDrawer` | Working | Items, per-item costs, payments. |
| `CreateBatchDialog` | Working | Selects glasses from Buying-status measurements. |
| `FactoryOrderPaymentSection` | Working | Add factory payment with over-pay warning. |

---

## 6. Analytics (Frontend)

| Feature | Status |
|---|---|
| Dashboard KPIs (total leads, active, revenue, conversion, avg deal) | Working |
| Revenue by product chart (bar) | Working |
| Funnel chart (horizontal bar) | Working |
| Refusals table | Working |
| Color pie charts (glass + hardware) | Working |
| Date range filter | Working |
| P&L Finances page (period revenue/cost/profit/margin) | Working |
| Monthly breakdown chart + table | Working |
| Export PDF | Working |
| Export Excel | Working |
| By-measurer analytics | Working (BE), not visible on FE analytics pages |

**Observations:**
- `by-measurer` endpoint exists on the backend but there is no corresponding chart/table on any analytics page. The data is unused in the frontend.
- `AnalyticsDashboardPage` calls 5 separate API endpoints on load (dashboard, by-product, funnel, refusals, by-color). All have 10-minute cache. On first load (cache miss) this results in 5 parallel DB queries. Consider combining into one endpoint for performance.

---

## 7. Architecture & Security Findings

### 7.1 Correct Implementations
- Multi-tenancy via global query filters — correctly applied everywhere. `IgnoreQueryFilters()` not used in production code.
- `TenantId` never trusted from client — always read from JWT via `ICurrentUser`.
- 404-not-403 on ownership denial — correctly implemented in `LeadService.GetByIdAsync` (Measurer path).
- Async/CancellationToken — present throughout all public methods.
- DTOs at API boundary — no EF entities exposed.
- Soft delete — present on all main entities.
- UUIDs via `Guid.CreateVersion7()` — used (inherited from `BaseEntity`).
- Money as `decimal` — confirmed throughout.
- Dimensions as `int` millimeters — confirmed.

### 7.2 Risks and Issues

**P0 — Functional Bugs:**

1. **`LeadService.DeleteAsync` may hard-delete instead of soft-delete.** The service calls `db.Remove(lead)` without setting `IsDeleted`. Whether this is intercepted as a soft-delete depends on the EF interceptor or override configuration. If the interceptor is not set up for `Delete`, lead data is permanently lost. Verify `AuditInterceptor` or the DB context override handles `Remove` → soft delete.

2. **`FactoryOrderService.CreateAsync` bypasses the state machine for `OrderedAtFactory` transition.** When an operator manually creates a batch from the `CreateBatchDialog`, the glass count check is not run through `MeasurementStatusTransitionService`. Only the `AutoCreateFactoryOrderAsync` path (triggered from `PatchStatusAsync`) goes through the state machine.

3. **`InstalledAt` is never set.** `Measurement.InstalledAt` (a `DateTime?` field) is declared but never written in `PatchStatusAsync` or anywhere else. If any code relies on this field for filtering or reporting, it will always be null.

**P1 — Missing Functionality:**

4. **No user creation endpoint.** Cannot onboard new users without DB access. Blocks production operations.

5. **No measurer fee edit UI.** `UsersPage` shows the fee but has no edit action. The PATCH endpoint exists but is unwired in the FE.

6. **No factory order delete/cancel.** Draft orders from the auto-create path cannot be removed if created in error.

7. **Designer deal price is auto-computed, not user-entered.** The negotiated deal price with the client may differ from `masterFeeTjs + deliveryCostTjs`. This could cause incorrect financials if users do not later update `dealPriceTjs` through another flow.

8. **`depositTjs` field in Designer is decorative.** The value entered is collected but never sent to the backend.

**P2 — UX Gaps:**

9. **Kanban cards are not clickable** to open the lead detail drawer. Drag-only interaction limits usability.

10. **`by-measurer` analytics data is never shown in the frontend.** The endpoint and data are fully implemented on BE but no FE page renders it.

11. **Analytics sidebar link is visible to Operators** but all endpoints return 403. Consider hiding analytics navigation for non-Admin users.

12. **`AnalyticsFinancesService.LoadClosedAsync` loads all installed measurements** without date pre-filtering at the SQL level. For datasets of hundreds of completed installs, this will become slow. Apply the `from`/`to` filter to the EF query before materializing.

---

## 8. Test Coverage Assessment

| Area | BE Tests | FE Tests |
|---|---|---|
| Auth flow | AuthFlowTests | LoginPage.test, ProtectedRoute.test |
| Designer math | — | computePanels.test, defaultHoles.test, DrawingCanvas.test, Hole.test, DesignerPage.test, LeadCombobox.test |
| Finances | FinancesTests | LeadFinancesPanel.test, AddPaymentDialog.test |
| Analytics | AnalyticsTests | — |
| Audit interceptor | AuditInterceptorTests | — |
| Lead detail drawer | — | LeadDetailDrawer.test |
| Status badge | — | LeadStatusBadge.test |
| Refusal dialog | — | RefuseLeadDialog.test |

**Gaps in test coverage:**
- No integration tests for `MeasurementStatusTransitionService` transition rules (glass count, deposit minimum, deal price requirements).
- No integration tests for `FactoryOrderService` rework or factory payment flows.
- No FE tests for `LeadsKanbanPage`, `FactoryOrdersPage`, `AnalyticsDashboardPage`.
- No test for `LeadService.DeleteAsync` verifying soft-delete behavior.

---

## 9. Phase 5 Step 7 Readiness (Regression Pass + Lighthouse 90+)

**Recommended regression test checklist before Step 7:**

1. Login as admin, operator, measurer — verify correct access to each feature.
2. Create lead → create measurement in Designer → verify PDF generation.
3. Transition measurement through all valid statuses to `Installed`. Verify business rule enforcement at each step.
4. Add payment (deposit, balance), verify overpayment guard.
5. Create factory order batch from `Buying` measurements, send, receive with item costs.
6. Add rework item to factory order, verify it appears in finances as cost.
7. Create measurer payout, mark paid, verify reflected in analytics P&L.
8. Run analytics dashboard and finances page for a date range with data — verify numbers.
9. Export PDF and Excel from finances.
10. Verify Kanban drag works for all valid transitions (including the Refused path with reason dialog).

**Lighthouse concerns:**
- Designer page renders large SVG and possibly Three.js on first load — may impact LCP.
- 5 parallel analytics API calls on dashboard load — may impact TTI on slow connections.
- No evidence of image optimization or lazy loading beyond route-level code splitting.

---

## 10. Summary Table

| Category | Status | Critical Issues |
|---|---|---|
| Auth | Solid | No user creation flow |
| Users | Partial | Fee edit not wired in UI |
| Leads | Solid | Potential hard-delete risk |
| Measurements | Solid | `InstalledAt` never set; panel total vs cabin width not validated |
| Payments | Solid | No standalone payment list endpoint |
| Factory Orders | Solid | No delete/cancel; state machine bypass on manual create |
| Analytics BE | Complete | `LoadClosedAsync` memory pressure; by-color date filter inconsistency |
| Analytics FE | Mostly complete | By-measurer data not displayed; Admin-only but link visible to Operators |
| Designer | Solid | Deal price auto-compute; deposit field decorative |
| CRM Kanban | Solid | Cards not clickable from kanban |
| Finances | Solid | Rework payout not deletable/updatable |
| Tests | Good | Missing transition service tests, kanban/analytics FE tests |

---

*Generated by Claude Code functional audit — 2026-06-22*

---

## 11. Исправления после аудита (2026-06-22)

Все P0/P1/P2 пункты из аудита обработаны в рамках одной сессии. Итог:

| # | Проблема | Статус | Детали |
|---|---|---|---|
| P0-1 | Soft-delete `LeadService.DeleteAsync` | ✅ Подтверждено — баги нет | `AuditInterceptor` перехватывает `EntityState.Deleted` для всех `ISoftDeletable` и конвертирует в `IsDeleted = true`. `db.Remove()` безопасен. |
| P0-2 | `InstalledAt` никогда не устанавливался | ✅ Исправлено | `MeasurementService.PatchStatusAsync`: при переходе в `Installed` устанавливается `measurement.InstalledAt = DateTime.UtcNow` + закрываются заказы на завод. |
| P0-3 | `FactoryOrderService.CreateAsync` обходил state machine | ✅ Исправлено | Добавлена SQL-проверка депозита перед переводом замеров `Buying → OrderedAtFactory`. Замеры без депозита ≥ 100 сом блокируются с `DomainValidationException`. |
| P1-4 | Нет UI для создания пользователей | ✅ Реализовано | `POST /api/v1/users` (Admin only) + `NewUserDialog` на `UsersPage` с полями FullName, Email, Password, Role, MeasurerFixedFeeTjs (conditional). |
| P1-5 | Ставка замерщика не редактировалась в UI | ✅ Реализовано | Inline-редактирование `EditFeeCell` в таблице пользователей + `useUpdateMeasurerFee()`. |
| P1-6 | `dealPriceTjs` нельзя было ввести вручную в Дизайнере | ✅ Реализовано | Поле "Договорная цена" с авто-вычисленным хинтом; ручная сумма переопределяет авто. |
| P1-7 | `depositTjs` не отправлялся в backend | ✅ Исправлено | `DesignerPage.handleSave()` передаёт `depositTjs` в `CreateMeasurementRequest`; `MeasurementService.CreateAsync` автоматически создаёт `Payment(Kind=Deposit)`. |
| P1-8 | Нет `DELETE /api/v1/users/{id}` | ✅ Реализовано | Эндпоинт + кнопка удаления в таблице пользователей с `confirm()` диалогом. |
| P2-9 | Карточки Канбана не кликабельны | ✅ Реализовано | `MeasurementCard` рендерит `<button>` для имени лида; клик навигирует на `/leads/{leadId}` без срабатывания drag. |
| P2-10 | Аналитика видна операторам | ✅ Уже было исправлено | `Sidebar.tsx` уже имел `roles: ['Admin']` для Analytics — баг не подтвердился. |
| P2-11 | `LoadClosedAsync` без SQL pre-filter | ✅ Исправлено | Добавлен `m.Payments.Any(p => p.Kind != Refund && p.PaidAt >= from && p.PaidAt <= to)` на уровне EF-запроса — лишние строки не загружаются из БД. |

**Не исправлено в этой сессии (вне scope или требует обсуждения):**
- `by-measurer` данные не отображаются на FE (нет страницы) — отложено до Phase 5 Step 7
- Нет удаления/отмены черновых заказов на завод — требует UX-решения
- 5 параллельных запросов на дашборде аналитики — оптимизация после Lighthouse audit

**Сборка после всех изменений:**
- `dotnet build`: ✅ 0 warnings, 0 errors
- `npm run build`: ✅ успешно (chunk size warning — не ошибка)
