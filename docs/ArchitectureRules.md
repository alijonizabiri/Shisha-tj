# Architecture Rules

## Backend — Clean Architecture (4 projects)

```
backend/
  src/
    Shisha.Domain         — entities, value objects, enums, domain exceptions
    Shisha.Application    — services, DTOs, interfaces, validators, use cases
    Shisha.Infrastructure — EF Core DbContext, repos, external services (PDF, email)
    Shisha.Api            — controllers, middleware, Program.cs, DI wiring
  tests/
    Shisha.Domain.Tests
    Shisha.Application.Tests
    Shisha.Api.IntegrationTests   — Testcontainers PostgreSQL
```

**Dependency direction (inward only):**
- `Domain` ← nothing
- `Application` ← Domain
- `Infrastructure` ← Application + Domain
- `Api` ← Application + Infrastructure + Domain

## Multi-tenancy

- Every tenant-owned entity implements `ITenantOwned { Guid TenantId }`
- `AppDbContext` has a **global query filter**: `e => e.TenantId == _currentUser.TenantId && !e.IsDeleted`
- `ICurrentUser` is scoped — gets `TenantId` from JWT claim on every request
- **NEVER** trust `tenantId` from request body or query string
- **NEVER** call `IgnoreQueryFilters()` outside seeding/migration code

## Soft delete

- Every entity implements `ISoftDeletable { bool IsDeleted, DateTime? DeletedAt, Guid? DeletedByUserId }`
- `SaveChangesInterceptor` converts `Remove()` into a soft-delete update
- Global query filter excludes soft-deleted rows
- Hard delete only via dedicated admin endpoint with explicit confirmation

## Audit (for v1 — minimal)

- `SaveChangesInterceptor` writes `CreatedAt`, `UpdatedAt`, `CreatedByUserId`, `UpdatedByUserId`
- No separate audit log table in v1 (add in v2 if needed)

## IDs & primary keys

- All entities use `Guid` PKs
- Generated via `Guid.CreateVersion7()` in `BaseEntity` constructor
- UUID v7 is time-ordered → good index locality in PostgreSQL

## Money & dimensions

- Money: `decimal(18,2)` in TJS — never `double` or `float`
- Dimensions: stored as `int` in millimeters — convert to cm only at presentation layer

## Concurrency

- v1: optimistic concurrency via `xmin` token on `Measurement` and `Lead`
- v2: extend to other aggregates if needed

## Security

- **404 not 403** on tenant ownership denial — never reveal existence of cross-tenant data
- JWT: 15-min access token + 7-day refresh token, refresh stored hashed in DB
- Password hash: ASP.NET Core Identity default (PBKDF2)
- All endpoints `[Authorize]` by default; `[AllowAnonymous]` is explicit

## API

- Versioned via URL: `/api/v1/...`
- DTOs at boundary — never expose EF entities
- Errors: RFC 7807 `ProblemDetails` with `errorCode` extension
- Validation: FluentValidation → 400 with field-level errors

## Async

- Every public method on services/repos: `async Task` + `CancellationToken`
- No `.Result` or `.Wait()` anywhere
- EF queries: `await ... .ToListAsync(ct)`, `await ... .FirstOrDefaultAsync(ct)`

## Frontend — Feature-based

```
frontend/
  src/
    app/                  — router, providers, root layout
    features/
      auth/               — login, token refresh, protected routes
      leads/              — Kanban, list, detail, forms
      designer/           — drawing canvas, math, PDF download
      factory-orders/
      finances/
      analytics/
    shared/
      api/                — axios client, generated types, query keys
      ui/                 — shadcn components (button, input, dialog…)
      hooks/              — useToggle, useDebounce, etc.
      lib/                — utilities (formatters, math helpers)
    entities/             — global domain types (Lead, Measurement, …)
```

**Rules:**
- A feature is **self-contained**: page + components + hooks + lib + tests inside
- Cross-feature imports go through `shared/` or `entities/`, never feature-to-feature directly
- Designer math (`features/designer/lib/computePanels.ts`, etc.) is **pure functions** — testable without React
- TanStack Query for all server state — query keys live in `shared/api/queryKeys.ts`
- Forms: React Hook Form + Zod schema; schema co-located with the form

## Things we explicitly DON'T do

- No MediatR (overkill for this app)
- No DDD tactical patterns beyond what's needed (no Specifications, no Domain Events in v1)
- No Redux / Zustand (TanStack Query covers server state, `useState` covers UI state)
- No CSS-in-JS (Tailwind only)
- No GraphQL (REST + OpenAPI types is enough)
- No microservices (modular monolith)
