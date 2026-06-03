export type Configuration = 'TwoGlass' | 'ThreeGlass'
export type HandleSide = 'Left' | 'Right'
export type HoleType = 'Roller' | 'Handle' | 'Mount' | 'Custom'

export interface Panel {
  widthMm: number
  heightMm: number
  isDoor: boolean
  /** 0-based index left → right */
  position: number
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
