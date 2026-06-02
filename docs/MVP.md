# MVP — Phased Plan

This is the high-level "why these phases in this order" document.
For granular step list, see `PROGRESS.md`.

## Phase 0 — Foundation
**Why first:** nothing works without auth, tenancy, and the basic infrastructure.
The end of this phase is invisible to the business user but everything else stands on it.

**Risks:** none significant. Pure tooling.

## Phase 1 — Designer
**Why second:** this is the highest-value, highest-risk feature.
Until the measurer can produce a PDF on a tablet at the apartment, the app
doesn't change anyone's life. We tackle the risky thing while energy is high.

**Risks:**
- SVG drag-and-drop on tablet/phone (mitigated by pointer events + early device test)
- PDF rendering at scale (mitigated by QuestPDF + checkpoint at Step 9)
- Formula correctness (mitigated by shared reference test cases BE + FE)

## Phase 2 — CRM Kanban
**Why third:** the business value of the Designer multiplies once leads are
tracked in the same place. Operator + measurer workflow lives here.

**Risks:**
- Status transitions complexity (mitigated by `StateMachines.md` + service tests)
- Kanban drag UX on mobile (mitigated by dnd-kit + early prototype)

## Phase 3 — Finances
**Why fourth:** profit visibility unlocks decisions but doesn't block daily work.
By now we have measurements + leads + payments — financial side falls into place.

**Risks:**
- Factory order ↔ lead linkage logic (mitigated by clear schema, see `Database.md`)
- Reworks accounting (mitigated by separate flag + reason field)

## Phase 4 — Analytics
**Why fifth:** decisions get better once 3+ months of data exist.
No point optimizing before we have real numbers.

**Risks:** mostly cosmetic. Aggregation queries need indexes (already planned).

## Phase 5 — Production Polish
**Why last:** deploy with confidence after the product is real.
PWA, SSL, backups, monitoring, error tracking.

## What's intentionally NOT in v1

| Feature | Why postponed |
|---------|---------------|
| Corner cabinets | Different math, low frequency, can be drawn manually for now |
| Multiple handle types | Default works, variants are cosmetic |
| SMS / Telegram | Operator calls manually today, automation is nice-to-have |
| E-signature | Paper signature works |
| Native mobile app | PWA covers tablet/phone use cases |
| Multi-currency | All business is in TJS |
| Hardware inventory | Purchased per order, no stock to track |
| Email integration | Phone + visit is the channel |

## Definition of Done (per phase)

A phase is "done" when:
1. All steps in `PROGRESS.md` are checked
2. Build green on both BE and FE
3. All tests pass
4. `git tag vX.Y-feature` created
5. `phase-summaries/PhaseX-summary.md` written
6. Demo to the actual user (measurer or owner) — they nod and say "useful"

The last item is the only one that matters for survival.
