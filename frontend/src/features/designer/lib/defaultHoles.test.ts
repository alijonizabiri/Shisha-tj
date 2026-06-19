import { describe, expect, it } from 'vitest'
import { defaultHoles } from './defaultHoles'

const FIXED_800 = { widthMm: 800, isDoor: false }
const DOOR_800 = { widthMm: 800, isDoor: true }

describe('defaultHoles — fixed panel', () => {
  it('produces exactly 2 mount holes', () => {
    const holes = defaultHoles(FIXED_800, 2000)
    expect(holes).toHaveLength(2)
    expect(holes.every((h) => h.holeType === 'Mount')).toBe(true)
  })

  it('holes are at y=150, symmetric at x=150 and x=widthMm-150', () => {
    const holes = defaultHoles(FIXED_800, 2000)
    expect(holes[0]).toMatchObject({ xMm: 150, yMm: 150, radiusMm: 27 })
    expect(holes[1]).toMatchObject({ xMm: 650, yMm: 150, radiusMm: 27 }) // 800 - 150
  })

  it('right-edge x scales with panel width', () => {
    const holes = defaultHoles({ widthMm: 900, isDoor: false }, 2000)
    expect(holes[1].xMm).toBe(750) // 900 - 150
  })
})

describe('defaultHoles — door panel', () => {
  it('produces exactly 6 holes (4 clamp + 2 handle)', () => {
    const holes = defaultHoles(DOOR_800, 2000)
    expect(holes).toHaveLength(6)
    expect(holes.filter((h) => h.holeType === 'Mount')).toHaveLength(4)
    expect(holes.filter((h) => h.holeType === 'Handle')).toHaveLength(2)
  })

  it('row 1 clamps are at y=150', () => {
    const clamps = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Mount')
    const row1 = clamps.filter((h) => h.yMm === 150)
    expect(row1).toHaveLength(2)
  })

  it('row 2 clamps are at y=320', () => {
    const clamps = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Mount')
    const row2 = clamps.filter((h) => h.yMm === 320)
    expect(row2).toHaveLength(2)
  })

  it('clamp x positions are symmetric: 150mm and widthMm-150mm', () => {
    const clamps = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Mount')
    for (const row of [150, 320]) {
      const pair = clamps.filter((h) => h.yMm === row)
      expect(pair[0].xMm).toBe(150)
      expect(pair[1].xMm).toBe(650) // 800 - 150
    }
  })

  it('clamp x positions scale with panel width', () => {
    const clamps = defaultHoles({ widthMm: 1000, isDoor: true }, 2000).filter(
      (h) => h.holeType === 'Mount',
    )
    expect(clamps.every((h) => h.xMm === 150 || h.xMm === 850)).toBe(true) // 1000 - 150
  })

  it('handle holes are at 40% and 60% from top, gap = 20% of height', () => {
    const handles = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Handle')
    expect(handles[0].yMm).toBe(800)  // round(2000 * 0.40)
    expect(handles[1].yMm).toBe(1200) // round(2000 * 0.60)
    expect(handles[1].yMm - handles[0].yMm).toBe(400) // gap = 20% of 2000
  })

  it('handle X is at right edge by default (hingeSide Left = hinges on left)', () => {
    const handles = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Handle')
    expect(handles.every((h) => h.xMm === 730)).toBe(true) // 800 - 70
  })

  it('handle X is at left edge when hingeSide is Right (hinges on right)', () => {
    const handles = defaultHoles(DOOR_800, 2000, 'Right').filter((h) => h.holeType === 'Handle')
    expect(handles.every((h) => h.xMm === 70)).toBe(true)
  })
})
