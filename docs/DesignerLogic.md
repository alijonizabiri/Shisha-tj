# Designer Logic — Source of Truth for Drawing Math

All dimensions in **millimeters (int)** unless stated otherwise.
The formulas below live as pure functions in `frontend/src/features/designer/lib/`
and are mirrored in `backend/src/Shisha.Application/Designer/`.

## Input parameters

| Parameter | Source | Range | Notes |
|-----------|--------|-------|-------|
| `measureMm` | measurer | 600 – 3000 | width of the opening at the wall |
| `heightMm` | measurer | 1500 – 2500 | default 2000; cabin total height |
| `glassColor` | measurer | enum (5 values) | see below |
| `hardwareColor` | measurer | enum (5 values) | see below |

### Enums
- `GlassColor`: `Transparent`, `Matte`, `Iodine`, `Gray`, `EuroBronze`
- `HardwareColor`: `BlackMatte`, `Gold`, `Nickel`, `MatteGold`, `WetAsphalt`

## Panels (manual layout)

The glass layout is an explicit array of panels — no fixed configuration enum.
Each panel has `{ position, widthMm, heightMm, isDoor }`.

### Auto-computed initial layout (server + client mirror)

```
totalWidth = measureMm + 40   // always +40 mm gap to opening

if totalWidth <= 1600:
    panel[0] = { position=0, widthMm=totalWidth/2, heightMm=heightMm, isDoor=false }
    panel[1] = { position=1, widthMm=totalWidth/2, heightMm=heightMm, isDoor=true  }
else:
    panel[0] = { position=0, widthMm=totalWidth-800, heightMm=heightMm, isDoor=false }
    panel[1] = { position=1, widthMm=800,            heightMm=heightMm, isDoor=true  }
```

Layout left-to-right: `[fixed][door]`.  
When `totalWidth` is odd (half is not integer), `Math.round` / `MidpointRounding.AwayFromZero` is used; the fixed panel absorbs the remainder.

**Reference test cases (must match exactly — BE and FE):**
```
measureMm=600,  h=2000 → panels=[{320,fixed,h=2000}, {320,door,h=2000}], sum=640
measureMm=1560, h=2000 → panels=[{800,fixed,h=2000}, {800,door,h=2000}], sum=1600
measureMm=1660, h=2000 → panels=[{900,fixed,h=2000}, {800,door,h=2000}], sum=1700
measureMm=2000, h=2000 → panels=[{1240,fixed,h=2000},{800,door,h=2000}], sum=2040
sum invariant: panel widths always sum to measureMm + 40
```

### Constraints on individual panels

| Property | Door panel | Fixed panel |
|----------|-----------|-------------|
| `widthMm` | 500 – 800 | 200 – 3000 |
| `heightMm` | 200 – heightMm_cabin | 200 – heightMm_cabin |

- Exactly 0 or 1 door in the array (v1: always 1)
- All `widthMm` must sum to `measureMm + 40`

### Validation warnings (FE only, not blocking)

- Any fixed panel with `widthMm > 1500` → warn: "Глухая панель X мм — очень широкая"
- Any fixed panel with `widthMm < 200` → warn: "Глухая панель X мм — слишком узкая"

## Height

```
glassHeight = heightMm   // NO +40, height is exact
```

Default 2000. Range 1500 – 2500. Each panel stores its own `heightMm`.
A panel may have `heightMm < cabinaHeightMm` (e.g. short glass above a bathtub).
Panels are drawn bottom-aligned (floor-aligned) in the canvas.

## Hole positions (defaults)

All hole positions are **defaults** — the measurer can drag any hole, add new ones, or delete.

Standard hole radius: `12 mm` for roller mounts, `10 mm` for handle bolts.

### Fixed panel (2 holes — mount to rail)
| Hole | X | Y |
|------|---|---|
| Top-left | `10` from left edge | `10` from top |
| Top-right | `width - 10` from left edge | `10` from top |

### Door panel (4 roller holes + 2 handle holes)

**Roller holes (4):**
All at `Y = 10` from top.
2 pairs near left and right edges:
| Hole | X |
|------|---|
| Outer-left | `10` |
| Inner-left | `10 + ROLLER_PAIR_GAP` |
| Inner-right | `width - 10 - ROLLER_PAIR_GAP` |
| Outer-right | `width - 10` |

`ROLLER_PAIR_GAP = 30` mm (default; measurer can adjust).

**Handle holes (2):**
- X: `width - 10` from left edge (on the side opposite the wall)
  - If door is configured to open from the LEFT side, X = `10` instead
- Y: vertical center shifted down by 5% of height
  - `centerY = (height / 2) + (height * 0.05)`
- Top hole: `Y = centerY - 137.5` (half of 275)
- Bottom hole: `Y = centerY + 137.5`

**Spacing rule:** handle holes are always 275 mm apart vertically.

## Master fee calculation
```
areaSqM = (totalWidth / 1000) * (heightMm / 1000)
masterFee = areaSqM * 120          // 120 TJS per square meter
deliveryDushanbe = 100             // flat fee for Dushanbe city
```
Out-of-city delivery is entered manually (no formula).

## Backend / Frontend parity

The `ComputeInitial` / `computeInitialPanels` functions must produce **identical** results on both sides.
A shared snapshot test compares outputs for reference inputs to catch drift.
