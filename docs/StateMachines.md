# State Machines

## Lead status transitions

```
                    ┌─────────────────────────┐
                    ▼                         │
   New ──→ Measurement ──→ Thinking ──→ Refused (terminal)
                    │           │
                    │           ▼
                    └──────→ Buying ──→ OrderedAtFactory ──→ GlassArrived ──→ Installed ──→ Closed (terminal)
```

### Allowed transitions

| From | To | Required data |
|------|-----|---------------|
| New | Measurement | `assignedMeasurerId`, `address` |
| New | Refused | `refusalReasonId` |
| Measurement | Thinking | lead has ≥ 1 saved Measurement |
| Measurement | Buying | lead has ≥ 1 Measurement + `dealPriceTjs` > 0 + deposit payments ≥ 100 TJS |
| Measurement | Refused | `refusalReasonId` |
| Thinking | Buying | lead has ≥ 1 Measurement + `dealPriceTjs` > 0 + deposit payments ≥ 100 TJS |
| Thinking | Refused | `refusalReasonId` |
| Buying | OrderedAtFactory | lead's glasses in a factory order with status ≥ Sent |
| OrderedAtFactory | GlassArrived | factory order status = Received |
| GlassArrived | Installed | total payments ≥ `dealPriceTjs` |
| Installed | Closed | `warrantyUntil` set (auto: +12 months) |
| Refused | New | re-open: clears refusal data |
| any | (same) | — (no-op, return 204) |

**Constant:** `LeadBusinessRules.MinDepositTjs = 100m` — single source of truth for deposit minimum.

### Error codes returned on 400

| Code | Field | Condition |
|------|-------|-----------|
| `MEASUREMENT_REQUIRED` | `measurement` | No measurements linked when moving to Thinking or Buying |
| `DEAL_PRICE_REQUIRED` | `dealPriceTjs` | `dealPriceTjs` is null or ≤ 0 when moving to Buying |
| `DEPOSIT_BELOW_MINIMUM` | `deposit` | Sum of Deposit payments < 100 TJS when moving to Buying |
| `BALANCE_NOT_PAID` | `balance` | Total payments < `dealPriceTjs` when moving to Installed |

### Forbidden transitions
- Skipping more than one step (e.g. New → Buying directly) → 409 Conflict
- Forward from `Closed` → 409 (use re-open if needed)

### API enforcement
- `LeadStatusTransitionService.CanTransition(from, to)` → bool
- `LeadService.PatchStatusAsync` pre-fetches `MeasurementCount`, `TotalDepositTjs`, `TotalPaidTjs` from DB and passes them via `LeadTransitionArgs` before calling `TransitionAsync`
- `LeadStatusTransitionService.TransitionAsync` validates args and mutates `lead`; no side effects (payments created separately via `POST /api/v1/payments`)
- On → Closed: sets `warrantyUntil = today + 12 months`

---

## Factory order status

```
Draft ──→ Sent ──→ Received ──→ Closed
```

| From | To | Trigger |
|------|-----|---------|
| Draft | Sent | manual: order placed at factory; sets `orderedAt = today` |
| Sent | Received | manual: glasses arrived; can fill `glassCost` per item |
| Received | Closed | all items installed (auto when last lead → Installed) |

Items in a `Sent` or later order cannot be removed. A new `Draft` order can be created
for reworks instead.

---

## Reworks

A rework is a **new** factory_order_item pointing to the same `glass_id`, with `isRework=true`.
The original item stays for history.

- `reason = FactoryError` → cost paid by factory (we don't pay again)
- `reason = MeasurerError` → cost paid by us (counts against lead profit)

The factory order containing the rework follows normal Sent/Received flow.

---

## Concurrency

`Lead` and `Measurement` use `xmin` for optimistic concurrency. On 409:
- Frontend re-fetches, shows toast "Изменено другим пользователем", user retries
