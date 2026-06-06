# PROGRESS — SHISHA_TJ

Phased plan. Each step is tagged `[BE]`, `[FE]`, or `[FULL]`.
Update via `/done` command after each completed step.

---

## Phase 0 — Foundation ✅ Complete — 2026-06-03
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
- [x] Step 8 [FE] — Axios client with JWT interceptors + auth context + protected routes
- [x] Step 9 [FE] — Layout shell (sidebar + header + dark mode toggle) + login page
- [x] Step 10 [FE] — Auto-generated TS types from Swagger (`openapi-typescript` script)
- [x] Step 11 [FULL] — Integration test: login flow end-to-end
- [x] **Phase 0 complete** → tag `v0.1-foundation`

---

## Phase 1 — Designer (the killer feature) ✅ Complete — 2026-06-03
**Goal:** measurer can produce a PDF drawing on a tablet at the client's apartment.

- [x] Step 1 [FE] — Pure functions in `features/designer/lib/`:
  - `computePanels(measureMm, heightMm, mode)` — returns array of `{width, isDoor}`
  - `defaultHoles(panel, height)` — returns array of `{x, y, r, type}`
  - Unit tests: 156 → 80/80, 166 → 90/80, 200+4=204 → 124/80, etc.
- [x] Step 2 [FE] — `<DrawingCanvas>` SVG component (panels + dimensions + holes)
- [x] Step 3 [FE] — `<Hole>` with pointer-events drag (works on tablet)
- [x] Step 4 [FE] — Designer page form (width, height, config, colors, client info)
- [x] Step 5 [FE] — Right sidebar: area, master fee (120 × m²), deposit, balance
- [x] Step 6 [BE] — Entities: `Measurement`, `Glass`, `Hole`, `GlassColor` (enum), `HardwareColor` (enum)
- [x] Step 7 [BE] — Migration: `AddMeasurements`
- [x] Step 8 [BE] — `MeasurementService` + endpoints: POST/GET/PUT `/api/v1/measurements`
- [x] Step 9 [BE] — PDF generation with QuestPDF: A4 + A3 layouts, drawing + client header + financials
- [x] Step 10 [BE] — Endpoint: `GET /api/v1/measurements/{id}/pdf?format=a4`
- [x] Step 11 [FULL] — Wire frontend Designer → BE save → download PDF
- [x] Step 12 [QA] — End-to-end test on real tablet + Android phone
- [x] **Phase 1 complete** → tag `v0.2-designer`

---

## Phase 2 — CRM Kanban ✅ Complete — 2026-06-04
**Goal:** operator manages leads, measurer sees assigned visits.

- [x] Step 1 [BE] — Entity `Lead` with status enum + transitions service
- [x] Step 2 [BE] — Entity `RefusalReason` + `Product` (seed data)
- [x] Step 3 [BE] — Migration: `AddLeads`
- [x] Step 4 [BE] — `LeadService` + CRUD endpoints + status transition endpoint
- [x] Step 5 [BE] — Link `Lead → Measurement` (one-to-many)
- [x] Step 6 [FE] — Leads list page (table view) with filters
- [x] Step 7 [FE] — Kanban view with dnd-kit (drag cards between status columns)
- [x] Step 8 [FE] — Lead detail page (info, history, measurements, payments)
- [x] Step 9 [FE] — New lead form (operator)
- [x] Step 10 [FE] — Assign-measurer modal
- [x] Step 11 [FE] — Refusal modal (with reason selection)
- [x] Step 12 [QA] — Status transition validation (can't skip steps)
- [x] **Phase 2 complete** → tag `v0.3-crm`

---

## Phase 3 — Finances ✅ Complete — 2026-06-05
**Goal:** track factory orders, hardware, payments, profit per lead.

- [x] Step 1 [BE] — Entities: `FactoryOrder`, `FactoryOrderItem`, `Payment`, `Hardware`, `Expense`
- [x] Step 2 [BE] — Migration: `AddFinances`
- [x] Step 3 [BE] — `FactoryOrderService` (create batch from selected leads)
- [x] Step 4 [BE] — `PaymentService` (deposit + balance + refund)
- [x] Step 5 [BE] — `ProfitCalculator` service (price − glass − hardware − master − reworks)
- [x] Step 6 [BE] — Endpoint: `GET /api/v1/leads/{id}/finances` — full picture
- [x] Step 7 [BE] — PDF for factory order (list of all glasses in batch with codes, sizes, holes)
- [x] Step 8 [FE] — Factory orders page (list + create batch flow)
- [x] Step 9 [FE] — Lead finances panel (in detail page)
- [x] Step 10 [FE] — Payment forms (deposit, balance, rework)
- [x] Step 11 [FE] — Hardware form (cost per order)
- [x] **Phase 3 complete** → tag `v0.4-finances`

---

## Phase 3.5 — UX Polish ✅ Complete — 2026-06-05
**Цель:** все действия с лидом из одного drawer; замеры реально привязаны к лидам.

- [x] Step 1 [FE] — Кнопка "+ Новый лид" в шапке Канбана (как в LeadsListPage)
- [x] Step 2 [FE] — LeadDetailDrawer (slide-in panel справа, ~640px) вместо страницы /leads/{id} при клике из списка/канбана
- [x] Step 3 [FE] — Карточка в Канбане и строка в таблице открывают drawer, а не навигируют
- [x] Step 4 [FE] — В drawer: кнопка "Редактировать" (EditLeadDialog), inline AddPaymentDialog, секция замеров со ссылкой "Открыть в Дизайнере"
- [x] Step 5 [FULL] — В Дизайнере обязательный селектор лида; BE валидирует lead.status ∈ {Measurement, Buying, OrderedAtFactory, GlassArrived}
- [x] Step 6 [FE] — CreateBatchDialog: после Step 5 у Buying-лидов есть замеры, "нет замеров" исчезает
- [x] Step 7 [QA] — End-to-end: создать лид → Замер → открыть Дизайнер с этим лидом → сохранить замер → Покупает → создать заказ на завод
- [x] Step 8 [FULL] — Ужесточение правил перехода статусов: Measurement→Thinking требует замер; →Buying требует замер + dealPriceTjs + депозит ≥ 100 TJS; →Installed требует полную оплату; удалить автосоздание платежей из transition service
- [x] Step 8.1 [FULL] — Депозит запрещён без замера (BE BusinessRuleException + FE guard); кнопка "+ Создать замер" в drawer; DesignerPage принимает ?leadId= (prefill + disable + back-navigate)
- [x] **Phase 3.5 complete** → tag `v0.4.1-ux-polish`

---

## Phase 4 — Analytics
**Goal:** admin sees what's happening business-wide.

- [x] Step 1 [BE] — Endpoints: dashboard, funnel, refusals, by-product, by-color, by-measurer
- [x] Step 2 [BE] — Caching (5–15 min in-memory)
- [x] Step 3 [FE] — Dashboard page (KPIs + revenue chart)
- [x] Step 4 [FE] — Funnel visualization (horizontal bar)
- [x] Step 5 [FE] — Refusal reasons table
- [x] Step 6 [FE] — Color popularity pie charts
- [x] Step 7 [FE] — Date range filter (month / quarter / year / custom)
- [x] **Phase 4 complete** → tag `v0.5-analytics`

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
