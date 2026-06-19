export type HandleSide = 'Left' | 'Right'
export type HoleType = 'Roller' | 'Handle' | 'Mount' | 'Custom'
export type PanelShape = 'Flat' | 'LShapeLeft' | 'LShapeRight' | 'Curved'

export type LShapeConfig =
  | 'DoorOnA_NearWall'    // Дверь на стене A у бетонной стены
  | 'DoorOnA_NearCorner'  // Дверь на стене A у угла
  | 'DoorOnB_NearWall'    // Дверь на стене B у бетонной стены
  | 'DoorOnB_NearCorner'  // Дверь на стене B у угла
  | 'DoorsAtCorner'       // Две двери в углу

export type DoorMechanism = 'Hinge' | 'Roller'

export interface Panel {
  /** Client-side stable identifier — not sent to the backend */
  id: string
  widthMm: number
  heightMm: number
  isDoor: boolean
  /** 0-based index left → right */
  position: number
  shape: PanelShape
  setId?: string
  curvatureRadiusMm?: number
  /** Only set for isDoor=true panels */
  mechanism?: DoorMechanism
  /** Which edge the hinges are on — only relevant when mechanism === 'Hinge' */
  hingeSide?: HandleSide
}

export interface Hole {
  xMm: number
  yMm: number
  radiusMm: number
  holeType: HoleType
}

export interface Metrics {
  totalWidthMm: number
  /** Rounded to 2 decimal places */
  areaSqM: number
  masterFeeTjs: number
}
