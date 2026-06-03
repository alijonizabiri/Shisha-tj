import { useRef } from 'react'
import type { HoleType } from '../lib/types'

const EDGE_MARGIN = 20 // mm — minimum distance from any panel edge

const STROKE: Record<HoleType, string> = {
  Roller: '#3b82f6',
  Handle: '#1e40af',
  Mount:  '#64748b',
  Custom: '#94a3b8',
}

interface HoleProps {
  xMm: number
  yMm: number
  radiusMm: number
  holeType: HoleType
  /** Absolute SVG x-coordinate of the parent panel's left edge */
  panelX: number
  panelWidthMm: number
  panelHeightMm: number
  onMove: (xMm: number, yMm: number) => void
}

export function Hole({
  xMm, yMm, radiusMm, holeType,
  panelX, panelWidthMm, panelHeightMm,
  onMove,
}: HoleProps) {
  const dragging = useRef(false)

  function toSvg(e: React.PointerEvent<SVGCircleElement>) {
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(ctm.inverse())
  }

  const onPointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
  }

  const onPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!dragging.current) return
    const p = toSvg(e)
    if (!p) return

    const x = Math.round(
      Math.min(Math.max(p.x - panelX, EDGE_MARGIN), panelWidthMm - EDGE_MARGIN),
    )
    const y = Math.round(
      Math.min(Math.max(p.y, EDGE_MARGIN), panelHeightMm - EDGE_MARGIN),
    )
    onMove(x, y)
  }

  const onPointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!dragging.current) return
    dragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <circle
      cx={panelX + xMm}
      cy={yMm}
      r={radiusMm}
      fill="white"
      stroke={STROKE[holeType]}
      strokeWidth={2}
      style={{ cursor: 'grab', touchAction: 'none' }}
      role="button"
      aria-label={holeType}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  )
}
