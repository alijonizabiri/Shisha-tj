import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { computeInitialPanels } from '../lib/computePanels'
import { defaultHoles } from '../lib/defaultHoles'
import { DrawingCanvas } from './DrawingCanvas'

const CABIN_H = 2000
const panels = computeInitialPanels(1560, CABIN_H)
const holesByPanel = panels.map((p) => defaultHoles(p, p.heightMm))

// Helper: count only the glass panel rects (not drag handles or other rects)
function glassRects(container: HTMLElement) {
  return container.querySelectorAll('[data-testid="glass-rect"]')
}

describe('DrawingCanvas', () => {
  it('renders an SVG element', () => {
    const { container } = render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
      />,
    )
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders one glass rect per panel', () => {
    const { container } = render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
      />,
    )
    expect(glassRects(container).length).toBe(panels.length)
  })

  it('renders all holes as circles', () => {
    const { container } = render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
      />,
    )
    const circles = container.querySelectorAll('circle')
    const totalHoles = holesByPanel.reduce((sum, holes) => sum + holes.length, 0)
    expect(circles.length).toBe(totalHoles)
  })

  it('viewBox includes PAD on all sides at zoom 1', () => {
    const { container } = render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
      />,
    )
    const svg = container.querySelector('svg')!
    const vb = svg.getAttribute('viewBox')!
    const [x, y, w, h] = vb.split(' ').map(Number)
    expect(x).toBe(-60)
    expect(y).toBe(-60)
    expect(w).toBe(1600 + 120) // totalWidth(1600) + 2*PAD(60)
    expect(h).toBe(CABIN_H + 120)
  })

  it('returns null for empty panels', () => {
    const { container } = render(
      <DrawingCanvas
        panels={[]}
        holesByPanel={[]}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
      />,
    )
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders N glass rects for N panels', () => {
    const threePanels = [
      { id: 'p1', widthMm: 500, heightMm: 2000, isDoor: false, position: 0 },
      { id: 'p2', widthMm: 700, heightMm: 2000, isDoor: false, position: 1 },
      { id: 'p3', widthMm: 800, heightMm: 2000, isDoor: true,  position: 2 },
    ]
    const h3 = threePanels.map((p) => defaultHoles(p, p.heightMm))
    const { container } = render(
      <DrawingCanvas
        panels={threePanels}
        holesByPanel={h3}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
      />,
    )
    expect(glassRects(container).length).toBe(3)
  })

  it('renders boundary drag handles between panels', () => {
    const { container } = render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
      />,
    )
    // For N panels there are N-1 boundary handles (dashed lines with stroke-dasharray="6 3")
    const dashed = Array.from(container.querySelectorAll('line')).filter(
      (el) => el.getAttribute('stroke-dasharray') === '6 3',
    )
    expect(dashed.length).toBe(panels.length - 1)
  })

  it('calls onSelectPanel with panel id when glass rect is clicked', () => {
    const onSelectPanel = vi.fn()
    const { container } = render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
        onSelectPanel={onSelectPanel}
      />,
    )
    const rects = glassRects(container)
    fireEvent.click(rects[0])
    expect(onSelectPanel).toHaveBeenCalledWith(panels[0].id)
  })

  it('calls onSelectPanel(null) when SVG background is clicked', () => {
    const onSelectPanel = vi.fn()
    const { container } = render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        zoom={1}
        onZoomChange={vi.fn()}
        onSelectPanel={onSelectPanel}
      />,
    )
    const svg = container.querySelector('svg')!
    fireEvent.click(svg)
    expect(onSelectPanel).toHaveBeenCalledWith(null)
  })
})
