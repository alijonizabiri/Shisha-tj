# Phase 2 — CRM Kanban Summary

**Status:** ✅ Complete
**Completed:** 2026-06-04
**Branch:** main
**Tag:** v0.3-crm

## What Was Built

### Backend
- `Lead` entity with `LeadStatus` enum (9 values: New → Closed/Refused) and full EF Core configuration
- `RefusalReason` entity with tenant-scoped seed data (5 reasons: Дорого, Передумал, Нашёл дешевле, Не понравился дизайн, Другое)
- `Product` entity with seed data (shower-cabin product types)
- `LeadStatusTransitionService` — allowlist-based state machine with side-effect guards
- `LeadService` — full CRUD + `PatchStatusAsync` + `AssignMeasurerAsync` + lookup methods
- `LeadsController` — 8 endpoints (list, kanban, get, create, update, patch-status, assign-measurer, delete)
- `UsersController` — `GET /api/v1/users/measurers` for the assign-measurer modal
- `LookupsController` — `GET /api/v1/refusal-reasons` + `GET /api/v1/products`
- `AddLeads` migration — Lead, RefusalReason, Product tables + FK indexes
- `AddLeadToMeasurement` migration — `lead_id` FK on Measurements table + `LeadDetailResponse` with measurements

### Frontend
- `LeadsListPage` — paginated table with status/search filters, delete, link to detail
- `LeadsKanbanPage` — dnd-kit Kanban board, drag cards between status columns, 409/400 error display
- `LeadDetailPage` — full detail view with measurements, payments placeholder, assign/refuse buttons
- `NewLeadDialog` — form with Zod validation, product dropdown, create-lead mutation
- `AssignMeasurerDialog` — picks measurer + address, handles New→Measurement or reassign
- `RefuseLeadDialog` — radio-list of refusal reasons + optional note, submits Refused transition
- `LeadStatusBadge` — colored badge for all 9 statuses with Russian labels
- `KanbanColumn`, `LeadCard` — dnd-kit droppable/draggable with DragOverlay
- Hooks: `useLeads`, `useKanban`, `useLead`, `useCreateLead`, `useMeasurers`, `useRefusalReasons`, `useProducts`, `usePatchLeadStatus`, `useAssignMeasurer`, `useDeleteLead`
- Shared types: `LeadSummaryResponse`, `LeadDetailResponse`, `KanbanResponse`, `PatchStatusRequest`, `MeasurerDto`, `ProductDto`, `RefusalReasonDto`

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `Domain/Entities/Lead.cs` | Lead aggregate root with all fields |
| `Domain/Enums/LeadStatus.cs` | 9-value status enum |
| `Application/Leads/LeadStatusTransitionService.cs` | Allowlist state machine |
| `Application/Leads/LeadDtos.cs` | All request/response/lookup DTOs |
| `Infrastructure/Services/LeadService.cs` | All business logic |
| `Api/Controllers/LeadsController.cs` | 8 HTTP endpoints |
| `Api/Controllers/LookupsController.cs` | Refusal reasons + products |
| `Api/Controllers/UsersController.cs` | Measurers endpoint |

### Frontend
| File | Purpose |
|------|---------|
| `features/leads/api.ts` | All TanStack Query hooks for leads |
| `features/leads/LeadsListPage.tsx` | Paginated list with filters |
| `features/leads/LeadsKanbanPage.tsx` | dnd-kit drag board |
| `features/leads/LeadDetailPage.tsx` | Detail view + action buttons |
| `features/leads/components/AssignMeasurerDialog.tsx` | Assign measurer modal |
| `features/leads/components/RefuseLeadDialog.tsx` | Refusal modal with reasons |
| `features/leads/lib/leadStatuses.ts` | Status labels + badge colors |
| `features/leads/schemas.ts` | Zod form schemas |

## Migrations Applied

| Migration | Contents |
|-----------|---------|
| `20260604033809_AddLeads` | `leads`, `refusal_reasons`, `products` tables; FK indexes; soft-delete columns |
| `20260604035549_AddLeadToMeasurement` | `lead_id` FK on `measurements`; composite index |

## Architecture Decisions

1. **`PatchStatus` does not validate measurer existence** — the transition service only checks non-null; the `AssignMeasurer` endpoint does the FK check. This is intentional to keep the transition simple and let the Kanban drag (which sends `assignedMeasurerId`) work without a separate round-trip.

2. **`LookupsController` added mid-phase (Step 11)** — the spec listed `GET /api/v1/refusal-reasons` and `GET /api/v1/products` under Lookups, but no controller was created in Phase 2's BE steps. Added alongside the FE refusal modal since it was a hard prerequisite. This also fixed the missing products endpoint used by `NewLeadDialog`.

3. **Kanban drag to "Refused" column fails gracefully** — dragging a card to the Refused column sends a `PATCH` without `refusalReasonId`, returns 400, and the board shows "Требуются дополнительные данные". The `RefuseLeadDialog` on the detail page is the proper flow.

4. **`refuseNote` is optional in schema** — the spec doesn't mandate a note for refusals, only `refusalReasonId`. Zod schema reflects this: `refuseLeadSchema.refusalNote` is optional with max 2000 chars.

## Known Issues / Tech Debt

| Issue | Target Phase |
|-------|-------------|
| `GET /api/v1/leads/{id}/finances` not yet wired | Phase 3 |
| Payments section on detail page is a placeholder | Phase 3 |
| Buying transition requires `dealPriceTjs` but FE has no "→ Buying" modal yet | Phase 3 |
| `GET /api/v1/auth/me` endpoint exists in spec but not in code | Phase 5 (polish) |
| Frontend chunk size warning (580 kB) | Phase 5 (code-splitting) |
| Operator cannot transition to OrderedAtFactory+ — no UI for those transitions | Phase 3 |

## Test Coverage

### Backend (80 tests total)
- **Domain (1):** Placeholder
- **Application (35):** `LeadStatusTransitionServiceTests` — full CanTransition matrix (allowed, same-status, forbidden) + all side-effect validations (missing measurer, address, refusal reason, deal price, date guards)
- **Integration (44):** CRUD happy-paths, kanban, auth guards, status transition QA (skip-step × 5, 409 body validation, same-status no-op, multi-step happy paths, re-open, backwards transition, missing required data), lookup endpoints

### Frontend (73 tests total)
- Auth: `LoginPage` (3), `ProtectedRoute` (2), `useAuth` (1)
- Designer: `DesignerPage` (2), `DrawingCanvas` (3), `Hole` (3), `computePanels` (8), `defaultHoles` (8)
- Leads: `LeadStatusBadge` (10), `NewLeadDialog` (10), `AssignMeasurerDialog` (9), `RefuseLeadDialog` (9)
- Shared: `cn` (3), integration login test (1)

## Next Phase Overview

Phase 3 builds the financial layer that gives the business its P&L visibility: factory orders (batching lead glasses into a single manufacturing request), payments (deposit + balance + refunds), hardware costs, and a per-lead profit calculator. It depends on Phase 2's Lead and Measurement models — factory orders reference glasses from specific measurements, and payments are linked to specific leads. The `→ Buying` transition (which creates a deposit payment) and `→ Installed` transition (which creates a balance payment) will be fully implemented in Phase 3.
