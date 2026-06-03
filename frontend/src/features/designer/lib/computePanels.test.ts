import { describe, expect, it } from 'vitest'
import { computeMetrics, computePanels } from './computePanels'

// ── Reference cases from DesignerLogic.md ────────────────────────────────────

describe('computePanels — TwoGlass', () => {
  it('1560 mm → equal split 800 / 800', () => {
    const panels = computePanels(1560, 2000, 'TwoGlass')
    expect(panels).toHaveLength(2)
    expect(panels[0]).toMatchObject({ widthMm: 800, isDoor: false, position: 0 })
    expect(panels[1]).toMatchObject({ widthMm: 800, isDoor: true, position: 1 })
  })

  it('1660 mm → fixed 900, door 800', () => {
    const panels = computePanels(1660, 2000, 'TwoGlass')
    expect(panels[0]).toMatchObject({ widthMm: 900, isDoor: false })
    expect(panels[1]).toMatchObject({ widthMm: 800, isDoor: true })
  })

  it('2000 mm → fixed 1240, door 800', () => {
    const panels = computePanels(2000, 2000, 'TwoGlass')
    expect(panels[0]).toMatchObject({ widthMm: 1240, isDoor: false })
    expect(panels[1]).toMatchObject({ widthMm: 800, isDoor: true })
  })

  it('panel widths always sum to measureMm + 40', () => {
    for (const measureMm of [600, 900, 1200, 1560, 1660, 2000, 2500, 3000]) {
      const panels = computePanels(measureMm, 2000, 'TwoGlass')
      const sum = panels.reduce((acc, p) => acc + p.widthMm, 0)
      expect(sum).toBe(measureMm + 40)
    }
  })

  it('heightMm is forwarded to every panel', () => {
    const panels = computePanels(1560, 2100, 'TwoGlass')
    expect(panels.every((p) => p.heightMm === 2100)).toBe(true)
  })
})

describe('computePanels — ThreeGlass', () => {
  it('1800 mm → side 520, door 800, side 520', () => {
    const panels = computePanels(1800, 2200, 'ThreeGlass')
    expect(panels).toHaveLength(3)
    expect(panels[0]).toMatchObject({ widthMm: 520, isDoor: false, position: 0 })
    expect(panels[1]).toMatchObject({ widthMm: 800, isDoor: true, position: 1 })
    expect(panels[2]).toMatchObject({ widthMm: 520, isDoor: false, position: 2 })
  })

  it('door is always 800 mm regardless of total width', () => {
    for (const measureMm of [1200, 1800, 2400, 3000]) {
      const panels = computePanels(measureMm, 2000, 'ThreeGlass')
      const door = panels.find((p) => p.isDoor)
      expect(door?.widthMm).toBe(800)
    }
  })

  it('panel widths always sum to measureMm + 40', () => {
    for (const measureMm of [1200, 1800, 2400, 3000]) {
      const panels = computePanels(measureMm, 2000, 'ThreeGlass')
      const sum = panels.reduce((acc, p) => acc + p.widthMm, 0)
      expect(sum).toBe(measureMm + 40)
    }
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

  it('1800 mm, 2200 mm → area 4.05 m² (ThreeGlass reference)', () => {
    const m = computeMetrics(1800, 2200)
    expect(m.areaSqM).toBe(4.05)
  })
})
