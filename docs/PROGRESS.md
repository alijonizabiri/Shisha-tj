# PROGRESS — SHISHA_TJ

Phased plan. Each step is tagged `[BE]`, `[FE]`, or `[FULL]`.
Update via `/done` command after each completed step.

---

## Phase 0 — Foundation
**Goal:** repos, infra, auth, base layout. Nothing visible to the end user yet.

- [x] Step 1 [FULL] — Repository scaffold
  - BE: `dotnet new sln`, 4 projects (Domain, Application, Infrastructure, Api)
  - FE: `npm create vite@latest` + TS strict + Tailwind + shadcn init
  - Root: `.gitignore`, `README.md`, `docker-compose.yml` (postgres, seq)
- [x] Step 2 [BE] — Base entities: `BaseEntity`, `ITenantOwned`, `ISoftDeletable`, `Tenant`, `User`, `UserRole`
- [x] Step 3 [BE] — `AppDbContext` + EF configurations + global query filters (tenant + soft delete)
- [x] Step 4 [BE] — Migration: `InitialIdentity`
- [x] Step 5 [BE] — JWT auth (login, refresh, logout) + `CurrentUser` accessor + tenancy middleware
- [x] Step 6 [BE] — `SaveChangesInterceptor` (auto-fill `CreatedAt`, `UpdatedAt`, `TenantId`)
- [x] Step 7 [BE] — Serilog wiring + `/health` endpoint + Swagger
- [ ] Step 8 [FE] — Axios client with JWT interceptors + auth context + protected routes
- [ ] Step 9 [FE] — Layout shell (sidebar + header + dark mode toggle) + login page
- [ ] Step 10 [FE] — Auto-generated TS types from Swagger (`openapi-typescript` script)
- [ ] Step 11 [FULL] — Integration test: login flow end-to-end
- [ ] **Phase 0 complete** → tag `v0.1-foundation`

---

## Phase 1 — Designer (the killer feature)
**Goal:** measurer can produce a PDF drawing on a tablet at the client's apartment.

- [ ] Step 1 [FE] — Pure functions in `features/designer/lib/`:
  - `computePanels(measureMm, heightMm, mode)` — returns array of `{width, isDoor}`
  - `defaultHoles(panel, height)` — returns array of `{x, y, r, type}`
  - Unit tests: 156 → 80/80, 166 → 90/80, 200+4=204 → 124/80, etc.
- [ ] Step 2 [FE] — `<DrawingCanvas>` SVG component (panels + dimensions + holes)
- [ ] Step 3 [FE] — `<Hole>` with pointer-events drag (works on tablet)
- [ ] Step 4 [FE] — Designer page form (width, height, config, colors, client info)
- [ ] Step 5 [FE] — Right sidebar: area, master fee (120 × m²), deposit, balance
- [ ] Step 6 [BE] — Entities: `Measurement`, `Glass`, `Hole`, `GlassColor` (enum), `HardwareColor` (enum)
- [ ] Step 7 [BE] — Migration: `AddMeasurements`
- [ ] Step 8 [BE] — `MeasurementService` + endpoints: POST/GET/PUT `/api/v1/measurements`
- [ ] Step 9 [BE] — PDF generation with QuestPDF: A4 + A3 layouts, drawing + client header + financials
- [ ] Step 10 [BE] — Endpoint: `GET /api/v1/measurements/{id}/pdf?format=a4`
- [ ] Step 11 [FULL] — Wire frontend Designer → BE save → download PDF
- [ ] Step 12 [QA] — End-to-end test on real tablet + Android phone
- [ ] **Phase 1 complete** → tag `v0.2-designer`

---

## Phase 2 — CRM Kanban
**Goal:** operator manages leads, measurer sees assigned visits.

- [ ] Step 1 [BE] — Entity `Lead` with status enum + transitions service
- [ ] Step 2 [BE] — Entity `RefusalReason` + `Product` (seed data)
- [ ] Step 3 [BE] — Migration: `AddLeads`
- [ ] Step 4 [BE] — `LeadService` + CRUD endpoints + status transition endpoint
- [ ] Step 5 [BE] — Link `Lead → Measurement` (one-to-many)
- [ ] Step 6 [FE] — Leads list page (table view) with filters
- [ ] Step 7 [FE] — Kanban view with dnd-kit (drag cards between status columns)
- [ ] Step 8 [FE] — Lead detail page (info, history, measurements, payments)
- [ ] Step 9 [FE] — New lead form (operator)
- [ ] Step 10 [FE] — Assign-measurer modal
- [ ] Step 11 [FE] — Refusal modal (with reason selection)
- [ ] Step 12 [QA] — Status transition validation (can't skip steps)
- [ ] **Phase 2 complete** → tag `v0.3-crm`

---

## Phase 3 — Finances
**Goal:** track factory orders, hardware, payments, profit per lead.

- [ ] Step 1 [BE] — Entities: `FactoryOrder`, `FactoryOrderItem`, `Payment`, `Hardware`, `Expense`
- [ ] Step 2 [BE] — Migration: `AddFinances`
- [ ] Step 3 [BE] — `FactoryOrderService` (create batch from selected leads)
- [ ] Step 4 [BE] — `PaymentService` (deposit + balance + refund)
- [ ] Step 5 [BE] — `ProfitCalculator` service (price − glass − hardware − master − reworks)
- [ ] Step 6 [BE] — Endpoint: `GET /api/v1/leads/{id}/finances` — full picture
- [ ] Step 7 [BE] — PDF for factory order (list of all glasses in batch with codes, sizes, holes)
- [ ] Step 8 [FE] — Factory orders page (list + create batch flow)
- [ ] Step 9 [FE] — Lead finances panel (in detail page)
- [ ] Step 10 [FE] — Payment forms (deposit, balance, rework)
- [ ] Step 11 [FE] — Hardware form (cost per order)
- [ ] **Phase 3 complete** → tag `v0.4-finances`

---

## Phase 4 — Analytics
**Goal:** admin sees what's happening business-wide.

- [ ] Step 1 [BE] — Endpoints: dashboard, funnel, refusals, by-product, by-color, by-measurer
- [ ] Step 2 [BE] — Caching (5–15 min in-memory)
- [ ] Step 3 [FE] — Dashboard page (KPIs + revenue chart)
- [ ] Step 4 [FE] — Funnel visualization (horizontal bar)
- [ ] Step 5 [FE] — Refusal reasons table
- [ ] Step 6 [FE] — Color popularity pie charts
- [ ] Step 7 [FE] — Date range filter (month / quarter / year / custom)
- [ ] **Phase 4 complete** → tag `v0.5-analytics`

---

## Phase 5 — Production Polish
**Goal:** ship to real users.

- [ ] Step 1 [DEV] — Dockerfile (BE) + Dockerfile (FE with nginx)
- [ ] Step 2 [DEV] — docker-compose.prod.yml + nginx reverse proxy + SSL
- [ ] Step 3 [DEV] — GitHub Actions: build + test on PR, deploy on main
- [ ] Step 4 [DEV] — Daily pg_dump → MinIO/S3
- [ ] Step 5 [FE] — PWA manifest + service worker (offline Designer)
- [ ] Step 6 [BE] — Rate limiting + security audit
- [ ] Step 7 [FULL] — Regression pass + Lighthouse 90+ on FE
- [ ] Step 8 [DEV] — Production deploy + smoke test
- [ ] **Phase 5 complete** → tag `v1.0`

---

## Notes
- Tags follow semver: `v0.X-feature` until v1.0
- Each `[FULL]` step is one logical feature on both sides — counts as one step
- If a step turns out larger than expected, split it and update this file before coding
