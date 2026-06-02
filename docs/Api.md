# API — REST Conventions

Base URL: `/api/v1`
All endpoints require JWT except `/api/v1/auth/login` and `/api/v1/auth/refresh`.

## Conventions

- **Versioning** via URL: `/api/v1/...`
- **JSON only** (request & response)
- **camelCase** for JSON fields (configured via JsonSerializerOptions)
- **DateTimes**: ISO 8601 UTC (`2026-06-02T15:23:00Z`)
- **Money**: number in TJS, 2 decimal places
- **Dimensions**: integers in santimeters
- **IDs**: GUID strings
- **Pagination**: `?page=1&pageSize=20` → response wraps as `{ items, totalCount, page, pageSize }`
- **Sorting**: `?sortBy=createdAt&sortDir=desc`
- **Filtering**: query strings, e.g. `?status=New&assignedTo=<guid>`

## Errors (RFC 7807 ProblemDetails)

```json
{
  "type": "https://shisha-tj.app/errors/validation",
  "title": "Validation failed",
  "status": 400,
  "errorCode": "VALIDATION_FAILED",
  "errors": {
    "phone": ["Phone is required"],
    "measureMm": ["Must be between 600 and 3000"]
  },
  "traceId": "..."
}
```

| HTTP | When |
|------|------|
| 200 | OK with body |
| 201 | Created — `Location` header points to new resource |
| 204 | No content (deletes, status changes without body) |
| 400 | Validation failed |
| 401 | No / invalid JWT |
| 403 | Role not allowed (NOT used for tenant ownership — see 404) |
| 404 | Not found OR cross-tenant access denied |
| 409 | Conflict (status transition not allowed, concurrent edit) |
| 422 | Business rule violated (e.g. trying to refund more than paid) |
| 500 | Server error |

## Endpoint catalogue

### Auth
- `POST /api/v1/auth/login` — `{ email, password }` → `{ accessToken, refreshToken, user }`
- `POST /api/v1/auth/refresh` — `{ refreshToken }` → new pair
- `POST /api/v1/auth/logout` — revokes refresh token
- `GET /api/v1/auth/me` — current user info

### Users (Admin only)
- `GET /api/v1/users`
- `POST /api/v1/users`
- `PUT /api/v1/users/{id}`
- `DELETE /api/v1/users/{id}` — soft delete

### Leads
- `GET /api/v1/leads` — list, filters: `status`, `assignedTo`, `search` (phone/name), `from`, `to`
- `GET /api/v1/leads/kanban` — grouped by status, all in one call (for board view)
- `GET /api/v1/leads/{id}` — full detail with measurements + payments + finances
- `POST /api/v1/leads` — create new (operator)
- `PUT /api/v1/leads/{id}` — update info (NOT status)
- `PATCH /api/v1/leads/{id}/status` — `{ status, refusalReasonId?, refusalNote? }` → 204 or 409
- `POST /api/v1/leads/{id}/assign-measurer` — `{ userId }`
- `DELETE /api/v1/leads/{id}` — soft delete (Admin)

### Measurements
- `POST /api/v1/measurements` — create from designer
  - Body: `{ leadId, measureMm, heightMm, configuration, glassColor, hardwareColor, handleSide, holes: [...] }`
  - Response: `201` with full measurement (computed glasses + saved holes)
- `GET /api/v1/measurements/{id}` — full detail (for re-opening designer)
- `PUT /api/v1/measurements/{id}` — update dimensions and holes
- `GET /api/v1/measurements/{id}/pdf?format=a4` — returns `application/pdf` blob; `format` is `a4` or `a3`
- `POST /api/v1/measurements/calculate` — pure compute helper (no save):
  - Body: `{ measureMm, heightMm, configuration }`
  - Response: `{ totalWidth, panels: [{width, isDoor}], areaSqM, masterFee }`

### Factory orders
- `GET /api/v1/factory-orders` — list with filters
- `GET /api/v1/factory-orders/{id}` — detail with all items
- `POST /api/v1/factory-orders` — `{ glassIds: [...] }` create batch from selected glasses
- `PATCH /api/v1/factory-orders/{id}/send` — mark sent, set `orderedAt`
- `PATCH /api/v1/factory-orders/{id}/receive` — mark received, optionally fill `glassCost` per item
- `GET /api/v1/factory-orders/{id}/pdf` — PDF for the factory (list of glasses with sizes + holes)
- `POST /api/v1/factory-orders/{id}/items/{itemId}/rework` — `{ reason: 'FactoryError'|'MeasurerError', note }`

### Payments
- `POST /api/v1/payments` — `{ leadId, amountTjs, kind, paidAt, note }`
- `DELETE /api/v1/payments/{id}` — admin only

### Hardware
- `POST /api/v1/hardware` — `{ measurementId, color, costTjs, purchasedAt }`
- `PUT /api/v1/hardware/{id}` — update cost

### Expenses
- `POST /api/v1/expenses` — `{ leadId?, amountTjs, kind, description, spentAt }`
- `GET /api/v1/expenses` — list with filters

### Lookups
- `GET /api/v1/products`
- `GET /api/v1/refusal-reasons`
- (POST/PUT for Admin to manage)

### Analytics
- `GET /api/v1/analytics/dashboard?from=&to=` → KPIs
- `GET /api/v1/analytics/funnel?from=&to=` → counts per status
- `GET /api/v1/analytics/refusals?from=&to=` → top reasons
- `GET /api/v1/analytics/by-product?from=&to=`
- `GET /api/v1/analytics/by-color?from=&to=`
- `GET /api/v1/analytics/by-measurer?from=&to=`

### Health
- `GET /health` — no auth, returns 200 if DB reachable
