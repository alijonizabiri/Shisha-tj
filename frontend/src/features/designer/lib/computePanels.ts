import type { Configuration, Metrics, Panel } from './types'

const RAIL_GAP_MM = 40       // opening + 40 mm → total glass width
const MAX_DOOR_MM = 800      // sliding door constraint
const EQUAL_SPLIT_MAX = 1600 // below this total, split door and fixed equally

/**
 * Computes glass panels for a shower cabin opening.
 * Layout TwoGlass:   [fixed][door]
 * Layout ThreeGlass: [fixed][door][fixed]
 */
export function computePanels(
  measureMm: number,
  heightMm: number,
  configuration: Configuration,
): Panel[] {
  const total = measureMm + RAIL_GAP_MM

  if (configuration === 'TwoGlass') {
    let doorMm: number
    let fixedMm: number

    if (total <= EQUAL_SPLIT_MAX) {
      doorMm = Math.round(total / 2)
      fixedMm = total - doorMm // absorb any rounding remainder
    } else {
      doorMm = MAX_DOOR_MM
      fixedMm = total - MAX_DOOR_MM
    }

    return [
      { widthMm: fixedMm, heightMm, isDoor: false, position: 0 },
      { widthMm: doorMm, heightMm, isDoor: true, position: 1 },
    ]
  }

  // ThreeGlass
  const sideMm = Math.round((total - MAX_DOOR_MM) / 2)
  const otherSideMm = total - MAX_DOOR_MM - sideMm // right side absorbs rounding

  return [
    { widthMm: sideMm, heightMm, isDoor: false, position: 0 },
    { widthMm: MAX_DOOR_MM, heightMm, isDoor: true, position: 1 },
    { widthMm: otherSideMm, heightMm, isDoor: false, position: 2 },
  ]
}

/**
 * Computes area and master fee from the opening dimensions.
 * areaSqM is rounded to 2 decimal places (consistent with reference cases).
 */
export function computeMetrics(measureMm: number, heightMm: number): Metrics {
  const totalWidthMm = measureMm + RAIL_GAP_MM
  const areaSqM = Math.round((totalWidthMm / 1000) * (heightMm / 1000) * 100) / 100
  const masterFeeTjs = Math.round(areaSqM * 120 * 100) / 100

  return { totalWidthMm, areaSqM, masterFeeTjs }
}
