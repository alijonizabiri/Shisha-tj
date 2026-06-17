# State Machines

**Updated (Phase 3.5 Step 14, migration `MoveStatusToMeasurement`):** the Kanban
state machine and all fields below (`status`, `assignedMeasurerId`,
`refusalReasonId`, `refusalNote`) live on **`Measurement`**, not `Lead`.
`Lead` is now only a contact container (name/phone/product) and has no status
of its own — a single Lead can have several Measurements, each progressing
through the Kanban independently. Enforcement code:
`MeasurementStatusTransitionService` (`Shisha.Application/Measurements/`) and
`MeasurementService.PatchStatusAsync` (`Shisha.Infrastructure/Services/`).
References to "Lead status" below mean "Measurement status".

## Measurement status transitions

```
                    ┌─────────────────────────┐
                    ▼                         │
   New ──→ Measurement ──→ Thinking ──→ Refused (terminal)
                    │           │
                    │           ▼
                    └──────→ Buying ──→ OrderedAtFactory ──→ GlassArrived ──→ Installed ──→ Closed (terminal)
```

### Allowed transitions

Enforced by `MeasurementStatusTransitionService.AllowedTransitions` (a
`(from, to)` hash set) — `CanTransition` returns `from == to` (no-op) or
membership in that set. Per-transition data requirements are applied
separately in `ApplyTransition`:

| From | To | Required data |
|------|-----|---------------|
| New | Measurement | (no extra check in `ApplyTransition`; `assignedMeasurerId`/`address` are set via `CreateAsync`/`AssignMeasurerAsync`, not the status transition itself) |
| New | Refused | `refusalReasonId` |
| Measurement | Thinking | measurement has ≥ 1 glass panel (`GLASSES_REQUIRED`) |
| Measurement | Buying | `dealPriceTjs` > 0 + deposit payments ≥ 100 TJS on **this measurement** |
| Measurement | Refused | `refusalReasonId` |
| Thinking | Buying | `dealPriceTjs` > 0 + deposit payments ≥ 100 TJS on this measurement |
| Thinking | Refused | `refusalReasonId` |
| Buying | OrderedAtFactory | deposit payments ≥ 100 TJS on this measurement (explicit defense-in-depth re-check, in addition to the gate already passed at Measurement/Thinking→Buying) — see "Factory order auto-creation" below |
| OrderedAtFactory | GlassArrived | none enforced in code today (no `case` in `ApplyTransition`); relies on the operator using `factory-orders/{id}/receive` first as a process convention, not a hard gate |
| GlassArrived | Installed | total payments ≥ `dealPriceTjs`, and `installationDate` (if set) must not be in the future |
| Installed | Closed | none enforced in `ApplyTransition`; `warrantyUntil` is set automatically (+12 months) by `MeasurementService.PatchStatusAsync` when `target == Closed` |
| Refused | New | re-open: clears `refusalReasonId`/`refusalNote` |
| any | (same) | — (no-op, returns without side effects) |

**Constant:** `LeadBusinessRules.MinDepositTjs = 100m` — single source of truth for deposit minimum (despite the name, it is checked against the Measurement's own deposit payments, not a Lead-level total).

### Factory order auto-creation (Buying → OrderedAtFactory)

Unlike a typical gate that *requires* a pre-existing Sent factory order, this
transition is generative: `MeasurementService.PatchStatusAsync` calls
`AutoCreateFactoryOrderAsync` whenever `target == LeadStatus.OrderedAtFactory`.
That method:
1. Collects all `Glass` rows belonging to the measurement.
2. Excludes glasses already in an active (non-`Closed`) `FactoryOrderItem`.
3. Creates a **new `FactoryOrder` in `Draft` status** containing the remaining
   glasses as items — even if zero glasses remain, so the measurement still
   shows up on the Factory Orders board.

So the system creates the factory order as a side effect of the status
transition, rather than the transition requiring one to already exist and be
`Sent`. (A separate, manual `POST /api/v1/factory-orders` endpoint also lets
operators batch arbitrary glasses into orders directly.)

### Error codes returned on 400

| Code | Field | Condition |
|------|-------|-----------|
| `GLASSES_REQUIRED` | `glasses` | Measurement has 0 glass panels when moving to Thinking |
| `DEAL_PRICE_REQUIRED` | `dealPrice` | `dealPriceTjs` is null or ≤ 0 when moving to Buying |
| `DEPOSIT_BELOW_MINIMUM` | `deposit` | Sum of Deposit payments < 100 TJS when moving to Buying (or OrderedAtFactory, see defense-in-depth gate above) |
| `BALANCE_NOT_PAID` | `balance` | Total payments < `dealPriceTjs` when moving to Installed |

### Forbidden transitions
- Skipping more than one step (e.g. New → Buying directly) → 409 Conflict
- Forward from `Closed` → 409 (use re-open if needed)

### API enforcement
- `MeasurementStatusTransitionService.CanTransition(from, to)` → bool
- `MeasurementService.PatchStatusAsync` pre-fetches `GlassCount`, `DepositSumTjs`, `TotalPaidTjs` from DB and passes them via `MeasurementTransitionArgs` before calling `TransitionAsync`
- `MeasurementStatusTransitionService.TransitionAsync` validates args and mutates `measurement`; payments are created separately via `POST /api/v1/payments`
- On → Closed: sets `warrantyUntil = today + 12 months`
- On → OrderedAtFactory: triggers `AutoCreateFactoryOrderAsync` (see above)

---

## Factory order status

```
Draft ──→ Sent ──→ Received ──→ Closed
```

| From | To | Trigger |
|------|-----|---------|
| Draft | Sent | manual: order placed at factory; sets `orderedAt = today` |
| Sent | Received | manual: glasses arrived; can fill `glassCost` per item |
| Received | Closed | auto: when a `Measurement` transitions to `Installed`, `MeasurementService.PatchStatusAsync` checks every `Received` `FactoryOrder` containing one of that measurement's glasses — if **all** measurements behind that order's items are now `Installed`, the order is closed |

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
