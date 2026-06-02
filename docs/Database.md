# Database — PostgreSQL 16 + EF Core 8

All tables use snake_case (EF convention configured via `UseSnakeCaseNamingConvention`).
All FK columns are `uuid` (Guid v7). Money is `numeric(18,2)`. Dimensions are `int` (millimeters).

## Conventions

- PK: `id uuid` (v7)
- Tenant column: `tenant_id uuid not null` on every tenant-owned table
- Soft delete: `is_deleted bool default false`, `deleted_at timestamptz null`, `deleted_by_user_id uuid null`
- Audit: `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`, `created_by_user_id uuid null`, `updated_by_user_id uuid null`
- Concurrency: `xmin` system column on hot tables (configured as `IsRowVersion` in EF)

## Indexes (key ones)

- Every `tenant_id` column → index
- `leads.phone` → index (operator searches by phone constantly)
- `leads.status` → index (Kanban filtering)
- `leads.created_at desc` → for sorting in list
- `measurements.lead_id` → FK index
- `glasses.measurement_id` → FK index
- `holes.glass_id` → FK index
- `payments.lead_id` → FK index
- `factory_order_items.factory_order_id` → FK index
- `users.email` unique within tenant

## Tables

### tenants
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text not null | |
| created_at | timestamptz | |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| email | text not null | |
| password_hash | text not null | |
| full_name | text not null | |
| role | text not null | `Admin` \| `Operator` \| `Measurer` |
| is_active | bool default true | |
| (audit/soft-delete cols) | | |

Unique: `(tenant_id, email)` where not deleted.

### refresh_tokens
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| token_hash | text not null | |
| expires_at | timestamptz | |
| revoked_at | timestamptz null | |
Unique: `token_hash`.

### leads
The single source of truth for a person who interacted with us.
Moves through Kanban statuses; financial state attaches when status reaches `Buying`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| name | text not null | |
| phone | text not null | |
| address | text null | required from status `Measurement` onwards |
| product | text not null | from `Product` enum/lookup |
| status | text not null | enum: `New`, `Measurement`, `Thinking`, `Refused`, `Buying`, `OrderedAtFactory`, `GlassArrived`, `Installed`, `Closed` |
| source | text null | how they found us |
| note | text null | |
| refusal_reason_id | uuid null FK | only if status=Refused |
| refusal_note | text null | |
| call_date | date not null | |
| promised_install_date | date null | set when status=Buying |
| warranty_until | date null | set when status=Installed |
| assigned_measurer_id | uuid null FK → users | |
| deal_price_tjs | numeric(18,2) null | set when status=Buying |
| (tenant/audit/soft-delete) | | |
| xmin | xid concurrency | |

### measurements
A measurer's site visit → drawing.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| lead_id | uuid FK → leads | |
| measurer_id | uuid FK → users | |
| measure_mm | int not null | width of opening |
| height_mm | int not null | default 2000 |
| configuration | text not null | `TwoGlass` \| `ThreeGlass` (\| `Corner` v2) |
| glass_color | text not null | enum |
| hardware_color | text not null | enum |
| handle_side | text not null default 'Right' | `Left` \| `Right` |
| measured_at | timestamptz | |
| (audit/soft-delete) | | |
| xmin | concurrency | |

### glasses
Each measurement produces 2 or 3 glasses.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| measurement_id | uuid FK → measurements | cascade delete |
| position | int not null | 0=left, 1=middle/right, 2=right (ThreeGlass) |
| is_door | bool not null | |
| width_mm | int not null | |
| height_mm | int not null | |
| (audit) | | |

### holes
Drilling points on a glass. Defaults are computed but stored once saved (so manual edits persist).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| glass_id | uuid FK → glasses | cascade delete |
| x_mm | int not null | |
| y_mm | int not null | |
| radius_mm | int not null | |
| hole_type | text not null | `Roller` \| `Handle` \| `Mount` \| `Custom` |

### factory_orders
A batch sent to the glass factory.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| ordered_at | date null | |
| received_at | date null | |
| factory_total_tjs | numeric(18,2) null | what we paid the factory |
| status | text not null | `Draft` \| `Sent` \| `Received` \| `Closed` |
| note | text null | |
| (audit/soft-delete) | | |

### factory_order_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| factory_order_id | uuid FK → factory_orders | cascade |
| glass_id | uuid FK → glasses | |
| glass_cost_tjs | numeric(18,2) null | filled when factory invoice known |
| is_rework | bool default false | true if this is a re-do |
| rework_reason | text null | `FactoryError` \| `MeasurerError` |

Unique: `(factory_order_id, glass_id)` — a glass can be in only one order at a time
(unless marked rework — new row).

### hardware
One row per measurement (one set per cabin).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| measurement_id | uuid FK → measurements | unique |
| color | text not null | enum |
| cost_tjs | numeric(18,2) not null | what we paid for the set |
| purchased_at | date null | |

### payments
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| lead_id | uuid FK → leads | |
| amount_tjs | numeric(18,2) not null | positive = received, negative = refund |
| kind | text not null | `Deposit` \| `Balance` \| `Refund` |
| paid_at | date not null | |
| note | text null | |

### expenses
Other costs not tied to a specific lead (delivery is a special case — store per lead via separate field on lead, or here with `lead_id` set).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| lead_id | uuid null FK → leads | nullable for global expenses |
| amount_tjs | numeric(18,2) not null | |
| kind | text not null | `Delivery` \| `Rework` \| `Other` |
| description | text null | |
| spent_at | date not null | |

### refusal_reasons (lookup, seeded)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | seedable per tenant |
| label | text not null | e.g. "Дорого", "Передумал" |
| sort_order | int default 0 | |

### products (lookup, seeded)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| name | text not null | e.g. "Душевая кабина", "Перила" |
| is_active | bool default true | |

## Profit calculation (computed, not stored)
```
glassCost(lead)     = sum(factory_order_items.glass_cost_tjs where glass in lead.measurement.glasses, not rework)
reworkCost(lead)    = sum(factory_order_items.glass_cost_tjs where is_rework AND rework_reason='MeasurerError')
hardwareCost(lead)  = lead.measurement.hardware.cost_tjs
masterFee(lead)     = lead.measurement.area * 120
deliveryCost(lead)  = sum(expenses where lead_id = lead.id AND kind='Delivery')
otherCosts(lead)    = sum(expenses where lead_id = lead.id AND kind='Other')

cost   = glassCost + reworkCost + hardwareCost + masterFee + deliveryCost + otherCosts
profit = lead.deal_price_tjs - cost
```

Reworks caused by factory error don't count against profit (factory absorbs).

## Migration plan (each = one EF migration)

1. `InitialIdentity` — tenants, users, refresh_tokens
2. `AddLookups` — refusal_reasons, products + seed
3. `AddLeads`
4. `AddMeasurements` — measurements, glasses, holes
5. `AddFactoryOrders` — factory_orders, factory_order_items
6. `AddFinances` — hardware, payments, expenses
