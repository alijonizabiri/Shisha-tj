import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hole } from './Hole'

const defaultProps = {
  xMm: 50,
  yMm: 10,
  radiusMm: 12,
  holeType: 'Mount' as const,
  panelX: 100,
  panelWidthMm: 800,
  panelHeightMm: 2000,
  onMove: vi.fn(),
}

beforeEach(() => {
  // jsdom doesn't implement pointer capture — provide no-op stubs
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

describe('Hole', () => {
  it('renders at panelX + xMm', () => {
    const { container } = render(
      <svg>
        <Hole {...defaultProps} panelX={100} xMm={50} />
      </svg>,
    )
    const circle = container.querySelector('circle')!
    expect(circle.getAttribute('cx')).toBe('150') // 100 + 50
    expect(circle.getAttribute('cy')).toBe('10')
    expect(circle.getAttribute('r')).toBe('12')
  })

  it('has aria-label equal to holeType', () => {
    const { container } = render(
      <svg>
        <Hole {...defaultProps} holeType="Roller" />
      </svg>,
    )
    expect(container.querySelector('circle')!.getAttribute('aria-label')).toBe('Roller')
  })

  it('disables browser touch scroll via touchAction none', () => {
    const { container } = render(
      <svg>
        <Hole {...defaultProps} />
      </svg>,
    )
    expect(container.querySelector('circle')!.style.touchAction).toBe('none')
  })

  it('has role=button for accessibility', () => {
    const { container } = render(
      <svg>
        <Hole {...defaultProps} />
      </svg>,
    )
    expect(container.querySelector('[role="button"]')).toBeTruthy()
  })
})
