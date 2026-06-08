import { describe, expect, it } from 'vitest'
import { computeInitialPanels, computeMetrics } from './computePanels'

// ── Reference cases from docs/DesignerLogic.md ────────────────────────────────

describe('computeInitialPanels', () => {
  it('600 mm → equal split 320 / 320', () => {
    const panels = computeInitialPanels(600, 2000)
    expect(panels).toHaveLength(2)
    expect(panels[0]).toMatchObject({ widthMm: 320, isDoor: false, position: 0 })
    expect(panels[1]).toMatchObject({ widthMm: 320, isDoor: true,  position: 1 })
  })

  it('1560 mm → equal split 800 / 800', () => {
    const panels = computeInitialPanels(1560, 2000)
    expect(panels).toHaveLength(2)
    expect(panels[0]).toMatchObject({ widthMm: 800, isDoor: false, position: 0 })
    expect(panels[1]).toMatchObject({ widthMm: 800, isDoor: true,  position: 1 })
  })

  it('1660 mm → fixed 900, door 800', () => {
    const panels = computeInitialPanels(1660, 2000)
    expect(panels[0]).toMatchObject({ widthMm: 900, isDoor: false })
    expect(panels[1]).toMatchObject({ widthMm: 800, isDoor: true  })
  })

  it('2000 mm → fixed 1240, door 800', () => {
    const panels = computeInitialPanels(2000, 2000)
    expect(panels[0]).toMatchObject({ widthMm: 1240, isDoor: false })
    expect(panels[1]).toMatchObject({ widthMm: 800,  isDoor: true  })
  })

  it('panel widths always sum to measureMm + 40', () => {
    for (const measureMm of [600, 900, 1200, 1560, 1660, 2000, 2500, 3000]) {
      const panels = computeInitialPanels(measureMm, 2000)
      const sum = panels.reduce((acc, p) => acc + p.widthMm, 0)
      expect(sum).toBe(measureMm + 40)
    }
  })

  it('heightMm is forwarded to every panel', () => {
    const panels = computeInitialPanels(1560, 2100)
    expect(panels.every((p) => p.heightMm === 2100)).toBe(true)
  })

  it('always returns exactly 2 panels', () => {
    for (const measureMm of [600, 1560, 2000, 3000]) {
      expect(computeInitialPanels(measureMm, 2000)).toHaveLength(2)
    }
  })

  it('door is always at position 1 (rightmost)', () => {
    const panels = computeInitialPanels(2000, 2000)
    expect(panels[1].isDoor).toBe(true)
    expect(panels[1].position).toBe(1)
  })
})

describe('computeMetrics', () => {
  it('1560 mm, 2000 mm → area 3.20 m², fee 384 TJS', () => {
    const m = computeMetrics(1560, 2000)
    expect(m.totalWidthMm).toBe(1600)
    expect(m.areaSqM).toBe(3.2)
    expect(m.masterFeeTjs).toBe(384)
  })

  it('1660 mm, 2000 mm → area 3.40 m², fee 408 TJS', () => {
    const m = computeMetrics(1660, 2000)
    expect(m.totalWidthMm).toBe(1700)
    expect(m.areaSqM).toBe(3.4)
    expect(m.masterFeeTjs).toBe(408)
  })

  it('2000 mm, 2000 mm → area 4.08 m², fee 489.6 TJS', () => {
    const m = computeMetrics(2000, 2000)
    expect(m.totalWidthMm).toBe(2040)
    expect(m.areaSqM).toBe(4.08)
    expect(m.masterFeeTjs).toBe(489.6)
  })

  it('1800 mm, 2200 mm → area 4.05 m²', () => {
    const m = computeMetrics(1800, 2200)
    expect(m.areaSqM).toBe(4.05)
  })
})
