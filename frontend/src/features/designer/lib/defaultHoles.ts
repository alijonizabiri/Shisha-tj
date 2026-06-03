import type { HandleSide, Hole } from './types'

const MOUNT_RADIUS = 12
const HANDLE_RADIUS = 10
const EDGE_OFFSET = 10      // all holes: 10 mm from the panel edge
const ROLLER_GAP = 30       // distance between paired roller holes
const HANDLE_HALF_SPAN = 137.5  // half of 275 mm handle hole spacing

/**
 * Returns default hole positions for a single glass panel.
 * All coordinates are from the panel's top-left corner.
 *
 * Fixed panel → 2 mount holes (top corners).
 * Door panel  → 4 roller holes (top edge) + 2 handle holes (side).
 */
export function defaultHoles(
  panel: { widthMm: number; isDoor: boolean },
  heightMm: number,
  handleSide: HandleSide = 'Right',
): Hole[] {
  if (!panel.isDoor) {
    return fixedHoles(panel.widthMm)
  }
  return doorHoles(panel.widthMm, heightMm, handleSide)
}

function fixedHoles(widthMm: number): Hole[] {
  return [
    { xMm: EDGE_OFFSET, yMm: EDGE_OFFSET, radiusMm: MOUNT_RADIUS, holeType: 'Mount' },
    { xMm: widthMm - EDGE_OFFSET, yMm: EDGE_OFFSET, radiusMm: MOUNT_RADIUS, holeType: 'Mount' },
  ]
}

function doorHoles(widthMm: number, heightMm: number, handleSide: HandleSide): Hole[] {
  // Roller holes — 2 pairs at top, near left and right edges
  const rollers: Hole[] = [
    { xMm: EDGE_OFFSET, yMm: EDGE_OFFSET, radiusMm: MOUNT_RADIUS, holeType: 'Roller' },
    { xMm: EDGE_OFFSET + ROLLER_GAP, yMm: EDGE_OFFSET, radiusMm: MOUNT_RADIUS, holeType: 'Roller' },
    { xMm: widthMm - EDGE_OFFSET - ROLLER_GAP, yMm: EDGE_OFFSET, radiusMm: MOUNT_RADIUS, holeType: 'Roller' },
    { xMm: widthMm - EDGE_OFFSET, yMm: EDGE_OFFSET, radiusMm: MOUNT_RADIUS, holeType: 'Roller' },
  ]

  // Handle holes — vertical center shifted down by 5% of height, 275 mm apart
  const centerY = Math.round(heightMm * 0.55) // h/2 + h*0.05 = h * 0.55
  const topY = Math.round(centerY - HANDLE_HALF_SPAN)
  const bottomY = topY + 275 // exact 275 mm gap
  const handleX = handleSide === 'Left' ? EDGE_OFFSET : widthMm - EDGE_OFFSET

  const handles: Hole[] = [
    { xMm: handleX, yMm: topY, radiusMm: HANDLE_RADIUS, holeType: 'Handle' },
    { xMm: handleX, yMm: bottomY, radiusMm: HANDLE_RADIUS, holeType: 'Handle' },
  ]

  return [...rollers, ...handles]
}
