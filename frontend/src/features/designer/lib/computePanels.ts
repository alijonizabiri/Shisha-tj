import type { Metrics, Panel } from './types'

const RAIL_GAP_MM = 40       // opening + 40 mm → total glass width
const MAX_DOOR_MM = 800      // sliding door constraint
const EQUAL_SPLIT_MAX = 1600 // below this total, split door and fixed equally

/**
 * Computes the initial glass panel layout for a shower cabin opening.
 * Layout: [fixed][door] — door is always rightmost, max 800 mm.
 * Mirrors BE PanelComputer.ComputeInitial exactly.
 */
export function computeInitialPanels(measureMm: number, heightMm: number): Panel[] {
  const total = measureMm + RAIL_GAP_MM

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
    { id: crypto.randomUUID(), widthMm: fixedMm, heightMm, isDoor: false, position: 0, shape: 'Flat' },
    { id: crypto.randomUUID(), widthMm: doorMm,  heightMm, isDoor: true,  position: 1, shape: 'Flat' },
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

/**
 * Computes total area from an explicit list of panels (used when custom panels
 * are present, e.g. L-shape or Curved sets).
 * Curved area is approximated as widthMm * heightMm (chord × height).
 */
export function computeMetricsFromPanels(panels: Panel[]): Metrics {
  const totalWidthMm = panels.reduce((sum, p) => sum + p.widthMm, 0)
  const areaSqM =
    Math.round(
      panels.reduce((sum, p) => sum + (p.widthMm / 1000) * (p.heightMm / 1000), 0) * 100,
    ) / 100
  const masterFeeTjs = Math.round(areaSqM * 120 * 100) / 100
  return { totalWidthMm, areaSqM, masterFeeTjs }
}
