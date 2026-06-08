import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { computeInitialPanels } from '../lib/computePanels'
import { defaultHoles } from '../lib/defaultHoles'
import { DrawingCanvas } from './DrawingCanvas'

// Use real computed data so the test validates the full pipeline
const panels = computeInitialPanels(1560, 2000)
const holesByPanel = panels.map((p) => defaultHoles(p, p.heightMm))

describe('DrawingCanvas', () => {
  it('renders an SVG element', () => {
    const { container } = render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders one rect per panel', () => {
    const { container } = render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} />)
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(panels.length)
  })

  it('renders all holes as circles', () => {
    const { container } = render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} />)
    const circles = container.querySelectorAll('circle')
    const totalHoles = holesByPanel.reduce((sum, holes) => sum + holes.length, 0)
    expect(circles.length).toBe(totalHoles)
  })

  it('viewBox includes PAD on all sides at zoom 1', () => {
    const { container } = render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} />)
    const svg = container.querySelector('svg')!
    const vb = svg.getAttribute('viewBox')!
    const [x, y, w, h] = vb.split(' ').map(Number)
    expect(x).toBe(-60)
    expect(y).toBe(-60)
    expect(w).toBe(1600 + 120) // totalWidth(1600) + 2*PAD(60)
    expect(h).toBe(2000 + 120)
  })

  it('returns null for empty panels', () => {
    const { container } = render(<DrawingCanvas panels={[]} holesByPanel={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders N rects for N panels', () => {
    const threePanels = [
      { widthMm: 500, heightMm: 2000, isDoor: false, position: 0 },
      { widthMm: 700, heightMm: 2000, isDoor: false, position: 1 },
      { widthMm: 800, heightMm: 2000, isDoor: true,  position: 2 },
    ]
    const h3 = threePanels.map((p) => defaultHoles(p, p.heightMm))
    const { container } = render(<DrawingCanvas panels={threePanels} holesByPanel={h3} />)
    expect(container.querySelectorAll('rect').length).toBe(3)
  })
})

describe('DrawingCanvas zoom controls', () => {
  it('starts at 100%', () => {
    render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} />)
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('+ button increases zoom to 110%', () => {
    render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }))
    expect(screen.getByText('110%')).toBeTruthy()
  })

  it('− button decreases zoom back to 100%', () => {
    render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }))
    fireEvent.click(screen.getByRole('button', { name: 'Уменьшить' }))
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('Сброс button returns to 100% from any zoom', () => {
    render(<DrawingCanvas panels={panels} holesByPanel={holesByPanel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }))
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить' }))
    expect(screen.getByText('120%')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Сброс зума' }))
    expect(screen.getByText('100%')).toBeTruthy()
  })
})
