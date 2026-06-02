# Roles and Permissions

Three roles in v1. No granular permissions — role gates entire routes/endpoints.

## Role: Admin
- Full access to everything
- Manages users
- Sees all finances and analytics
- Can hard-delete records (with confirmation)

## Role: Operator
- Leads: create, view, update info, change status up to `Buying` (not beyond)
- Cannot create factory orders, manage payments, see profit/analytics
- Can view all leads in their tenant

## Role: Measurer
- Sees only leads `assignedMeasurerId = self` AND status in `Measurement`, `Buying`
- Can create/update Measurement for assigned leads
- Can create deposit `Payment` when finalizing a sale
- Cannot see other measurers' leads
- Cannot see analytics
- Cannot manage factory orders (admin does this from the office)

## Frontend route guards

| Route | Allowed roles |
|-------|---------------|
| `/login` | (anonymous) |
| `/leads` | Admin, Operator, Measurer (own only) |
| `/leads/:id` | Admin, Operator, Measurer (own only) |
| `/designer` | Admin, Measurer |
| `/factory-orders` | Admin |
| `/finances` | Admin |
| `/analytics` | Admin |
| `/users` | Admin |

## Backend enforcement

- `[Authorize(Roles = "Admin")]` on admin-only endpoints
- `[Authorize(Roles = "Admin,Operator")]` on shared endpoints
- For Measurer's "own only" rule: service-layer filter by `assignedMeasurerId == currentUser.Id`
- Cross-tenant → 404, not 403 (don't leak existence)
