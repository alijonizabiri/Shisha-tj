import type { GlassResponse } from '../api'
import type { LShapeConfig, DoorMechanism, HandleSide } from './types'

export interface LShapeInitValues {
  wallAMm: number
  wallBMm: number
  heightMm: number
  config: LShapeConfig
  mechanism: DoorMechanism
  doorWidthAMm: number
  doorWidthBMm?: number
  doorHinge: HandleSide
}

export interface RestoredCabinState {
  cabinType: 'flat' | 'lshape' | 'curved'
  lshape?: LShapeInitValues
}

export function glassesToFormValues(glasses: GlassResponse[]): RestoredCabinState | null {
  if (!glasses.length) return null

  const hasLShape = glasses.some((g) => g.shape === 'LShapeLeft' || g.shape === 'LShapeRight')
  const hasCurved = glasses.some((g) => g.shape === 'Curved')

  if (hasLShape) {
    const wallA = glasses.filter((g) => g.shape === 'LShapeLeft')
    const wallB = glasses.filter((g) => g.shape === 'LShapeRight')
    const doorA = wallA.find((g) => g.isDoor)
    const doorB = wallB.find((g) => g.isDoor)

    let config: LShapeConfig = 'DoorOnA_NearWall'
    if (doorA && doorB) {
      config = 'DoorsAtCorner'
    } else if (doorA) {
      config = wallA.findIndex((g) => g.isDoor) === 0 ? 'DoorOnA_NearWall' : 'DoorOnA_NearCorner'
    } else if (doorB) {
      config = wallB.findIndex((g) => g.isDoor) === 0 ? 'DoorOnB_NearCorner' : 'DoorOnB_NearWall'
    }

    const anyDoor = doorA ?? doorB
    return {
      cabinType: 'lshape',
      lshape: {
        wallAMm: wallA.reduce((s, g) => s + g.widthMm, 0),
        wallBMm: wallB.reduce((s, g) => s + g.widthMm, 0),
        heightMm: glasses[0].heightMm,
        config,
        mechanism: (anyDoor?.mechanism as DoorMechanism | null | undefined) ?? 'Hinge',
        doorWidthAMm: doorA?.widthMm ?? doorB?.widthMm ?? 700,
        doorWidthBMm: doorA && doorB ? doorB.widthMm : undefined,
        doorHinge: (anyDoor?.hingeSide as HandleSide | null | undefined) ?? 'Left',
      },
    }
  }

  if (hasCurved) {
    return { cabinType: 'curved' }
  }

  return { cabinType: 'flat' }
}
