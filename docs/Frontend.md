# Frontend — React + Vite + TS

## Folder structure

```
frontend/
  src/
    app/
      App.tsx                 — root, wraps providers + router
      providers.tsx           — QueryClientProvider, AuthProvider, ThemeProvider
      router.tsx              — React Router config with route guards
      layout/
        AppShell.tsx          — sidebar + header + content slot
        Sidebar.tsx
        Header.tsx
    features/
      auth/
        api.ts                — login, refresh, logout, me
        AuthContext.tsx
        LoginPage.tsx
        useAuth.ts
        ProtectedRoute.tsx
      leads/
        api.ts                — TanStack Query hooks (useLeads, useLead, useUpdateLead…)
        LeadsListPage.tsx
        LeadsKanbanPage.tsx
        LeadDetailPage.tsx
        components/
          LeadCard.tsx
          KanbanColumn.tsx
          LeadStatusBadge.tsx
          NewLeadDialog.tsx
          AssignMeasurerDialog.tsx
          RefusalDialog.tsx
        schemas.ts            — Zod schemas for forms
      designer/
        DesignerPage.tsx
        components/
          DrawingCanvas.tsx
          GlassPanel.tsx
          Hole.tsx
          MeasurementForm.tsx
          CalculationSidebar.tsx
        lib/
          computePanels.ts    — pure: see DesignerLogic.md
          defaultHoles.ts     — pure
          formatters.ts
          computePanels.test.ts
          defaultHoles.test.ts
        api.ts                — useMeasurement, useSaveMeasurement, useDownloadPdf
        schemas.ts
      factory-orders/
        ...
      finances/
        ...
      analytics/
        ...
    shared/
      api/
        client.ts             — axios instance with interceptors
        queryKeys.ts          — centralized query keys
        types.ts              — generated from OpenAPI
      ui/                     — shadcn primitives (button, input, dialog, table, ...)
      hooks/
        useDebounce.ts
        useDisclosure.ts
        useMediaQuery.ts
      lib/
        cn.ts                 — clsx + tailwind-merge
        formatMoney.ts
        formatDate.ts
    entities/
      Lead.ts
      Measurement.ts
      Glass.ts
      Payment.ts
      ...
  public/
  index.html
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json
```

## TypeScript types — single source

- Backend Swagger → `npm run generate:types` → writes `src/shared/api/types.ts`
- Manual entity types in `src/entities/` import from generated types
- **Never** hand-write a type that exists in the API — generate it

```ts
// entities/Lead.ts
import type { components } from '@/shared/api/types'
export type Lead = components['schemas']['LeadDto']
export type LeadStatus = components['schemas']['LeadStatus']
```

## TanStack Query patterns

Query keys live in one place:

```ts
// shared/api/queryKeys.ts
export const queryKeys = {
  leads: {
    all: ['leads'] as const,
    list: (filters: LeadFilters) => ['leads', 'list', filters] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
    kanban: () => ['leads', 'kanban'] as const,
  },
  measurements: {
    detail: (id: string) => ['measurements', id] as const,
  },
  // ...
}
```

Hooks export per feature:

```ts
// features/leads/api.ts
export const useLeads = (filters: LeadFilters) =>
  useQuery({ queryKey: queryKeys.leads.list(filters), queryFn: () => fetchLeads(filters) })

export const useUpdateLeadStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateLeadStatus,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all })
    },
  })
}
```

## Forms — React Hook Form + Zod

```ts
const schema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+?\d{9,15}$/),
  product: z.string().min(1),
})
type FormValues = z.infer<typeof schema>

const form = useForm<FormValues>({ resolver: zodResolver(schema) })
```

## Styling

- Tailwind only
- Use `cn()` from `shared/lib/cn.ts` for conditional classes
- shadcn/ui components customized via Tailwind, never forked

## Pure functions — Designer math

`features/designer/lib/computePanels.ts` and similar files:
- Pure functions, no imports from React or browser APIs
- Fully unit-tested with Vitest
- Mirror backend service exactly (see `DesignerLogic.md` reference cases)

## Tests

- Unit: Vitest, co-located `*.test.ts`
- Component: React Testing Library
- E2E: Playwright (added in Phase 5)

## Build commands

| Command | What |
|---------|------|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve prod build locally |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Single-run for CI |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run generate:types` | Pull OpenAPI from BE → write types.ts |
