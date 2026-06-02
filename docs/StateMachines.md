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
| Measurement | Thinking | — |
| Measurement | Buying | `dealPriceTjs`, deposit payment created |
| Measurement | Refused | `refusalReasonId` |
| Thinking | Buying | `dealPriceTjs`, deposit payment created |
| Thinking | Refused | `refusalReasonId` |
| Buying | OrderedAtFactory | lead's glasses must be in a non-Draft factory order |
| OrderedAtFactory | GlassArrived | factory order received |
| GlassArrived | Installed | `promisedInstallDate` ≤ today; balance payment created |
| Installed | Closed | warranty date set |
| Refused | New | (re-open scenario) |
| any | (same) | — (no-op, return 204) |

### Forbidden transitions
- Skipping more than one step (e.g. New → Buying directly) → 409 Conflict
- Forward from `Closed` → 409 (use re-open if needed)

### API enforcement
- `LeadStatusTransitionService.CanTransition(from, to)` → bool + reason
- `LeadStatusTransitionService.Transition(lead, to, args, ct)` → applies side effects:
  - On → Buying: validates `dealPriceTjs` not null, creates `Deposit` payment
  - On → Refused: validates `refusalReasonId`
  - On → OrderedAtFactory: validates glass-in-batch
  - On → Installed: creates `Balance` payment
  - On → Closed: sets `warrantyUntil = installedAt + 12 months` (configurable)

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
