# Designer Logic — Source of Truth for Drawing Math

All dimensions in **millimeters (int)** unless stated otherwise.
The formulas below live as pure functions in `frontend/src/features/designer/lib/`
and are mirrored in `backend/src/Shisha.Application/Designer/`.

## Input parameters

| Parameter | Source | Range | Notes |
|-----------|--------|-------|-------|
| `measureMm` | measurer | 600 – 3000 | width of the opening at the wall |
| `heightMm` | measurer | 1500 – 2500 | default 2000 |
| `configuration` | measurer | `TwoGlass` \| `ThreeGlass` | `Corner` is v2 |
| `glassColor` | measurer | enum (5 values) | see below |
| `hardwareColor` | measurer | enum (5 values) | see below |

### Enums
- `GlassColor`: `Transparent`, `Matte`, `Iodine`, `Gray`, `EuroBronze`
- `HardwareColor`: `BlackMatte`, `Gold`, `Nickel`, `MatteGold`, `WetAsphalt`

## Width formulas

### Total width of all glass panels combined
```
totalWidth = measureMm + 40   // always +40 mm gap to opening
```

### Configuration: TwoGlass (1 fixed + 1 door)
```
if totalWidth <= 1600:
    doorWidth   = totalWidth / 2
    fixedWidth  = totalWidth / 2
else:
    doorWidth   = 800              // max door size (sliding constraint)
    fixedWidth  = totalWidth - 800
```
Layout left-to-right: `[fixed][door]`.

**Examples:**
- 156 cm + 4 = 160 → 80 / 80
- 166 cm + 4 = 170 → 80 / 90 (door 80, fixed 90)
- 200 cm + 4 = 204 → 80 / 124 (door 80, fixed 124)

### Configuration: ThreeGlass (2 fixed + 1 door in middle)
Used when there's a sink/obstacle in front of one side and the door
must open in the middle.
```
doorWidth = 800
sideWidth = (totalWidth - 800) / 2     // each side glass
```
Layout: `[fixed][door][fixed]`. Measurer may override side widths manually.

## Height
```
glassHeight = heightMm   // NO +40, height is exact
```
Default 2000. Range checked against client opening (must be at least 20 mm less than ceiling).

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

## Glass count

| Configuration | Door | Fixed | Total |
|---------------|------|-------|-------|
| TwoGlass | 1 | 1 | 2 |
| ThreeGlass | 1 | 2 | 3 |

The factory orders are placed per glass — each glass has a unique code
**at the factory's side** (we don't generate codes in SHISHA_TJ).

## Validation rules

- `measureMm`: required, 600 ≤ value ≤ 3000
- `heightMm`: required, 1500 ≤ value ≤ 2500
- For `TwoGlass`: if computed `fixedWidth > 1500` → warn measurer (very large fixed)
- For `ThreeGlass`: if `sideWidth < 200` → warn (side too narrow)
- All holes must be at least 20 mm from any edge of their panel
- All holes within the panel bounds (0 ≤ x ≤ width, 0 ≤ y ≤ height)

## Backend / Frontend parity

The formulas above must produce **identical** results on both sides.
A shared snapshot test compares outputs for 50 reference inputs to catch drift.

**Reference test cases (must match exactly):**
```
(measureMm=1560, height=2000, mode=TwoGlass) → panels=[{800,fixed},{800,door}], area=3.20m²
(measureMm=1660, height=2000, mode=TwoGlass) → panels=[{900,fixed},{800,door}], area=3.40m²
(measureMm=2000, height=2000, mode=TwoGlass) → panels=[{1240,fixed},{800,door}], area=4.08m²
(measureMm=1800, height=2200, mode=ThreeGlass) → panels=[{520,fixed},{800,door},{520,fixed}], area=4.05m²
```
