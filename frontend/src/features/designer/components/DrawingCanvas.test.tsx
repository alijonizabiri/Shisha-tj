import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { computeInitialPanels } from '../lib/computePanels'
import { defaultHoles } from '../lib/defaultHoles'
import { DrawingCanvas } from './DrawingCanvas'

const CABIN_H = 2000
const panels = computeInitialPanels(1560, CABIN_H)
const holesByPanel = panels.map((p) => defaultHoles(p, p.heightMm))

// Helper: count only the glass panel rects (not drag handles or button rects)
function glassRects(container: HTMLElement) {
  return container.querySelectorAll('[data-testid="glass-rect"]')
}

describe('DrawingCanvas', () => {
  it('renders an SVG element', () => {
    const { container } = render(
      <DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />,
    )
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders one glass rect per panel', () => {
    const { container } = render(
      <DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />,
    )
    expect(glassRects(container).length).toBe(panels.length)
  })

  it('renders all holes as circles', () => {
    const { container } = render(
      <DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />,
    )
    const circles = container.querySelectorAll('circle')
    const totalHoles = holesByPanel.reduce((sum, holes) => sum + holes.length, 0)
    expect(circles.length).toBe(totalHoles)
  })

  it('viewBox includes PAD on all sides at zoom 1', () => {
    const { container } = render(
      <DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />,
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
      <DrawingCanvas panels={[]} holesByPanel={[]} cabinHeightMm={CABIN_H} />,
    )
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders N glass rects for N panels', () => {
    const threePanels = [
      { widthMm: 500, heightMm: 2000, isDoor: false, position: 0 },
      { widthMm: 700, heightMm: 2000, isDoor: false, position: 1 },
      { widthMm: 800, heightMm: 2000, isDoor: true,  position: 2 },
    ]
    const h3 = threePanels.map((p) => defaultHoles(p, p.heightMm))
    const { container } = render(
      <DrawingCanvas panels={threePanels} holesByPanel={h3} cabinHeightMm={CABIN_H} />,
    )
    expect(glassRects(container).length).toBe(3)
  })

  it('renders boundary drag handles between panels', () => {
    const { container } = render(
      <DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />,
    )
    // For N panels there are N-1 boundary handles (dashed lines with stroke-dasharray="6 3")
    const dashed = Array.from(container.querySelectorAll('line')).filter(
      (el) => el.getAttribute('stroke-dasharray') === '6 3',
    )
    expect(dashed.length).toBe(panels.length - 1)
  })

  it('calls onToggleDoor when toggle button is clicked', () => {
    const onToggleDoor = vi.fn()
    render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        onToggleDoor={onToggleDoor}
      />,
    )
    // Two action buttons (one per panel) with aria-label containing "дверь"/"глухим"
    const toggleBtns = screen.getAllByRole('button', { name: /дверь|глухим/i })
    fireEvent.click(toggleBtns[0])
    expect(onToggleDoor).toHaveBeenCalledWith(0)
  })

  it('calls onSplitPanel when split button is clicked', () => {
    const onSplitPanel = vi.fn()
    // panels from 1560mm: [800 fixed, 800 door] — fixed panel (i=0) is wide enough
    render(
      <DrawingCanvas
        panels={panels}
        holesByPanel={holesByPanel}
        cabinHeightMm={CABIN_H}
        onSplitPanel={onSplitPanel}
      />,
    )
    const splitBtn = screen.getByRole('button', { name: 'Разделить' })
    fireEvent.click(splitBtn)
    expect(onSplitPanel).toHaveBeenCalledWith(0)
  })
})

describe('DrawingCanvas zoom controls', () => {
  it('starts at 100%', () => {
    render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />)
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('+ button increases zoom to 110%', () => {
    render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />)
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }))
    expect(screen.getByText('110%')).toBeTruthy()
  })

  it('− button decreases zoom back to 100%', () => {
    render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />)
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }))
    fireEvent.click(screen.getByRole('button', { name: 'Уменьшить' }))
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('Сброс button returns to 100% from any zoom', () => {
    render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} cabinHeightMm={CABIN_H} />)
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }))
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }))
    expect(screen.getByText('120%')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Сброс зума' }))
    expect(screen.getByText('100%')).toBeTruthy()
  })
})
