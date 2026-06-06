# Phase 4 — Analytics — Summary

**Completed:** 2026-06-06
**Tag:** `v0.5-analytics`
**Tests:** BE 101/101 | FE 89/89

---

## What was built

### Backend (Steps 1–2)

**6 Admin-only analytics endpoints** under `GET /api/v1/analytics/`:
- `dashboard` — TotalLeads, ActiveLeads, RevenueTjs, ConversionRate, AvgDealSizeTjs
- `funnel` — all 9 LeadStatus values with counts
- `refusals` — grouped by RefusalReasonId with labels + percentages
- `by-product` — grouped by Product with lead count + closed revenue
- `by-color` — glass and hardware color popularity from Measurements
- `by-measurer` — per-measurer lead count, revenue, and conversion rate

All endpoints:
- `[Authorize(Roles = "Admin")]`
- Tenant-scoped via EF Core global query filters
- Accept optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` date range
- Backed by **10-minute in-memory cache** keyed on `tenantId:endpoint:from:to`

**`BusinessRuleException`** — reusable domain exception for custom errorCodes (first used in Phase 3.5 for `MEASUREMENT_REQUIRED_FOR_PAYMENT`).

**`ApiFactory` updated** to seed a Measurer user alongside Admin, enabling proper by-measurer integration tests.

### Frontend (Steps 3–7)

**`features/analytics/`** — new feature module:

| File | Purpose |
|------|---------|
| `api.ts` | 6 typed hooks (`useAnalyticsDashboard`, etc.) with `staleTime: 10min` |
| `AnalyticsDashboardPage.tsx` | Main page — state + layout |
| `components/KpiCard.tsx` | KPI card with optional trend color |
| `components/RevenueByProductChart.tsx` | Recharts BarChart with custom tooltip |
| `components/FunnelChart.tsx` | Horizontal bar chart (`layout="vertical"`) for all 9 statuses |
| `components/RefusalsTable.tsx` | Refusal reasons with inline percentage progress bars |
| `components/ColorPieChart.tsx` | Donut PieChart with legend (glass + hardware colors, Russian labels) |
| `components/DateRangeFilter.tsx` | Preset buttons (Всё время / Месяц / Квартал / Год) + custom date inputs |

**Routing:** `/` (root) and `/analytics` both render `AnalyticsDashboardPage`.

**Date range filter** propagates `{ from, to }` through all 5 hooks simultaneously — changing a preset triggers React Query to refetch with the new keys.

---

## Architecture decisions

- **No Redux for analytics state** — `useState` for `DateRange` in the page component; React Query manages server state with 10-min staleTime matching the server cache TTL
- **Caching decorator via injection** — `IMemoryCache` + `ICurrentUser` injected into `AnalyticsService`; each public method delegates to a private `Compute*` method, keeping logic separate from cache plumbing
- **Custom Recharts tooltips** — avoids Recharts v3 `Formatter` type complexity
- **Tenant-scoped cache keys** — prevents cross-tenant cache leakage in a multi-tenant system
