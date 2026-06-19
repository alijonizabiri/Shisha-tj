import type { HandleSide, Hole, PanelShape } from './types'

const MOUNT_RADIUS = 27

const CLAMP_X_OFFSET = 150 // symmetric inset from each side edge
const CLAMP_Y1 = 150        // row 1: same for both fixed and door panels
const CLAMP_Y2 = 320        // row 2: door panel only

const HANDLE_OFFSET = 70    // mm from the handle-side edge

/**
 * Returns default hole positions for a single glass panel.
 * All coordinates are from the panel's top-left corner.
 *
 * Fixed panel → 2 clamp holes (y=150, symmetric).
 * Door panel  → 4 clamp holes (2 rows, y=150 and y=320) + 2 handle holes (side).
 * LShape and Curved use the same rules as Flat (holes on the rectangular projection).
 *
 * hingeSide: the edge where the hinges are. Handle goes on the opposite edge.
 */
export function defaultHoles(
  panel: { widthMm: number; isDoor: boolean; shape?: PanelShape },
  heightMm: number,
  hingeSide: HandleSide = 'Left',
): Hole[] {
  if (!panel.isDoor) {
    return fixedHoles(panel.widthMm)
  }
  return doorHoles(panel.widthMm, heightMm, hingeSide)
}

function fixedHoles(widthMm: number): Hole[] {
  return [
    { xMm: CLAMP_X_OFFSET, yMm: CLAMP_Y1, radiusMm: MOUNT_RADIUS, holeType: 'Mount' },
    { xMm: widthMm - CLAMP_X_OFFSET, yMm: CLAMP_Y1, radiusMm: MOUNT_RADIUS, holeType: 'Mount' },
  ]
}

function doorHoles(widthMm: number, heightMm: number, hingeSide: HandleSide): Hole[] {
  const clamps: Hole[] = [
    { xMm: CLAMP_X_OFFSET,             yMm: CLAMP_Y1, radiusMm: MOUNT_RADIUS, holeType: 'Mount' },
    { xMm: widthMm - CLAMP_X_OFFSET,   yMm: CLAMP_Y1, radiusMm: MOUNT_RADIUS, holeType: 'Mount' },
    { xMm: CLAMP_X_OFFSET,             yMm: CLAMP_Y2, radiusMm: MOUNT_RADIUS, holeType: 'Mount' },
    { xMm: widthMm - CLAMP_X_OFFSET,   yMm: CLAMP_Y2, radiusMm: MOUNT_RADIUS, holeType: 'Mount' },
  ]

  // Hinges on Right → handle on left edge; Hinges on Left → handle on right edge
  const handleX = hingeSide === 'Right' ? HANDLE_OFFSET : widthMm - HANDLE_OFFSET
  const handles: Hole[] = [
    { xMm: handleX, yMm: Math.round(heightMm * 0.40), radiusMm: MOUNT_RADIUS, holeType: 'Handle' },
    { xMm: handleX, yMm: Math.round(heightMm * 0.60), radiusMm: MOUNT_RADIUS, holeType: 'Handle' },
  ]

  return [...clamps, ...handles]
}
