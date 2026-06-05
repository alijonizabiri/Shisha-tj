# Phase 3 — Finances Summary

**Status:** ✅ Complete
**Completed:** 2026-06-05
**Branch:** main
**Tag:** v0.4-finances

## What Was Built

### Backend

| Item | Description |
|------|-------------|
| `FactoryOrder` entity | Batch of glasses sent to the glass factory; statuses Draft → Sent → Received → Closed |
| `FactoryOrderItem` entity | One glass within a factory order; tracks cost and rework flag |
| `Payment` entity | Client payment records (Deposit / Balance / Refund); amount negative for refunds |
| `Hardware` entity | One set of rollers/handle/seals per measurement; tracks purchase cost |
| `Expense` entity | Misc costs per lead (Delivery / Rework / Other) |
| `AddFinances` migration | Adds all five tables to the database |
| `FactoryOrderService` | Full CRUD + send / receive / add-rework-item lifecycle |
| `PaymentService` | Create (deposit, balance, refund) and delete |
| `ProfitCalculator` | Computes full `LeadFinancesDto`: glass cost, rework (measurer-error only), hardware, master fee (120 TJS/m²), delivery, other, total cost, profit, paid, balance due |
| `GET /api/v1/leads/{id}/finances` | Returns `LeadFinancesDto` breakdown for a lead |
| `FactoryOrderPdfService` | QuestPDF A4 document: header, per-glass summary table, hole-coordinates detail table, rework highlighted in red |
| `GET /api/v1/factory-orders/{id}/pdf` | Returns PDF blob with `Content-Disposition: attachment` |
| `POST /api/v1/factory-orders` | Create batch from glass ID list |
| `PATCH /api/v1/factory-orders/{id}/send` | Mark sent |
| `PATCH /api/v1/factory-orders/{id}/receive` | Mark received, fill per-item costs |
| `POST /api/v1/factory-orders/{id}/items/{itemId}/rework` | Add rework item |
| `POST /api/v1/payments` | Record client payment |
| `DELETE /api/v1/payments/{id}` | Admin delete |
| `POST /api/v1/hardware` | Record hardware cost for a measurement |
| `PUT /api/v1/hardware/{id}` | Update hardware cost |

### Frontend

| Item | Description |
|------|-------------|
| `FactoryOrdersPage` | List with status filter, PDF download per row |
| `CreateBatchDialog` | Selects "Buying" leads, resolves measurement → glass IDs, POSTs batch order |
| `FactoryOrderStatusBadge` | Colored badge: Draft / Sent / Received / Closed |
| `LeadFinancesPanel` | Cost breakdown card in lead detail page: glass, rework, hardware, master fee, delivery, other → total, profit (green/red), paid, balance |
| `AddPaymentDialog` | RHF+zod form: kind (Аванс/Остаток/Возврат), amount, date, note; Refund negated before POST |
| `AddHardwareDialog` | RHF+zod form: color (pre-filled from measurement), cost, optional purchase date; 409 conflict handled gracefully |
| Sidebar nav | "Заказы на завод" link (Admin + Operator) |
| Route `/factory-orders` | Wired in router |
| `shared/api/types.ts` | Added `FactoryOrderSummaryResponse`, `FactoryOrderDetailResponse`, `FactoryOrderItemDto`, `PagedFactoryOrdersResponse`, `LeadFinancesDto`, `CreateHardwareRequest`, `HardwareDto` |

## Key Files

### Backend
- `backend/src/Shisha.Domain/Entities/` — `FactoryOrder.cs`, `FactoryOrderItem.cs`, `Payment.cs`, `Hardware.cs`, `Expense.cs`
- `backend/src/Shisha.Application/Finances/IProfitCalculator.cs` + `FinanceDtos.cs`
- `backend/src/Shisha.Infrastructure/Services/ProfitCalculator.cs` — core profit formula
- `backend/src/Shisha.Infrastructure/Pdf/FactoryOrderPdfService.cs` — QuestPDF factory order document
- `backend/src/Shisha.Api/Controllers/FactoryOrdersController.cs` — factory orders + PDF endpoint
- `backend/src/Shisha.Api/Controllers/LeadsController.cs` — added `GET {id}/finances`
- `backend/tests/Shisha.Api.IntegrationTests/FinancesTests.cs` — 4 integration tests incl. exact masterFee calculation

### Frontend
- `frontend/src/features/factory-orders/FactoryOrdersPage.tsx`
- `frontend/src/features/factory-orders/components/CreateBatchDialog.tsx`
- `frontend/src/features/leads/components/LeadFinancesPanel.tsx`
- `frontend/src/features/leads/components/AddPaymentDialog.tsx`
- `frontend/src/features/leads/components/AddHardwareDialog.tsx`

## Migrations Applied

1. `AddFinances` — adds `factory_orders`, `factory_order_items`, `payments`, `hardware`, `expenses` tables

*(The `AddLeads` and `AddLeadToMeasurement` migrations were already applied in Phase 2.)*

## Architecture Decisions

| Decision | Reasoning |
|----------|-----------|
| `ProfitCalculator` is Scoped (Infrastructure), not Application | Depends on `AppDbContext`; interface in Application keeps Clean Architecture intact |
| Factory-error reworks excluded from profit | Per spec: "Factory absorbs its own errors" — only `MeasurerError` rework cost reduces profit |
| `FactoryOrderPdfService` loads data itself (not via existing DTO) | Needs `Glass.Holes` which is not in `FactoryOrderDetailResponse`; avoids polluting the API response |
| `CreateBatchDialog` resolves glass IDs at submit time | Avoids adding a new "available glasses" endpoint; acceptable for small batch sizes (< 20 leads per batch) |
| Payment amount stored as-is (negative for Refund) | `totalPaidTjs = SUM(payments.amount_tjs)`; sign convention handled at data entry in the dialog |

## Known Issues / Tech Debt

| Item | Target Phase |
|------|-------------|
| No individual payment list in lead detail (only totals visible) | Phase 4 or as a BE addition in a patch |
| Hardware PUT endpoint has no FE form (only POST) — can't edit cost after the fact | Phase 4 or patch |
| No "available glasses" endpoint — batch creation resolves via N+1 measurement fetches | Phase 4 or patch if performance becomes an issue |
| Factory order detail page not built (only list) | Phase 4 or as needed |

## Test Coverage

- **BE integration tests:** 82 total (47 in `Shisha.Api.IntegrationTests`) — covers factory order CRUD, finances endpoint (verifies exact masterFee = 384 TJS for 1560 × 2000 TwoGlass), 404 on unknown lead, 401 on unauthenticated access
- **FE unit tests:** 73 (unchanged from Phase 2 — no new pure-logic functions were added)

## Next Phase Overview

Phase 4 — Analytics builds the admin dashboard: KPI cards (revenue, profit, lead count, conversion rate), a funnel chart showing lead counts per status, a refusal reasons breakdown, color popularity pie charts, and a date range filter. It depends on Phase 3 because profit and revenue figures come from the `ProfitCalculator` and payment records established here. The analytics endpoints will aggregate over those records and cache results for 5–15 minutes to keep the dashboard snappy.
