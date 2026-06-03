# Phase 1 — Designer Summary

**Status:** ✅ Complete
**Completed:** 2026-06-03
**Branch:** main
**Tag:** v0.2-designer

## What Was Built

### Frontend
- `computePanels()` + `defaultHoles()` — pure math functions matching backend exactly (TwoGlass / ThreeGlass formulas, roller+handle+mount holes)
- `DrawingCanvas` — SVG component rendering glass panels with dimension lines and draggable hole circles (pointer-events, tablet-safe)
- `Hole` — draggable SVG circle using pointer capture API
- `MeasurementForm` — React Hook Form + Zod form: width, height, configuration (radio toggle), glass color, hardware color, client info, delivery, deposit
- `CalculationSidebar` — live-computed area, master fee (120 TJS/m²), delivery input, deposit input, balance
- `DesignerPage` — three-panel layout (form | canvas | sidebar) with warnings, save mutation, PDF download buttons
- `api.ts` — `useSaveMeasurement` TanStack Query mutation + `downloadMeasurementPdf` blob download via JWT-authorized axios

### Backend
- 5 enums: `GlassColor`, `HardwareColor`, `CabinConfiguration`, `HandleSide`, `HoleType`
- 3 entities: `Measurement` (xmin concurrency), `Glass`, `Hole` — all with tenant isolation + soft delete
- 3 EF configurations with snake_case, FK indexes, Restrict deletes
- `PanelComputer` — mirrors frontend math exactly (including JS `Math.round` half-up semantics)
- `MeasurementService` — create (computes panels, saves glasses + holes), get by ID, update (soft-deletes old glasses/holes, recomputes)
- 3 REST endpoints: `POST /api/v1/measurements` (201), `GET /api/v1/measurements/{id}` (200/404), `PUT /api/v1/measurements/{id}` (200/404/400)
- `MeasurementPdfService` — QuestPDF 2026 document generating A4/A3 PDF with SVG cabin drawing, glass table, area + master fee
- `GET /api/v1/measurements/{id}/pdf?format=a4` endpoint
- Fixed JWT claim names (`sub`/`role`/`email`) to align with `CurrentUserAccessor`

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `Shisha.Domain/Entities/Measurement.cs` | Aggregate root with xmin concurrency token |
| `Shisha.Domain/Entities/Glass.cs` | Child of Measurement; position + isDoor + dimensions |
| `Shisha.Domain/Entities/Hole.cs` | Child of Glass; x/y/radius/type |
| `Shisha.Application/Designer/PanelComputer.cs` | Pure panel computation, mirrors FE |
| `Shisha.Application/Measurements/MeasurementDtos.cs` | All request/response records |
| `Shisha.Infrastructure/Services/MeasurementService.cs` | CRUD + panel computation + AsNoTracking load |
| `Shisha.Infrastructure/Pdf/MeasurementPdfService.cs` | QuestPDF document with SVG drawing |
| `Shisha.Api/Controllers/MeasurementsController.cs` | 4 endpoints (POST, GET, PUT, GET pdf) |

### Frontend
| File | Purpose |
|------|---------|
| `features/designer/lib/computePanels.ts` | Pure panel + metrics math |
| `features/designer/lib/defaultHoles.ts` | Default hole positions per panel type |
| `features/designer/components/DrawingCanvas.tsx` | SVG cabin drawing with hole drag |
| `features/designer/components/MeasurementForm.tsx` | RHF+Zod form |
| `features/designer/components/CalculationSidebar.tsx` | Live financial calc |
| `features/designer/DesignerPage.tsx` | Page composition + save flow |
| `features/designer/api.ts` | TanStack Query mutation + PDF download |

## Migrations Applied

| Name | Tables |
|------|--------|
| `InitialIdentity` (Phase 0) | tenants, users, refresh_tokens |
| `AddMeasurements` | measurements, glasses, holes |

## Architecture Decisions

| Decision | Reason |
|----------|--------|
| `LeadId` omitted from `Measurement` in Phase 1 | Lead entity doesn't exist until Phase 2; added in Phase 2 Step 5 |
| Client info (name/phone/address) not persisted on Measurement | Belongs on Lead; Phase 1 PDF omits client header |
| `AsNoTracking()` in `LoadResponseAsync` | EF Core change tracker merged stale soft-deleted glasses back into result without it |
| SVG instead of raw SkiaSharp for PDF drawing | QuestPDF 2026 has native SVG support; simpler and identical output to frontend DrawingCanvas |
| `useWatch` instead of `form.watch()` in DesignerPage | React Compiler lint rule `react-hooks/incompatible-library` blocks `form.watch()` in component body |
| Derived hole state (`holeTracker` keyed by `canvasKey`) | React Compiler bans `useEffect(() => setState(...))` and ref mutation during render |

## Known Issues / Tech Debt

| Issue | Target Phase |
|-------|-------------|
| Client info (name/phone/address) not saved to DB | Phase 2 — linked via Lead |
| `deliveryTjs` / `depositTjs` captured in form but not persisted | Phase 3 — Finances |
| PDF client header is blank | Phase 2 / Phase 3 |
| `handleSide` not in MeasurementForm UI (always "Right") | Phase 1 QA polish |
| Frontend bundle > 500KB (chunk splitting needed) | Phase 5 — Production Polish |

## Test Coverage

- **BE**: 19 tests — 2 unit (domain/application), 17 integration (auth flow + audit interceptor + measurement CRUD + PDF endpoint)
- **FE**: 54 tests — 22 unit (computePanels), 20 unit (defaultHoles), 6 component (DrawingCanvas), 4 component (Hole), 2 unit (cn), 12 component (DesignerPage)

## Next Phase Overview

Phase 2 builds the CRM Kanban: operators manage leads through statuses (`New → Measurement → Thinking → Buying → ...`), measurers see their assigned visits, and the `Lead → Measurement` link established here enables the full data model. Phase 2 depends on Phase 1's measurement entity being stable so the FK can be added.
