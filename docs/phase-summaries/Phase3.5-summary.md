# Phase 3.5 — UX Polish Summary

**Status:** ✅ Complete
**Completed:** 2026-06-05
**Branch:** main
**Tag:** v0.4.1-ux-polish

## What Was Built

### Frontend
- **`LeadDetailDrawer`** — slide-in portal panel (640px) replacing full-page navigation; renders lead info, measurements, finances in one place
- **`EditLeadDialog`** — modal form to edit all lead fields (name, phone, product, address, source, note, callDate, promisedInstallDate); wire to `PUT /api/v1/leads/{id}`
- **`useUpdateLead` hook** — mutation for `PUT /api/v1/leads/{id}` in `leads/api.ts`
- **`useDesignerLeads` hook** — fetches Buying/Measurement/OrderedAtFactory/GlassArrived leads via kanban for the Designer dropdown
- **"+ Новый лид" button** in KanbanPage header — opens NewLeadDialog without navigating away
- **Lead selector in Designer** — required dropdown in MeasurementForm; removed dead `clientName`/`clientPhone`/`clientAddress` fields
- **Kanban cards & list rows** — clicking opens drawer instead of navigating to `/leads/{id}`
- **CreateBatchDialog cleanup** — removed "с замерами" caveat from empty state text

### Backend
- **`MeasurementService.CreateAsync`** — lead-status validation: if `leadId` provided, lead must be in `{Measurement, Buying, OrderedAtFactory, GlassArrived}`
- **`LeadBusinessRules.cs`** — `MinDepositTjs = 100m` constant; single source of truth
- **`LeadTransitionArgs`** — extended with `MeasurementCount`, `TotalDepositTjs`, `TotalPaidTjs` (pre-fetched by `LeadService`)
- **`LeadStatusTransitionService`** — new guards: `→Thinking` requires ≥1 measurement; `→Buying` requires measurement + dealPrice + deposit ≥ 100 TJS; `→Installed` requires full payment
- **`LeadService.PatchStatusAsync`** — queries measurement count and payment sums before calling `TransitionAsync`
- **`FinanceDtos.LeadFinancesDto`** — added `TotalDepositTjs` field
- **`ProfitCalculator`** — computes and returns `totalDepositTjs`

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `backend/src/Shisha.Application/Leads/LeadBusinessRules.cs` | `MinDepositTjs = 100m` constant |
| `backend/src/Shisha.Application/Leads/LeadTransitionArgs.cs` | Pre-fetched DB counts for transition validation |
| `backend/src/Shisha.Application/Leads/LeadStatusTransitionService.cs` | Stricter guards for → Thinking, → Buying, → Installed |
| `backend/src/Shisha.Infrastructure/Services/LeadService.cs` | Queries counts before calling `TransitionAsync` |
| `backend/src/Shisha.Infrastructure/Services/MeasurementService.cs` | Lead-status guard in `CreateAsync` |
| `backend/src/Shisha.Application/Finances/FinanceDtos.cs` | Added `TotalDepositTjs` |
| `backend/src/Shisha.Infrastructure/Services/ProfitCalculator.cs` | Computes `totalDepositTjs` |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/features/leads/components/LeadDetailDrawer.tsx` | Main drawer component — portal panel with edit button |
| `frontend/src/features/leads/components/EditLeadDialog.tsx` | Edit form for lead fields |
| `frontend/src/features/leads/api.ts` | Added `useUpdateLead`, `UpdateLeadRequest` type |
| `frontend/src/features/designer/api.ts` | Added `useDesignerLeads` hook |
| `frontend/src/features/designer/schemas.ts` | Added `leadId` (required), removed client fields |
| `frontend/src/features/designer/components/MeasurementForm.tsx` | Lead selector dropdown, removed Клиент section |
| `frontend/src/features/leads/components/BuyingTransitionDialog.tsx` | Dialog for → Покупает: deal price + inline deposit form |
| `frontend/src/features/leads/components/TransitionRequirements.tsx` | Checklist showing what blocks the transition |
| `frontend/src/features/factory-orders/components/CreateBatchDialog.tsx` | Removed "с замерами" empty-state caveat |

## Migrations Applied

None — Phase 3.5 had no schema changes.

## Architecture Decisions

1. **Drawer over navigation for lead detail** — clicking a Kanban card / list row no longer navigates to `/leads/{id}`; the full-page route remains accessible via the `↗` icon. Keeps the user's context (Kanban position, list page) intact.
2. **`leadId` required at FE, validated at BE** — rather than making the DB column NOT NULL (migration + legacy data risk), validation lives in `LeadStatusTransitionService`. The column stays nullable for backward compat.
3. **Transition counts passed via `LeadTransitionArgs`** — `LeadStatusTransitionService` stays a pure in-memory Application-layer service with no DB dependency. `LeadService` pre-fetches `MeasurementCount`, `TotalDepositTjs`, `TotalPaidTjs` and passes them as args, keeping full unit-testability.
4. **No auto-deposit/balance creation in transition service** — the spec described this as a planned side-effect but it was never implemented. Step 8 formalizes the correct flow: payments are created separately via `POST /api/v1/payments` BEFORE the status transition. ⚠️ **Breaking change** for any client that expected auto-deposit on `→ Buying`.
5. **`SetDealPriceDialog` replaced by `BuyingTransitionDialog`** — the new dialog is a superset: it includes deal price, deposit status, and an inline mini-payment form. Old dialog deleted.
6. **`useDesignerLeads` uses the kanban endpoint** — avoids 4 separate paginated calls. Kanban returns all leads; filtering to 4 statuses is O(n).
7. **Removed `clientName`/`clientPhone`/`clientAddress` from Designer schema** — these were FE-only fields never sent to the backend, now fully redundant since every measurement is linked to a lead.

## Known Issues / Tech Debt

- **Designer does not load existing measurement from `?measurementId` URL param** — the drawer links to `/designer?measurementId=xxx` but the Designer ignores this param. Planned for Phase 4 or later.
- **No per-lead measurement count in `CreateBatchDialog`** — `LeadSummaryResponse` has no count; adding it requires a backend change or N+1 fetches. Acceptable since Step 5 guarantees counts ≥ 1.
- **`InstalledTransitionDialog` not implemented** — the BE rejects with `BALANCE_NOT_PAID`; the FE shows the error inline. A dedicated dialog is a future polish item.

## Test Coverage

- **BE (90 tests):** Domain transitions (unit), Application service unit tests (+6 new Step 8 guards), Integration tests for CRUD, status transitions (+2 deposit-gate tests), finances (+`totalDepositTjs` assertion), factory orders
- **FE (73 tests):** Designer page (lead selector), DrawingCanvas, Hole drag, computePanels, defaultHoles, LeadStatusBadge, RefuseLeadDialog

## Next Phase Overview

Phase 4 builds the Analytics dashboard — admin sees business KPIs (funnel, revenue by period, refusal reasons, color/product popularity). It depends on Phase 3.5 because every lead now has a reliably linked measurement, making per-lead revenue and glass-cost calculations accurate. The backend will add 6 aggregation endpoints with short-lived in-memory caching, and the frontend will add a Dashboard page with Recharts visualizations and a date-range filter.
