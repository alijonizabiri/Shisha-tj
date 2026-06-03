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

  it('holes are at top-left and top-right corners', () => {
    const holes = defaultHoles(FIXED_800, 2000)
    expect(holes[0]).toMatchObject({ xMm: 10, yMm: 10, radiusMm: 12 })
    expect(holes[1]).toMatchObject({ xMm: 790, yMm: 10, radiusMm: 12 }) // 800 - 10
  })

  it('right-edge x scales with panel width', () => {
    const holes = defaultHoles({ widthMm: 900, isDoor: false }, 2000)
    expect(holes[1].xMm).toBe(890) // 900 - 10
  })
})

describe('defaultHoles — door panel', () => {
  it('produces exactly 6 holes (4 roller + 2 handle)', () => {
    const holes = defaultHoles(DOOR_800, 2000)
    expect(holes).toHaveLength(6)
    expect(holes.filter((h) => h.holeType === 'Roller')).toHaveLength(4)
    expect(holes.filter((h) => h.holeType === 'Handle')).toHaveLength(2)
  })

  it('all roller holes are at y=10', () => {
    const rollers = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Roller')
    expect(rollers.every((h) => h.yMm === 10)).toBe(true)
  })

  it('roller pair gap is 30 mm', () => {
    const rollers = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Roller')
    // Left pair: x=10, x=40 → gap 30
    expect(rollers[1].xMm - rollers[0].xMm).toBe(30)
    // Right pair: x=760, x=790 → gap 30 (800 - 10 - 30 = 760, 800 - 10 = 790)
    expect(rollers[3].xMm - rollers[2].xMm).toBe(30)
  })

  it('handle holes are exactly 275 mm apart', () => {
    const handles = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Handle')
    expect(handles[1].yMm - handles[0].yMm).toBe(275)
  })

  it('handle X is at right edge by default (Right side)', () => {
    const handles = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Handle')
    expect(handles.every((h) => h.xMm === 790)).toBe(true) // 800 - 10
  })

  it('handle X is at left edge when handleSide is Left', () => {
    const handles = defaultHoles(DOOR_800, 2000, 'Left').filter((h) => h.holeType === 'Handle')
    expect(handles.every((h) => h.xMm === 10)).toBe(true)
  })

  it('handle center is shifted 5% down from mid-height (h=2000)', () => {
    // centerY = round(2000 * 0.55) = 1100
    // topY = round(1100 - 137.5) = 963
    const handles = defaultHoles(DOOR_800, 2000).filter((h) => h.holeType === 'Handle')
    expect(handles[0].yMm).toBe(963)
    expect(handles[1].yMm).toBe(1238)
  })
})
