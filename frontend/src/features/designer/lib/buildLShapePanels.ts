import type { Panel, LShapeConfig, DoorMechanism, HandleSide } from './types'

interface BuildLShapeInput {
  config: LShapeConfig
  wallAMm: number
  wallBMm: number
  heightMm: number
  doorWidthAMm: number
  doorWidthBMm?: number
  mechanism: DoorMechanism
  hingeSide: HandleSide
}

export function buildLShapePanels({
  config,
  wallAMm,
  wallBMm,
  heightMm,
  doorWidthAMm,
  doorWidthBMm,
  mechanism,
  hingeSide,
}: BuildLShapeInput): Panel[] {
  const setId = crypto.randomUUID()
  let pos = 0

  // For roller doors: NearWall slides toward corner → handle left (hingeSide 'Right').
  // NearCorner slides away from corner → handle right (hingeSide 'Left').
  // For hinge doors: always use the user-selected hingeSide.
  const extras = (nearWall: boolean) =>
    mechanism === 'Hinge'
      ? { mechanism, hingeSide }
      : { mechanism, hingeSide: (nearWall ? 'Right' : 'Left') as HandleSide }

  const makeA = (widthMm: number, isDoor: boolean, de = extras(false)): Panel => ({
    id: crypto.randomUUID(),
    widthMm,
    heightMm,
    isDoor,
    position: pos++,
    shape: 'LShapeLeft',
    setId,
    ...(isDoor ? de : {}),
  })

  const makeB = (widthMm: number, isDoor: boolean, de = extras(false)): Panel => ({
    id: crypto.randomUUID(),
    widthMm,
    heightMm,
    isDoor,
    position: pos++,
    shape: 'LShapeRight',
    setId,
    ...(isDoor ? de : {}),
  })

  switch (config) {
    case 'DoorOnA_NearWall': {
      // Door at left edge of wall A (near concrete wall), remainder toward corner
      const remainder = wallAMm - doorWidthAMm
      return [makeA(doorWidthAMm, true, extras(true)), makeA(remainder, false), makeB(wallBMm, false)]
    }
    case 'DoorOnA_NearCorner': {
      // Remainder at left (near concrete wall), door near corner
      const remainder = wallAMm - doorWidthAMm
      return [makeA(remainder, false), makeA(doorWidthAMm, true, extras(false)), makeB(wallBMm, false)]
    }
    case 'DoorOnB_NearWall': {
      // Wall A full, wall B: remainder near corner then door near concrete wall
      const remainder = wallBMm - doorWidthAMm
      return [makeA(wallAMm, false), makeB(remainder, false), makeB(doorWidthAMm, true, extras(true))]
    }
    case 'DoorOnB_NearCorner': {
      // Wall A full, wall B: door near corner then remainder near concrete wall
      const remainder = wallBMm - doorWidthAMm
      return [makeA(wallAMm, false), makeB(doorWidthAMm, true, extras(false)), makeB(remainder, false)]
    }
    case 'DoorsAtCorner': {
      const doorB = doorWidthBMm ?? doorWidthAMm
      // Door A (wall A, near corner): handle on right side toward seam → hingeSide='Left'
      // Door B (wall B, near corner): handle on left side toward seam → hingeSide='Right'
      // For roller: extras(false) slides away from corner for A; for B we need opposite.
      // For hinge: A uses user-selected hingeSide; B always mirrors it.
      const extrasB = mechanism === 'Hinge'
        ? { mechanism, hingeSide: (hingeSide === 'Left' ? 'Right' : 'Left') as HandleSide }
        : { mechanism, hingeSide: 'Right' as HandleSide }
      return [
        makeA(wallAMm - doorWidthAMm, false),           // remainder A near concrete wall
        makeA(doorWidthAMm, true, extras(false)),        // door A near corner — handle toward seam
        makeB(doorB, true, extrasB),                    // door B near corner — handle toward seam
        makeB(wallBMm - doorB, false),                  // remainder B near concrete wall
      ]
    }
  }
}
