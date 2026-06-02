# Vision — SHISHA_TJ

## Product
Web application for a shower-cabin manufacturer (Dushanbe, Tajikistan).
Currently the business runs on Google Sheets + paper sketches.
We replace this with a structured tool that scales to multiple companies.

## Users
- **Admin** (owner): full access, finances, analytics, user management
- **Operator**: takes calls, manages leads up to "Measurement"
- **Measurer**: visits clients, uses the Designer to make drawings, takes deposits

## Two Core Subsystems

### 1. Designer
Measurer arrives at client's apartment, measures the opening, enters width/height
into the app. The app:
- Auto-calculates glass panel widths using the formulas (see `DesignerLogic.md`)
- Renders an SVG drawing with holes placed by default
- Allows the measurer to drag/add/remove holes manually
- Generates a PDF (A4 or A3) with client data + financials + drawing
- The PDF is sent to the glass factory and kept as client record

### 2. CRM + Finances
- Kanban board with statuses: New → Measurement → Thinking → Refused / Buying → OrderedAtFactory → GlassArrived → Installed → Closed
- A single `Lead` entity carries the client through all stages (no separate Client table)
- Factory orders are **batches** — multiple clients' glasses ordered together
- Profit tracked per client: deal price − (factory glass + hardware + master fee + reworks)
- Dashboard with revenue, profit, conversion, refusal reasons

## MVP Scope (v1)
- ✅ Two-glass and three-glass straight configurations
- ✅ One handle type, fixed factory-standard hardware set
- ✅ Russian language
- ✅ TJS currency only
- ✅ Single tenant in production (architecture is multi-tenant from day 1)

## Out of v1
- Corner / U-shaped cabinets
- Multiple handle types
- SMS / Telegram notifications
- E-signature
- Native mobile app (PWA is enough)
- Multi-currency
- Hardware inventory tracking (we buy per order)

## Glossary

| Term | Meaning |
|------|---------|
| **Glass / Стекло** | A single tempered glass panel (door or fixed) |
| **Door / Дверь** | The sliding panel with the handle, max 800mm wide |
| **Fixed / Глухое** | Non-moving glass panel attached to the rail |
| **Rail / Рельса** | Horizontal track above the cabin that the door slides on |
| **Measurement / Замер** | The full set of dimensions and holes for one client's cabin |
| **Hole / Отверстие** | Drilling point on a glass panel (for rollers, handle, mounting) |
| **Factory Order / Заказ на завод** | A batch of glasses ordered together from the supplier |
| **Hardware / Фурнитура** | Rollers, handle, seals — one set per cabin |
| **Deposit / Аванс** | Partial payment at contract signing |
| **Rework / Переделка** | Re-manufacture of a glass due to error (factory's or our mistake) |
| **TJS** | Tajik Somoni (currency) |
