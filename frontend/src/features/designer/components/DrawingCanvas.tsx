import { useCallback, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import type { Hole as HoleData, Panel } from '../lib/types'
import { Hole } from './Hole'

// ── Constants ────────────────────────────────────────────────────────────────

const PAD = 60   // mm padding around the drawing for dimension labels
const TICK = 6   // half-length of dimension tick marks in mm

// ── Helpers ──────────────────────────────────────────────────────────────────

function xPositions(panels: Panel[]): number[] {
  const xs: number[] = []
  let cursor = 0
  for (const p of panels) {
    xs.push(cursor)
    cursor += p.widthMm
  }
  return xs
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HorizDim({
  x1, x2, y, label, bold = false,
}: { x1: number; x2: number; y: number; label: string; bold?: boolean }) {
  const mx = (x1 + x2) / 2
  return (
    <g>
      <line x1={x1} y1={y - TICK} x2={x1} y2={y + TICK} stroke="#94a3b8" strokeWidth={1} />
      <line x1={x2} y1={y - TICK} x2={x2} y2={y + TICK} stroke="#94a3b8" strokeWidth={1} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#94a3b8" strokeWidth={1} />
      <text
        x={mx} y={y + 18} textAnchor="middle" fontSize={18}
        fill={bold ? '#334155' : '#64748b'} fontWeight={bold ? '600' : 'normal'}
      >
        {label}
      </text>
    </g>
  )
}

function VertDim({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  const my = (y1 + y2) / 2
  return (
    <g>
      <line x1={x - TICK} y1={y1} x2={x + TICK} y2={y1} stroke="#94a3b8" strokeWidth={1} />
      <line x1={x - TICK} y1={y2} x2={x + TICK} y2={y2} stroke="#94a3b8" strokeWidth={1} />
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="#94a3b8" strokeWidth={1} />
      <text x={x + 14} y={my} dominantBaseline="middle" fontSize={18} fill="#64748b">
        {label}
      </text>
    </g>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface DrawingCanvasProps {
  panels: Panel[]
  holesByPanel: HoleData[][]
  /** Called after each hole drag with updated holes for all panels */
  onHolesChange?: (holesByPanel: HoleData[][]) => void
  className?: string
}

export function DrawingCanvas({
  panels,
  holesByPanel: initialHoles,
  onHolesChange,
  className,
}: DrawingCanvasProps) {
  const [holes, setHoles] = useState<HoleData[][]>(initialHoles)

  const handleHoleMove = useCallback(
    (panelIdx: number, holeIdx: number, xMm: number, yMm: number) => {
      setHoles((prev) => {
        const next = prev.map((pHoles, i) =>
          i === panelIdx
            ? pHoles.map((h, j) => (j === holeIdx ? { ...h, xMm, yMm } : h))
            : pHoles,
        )
        onHolesChange?.(next)
        return next
      })
    },
    [onHolesChange],
  )

  if (panels.length === 0) return null

  const totalWidthMm = panels.reduce((acc, p) => acc + p.widthMm, 0)
  const heightMm = panels[0].heightMm
  const xs = xPositions(panels)

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${totalWidthMm + PAD * 2} ${heightMm + PAD * 2}`}
      className={cn('w-full', className)}
      aria-label="Чертёж кабины"
    >
      {/* ── Panels ── */}
      {panels.map((panel, i) => (
        <g key={`panel-${i}`}>
          <rect
            x={xs[i]} y={0} width={panel.widthMm} height={heightMm}
            fill={panel.isDoor ? '#dbeafe' : '#f8fafc'}
            stroke="#334155" strokeWidth={2}
          />
          {panel.isDoor && (
            <line
              x1={xs[i] + 2} y1={6}
              x2={xs[i] + panel.widthMm - 2} y2={6}
              stroke="#3b82f6" strokeWidth={4} strokeLinecap="round"
            />
          )}
          <text
            x={xs[i] + panel.widthMm / 2} y={heightMm - 20}
            textAnchor="middle" fontSize={22} fill="#94a3b8"
          >
            {panel.isDoor ? 'Дверь' : 'Глухое'}
          </text>
        </g>
      ))}

      {/* ── Draggable holes ── */}
      {panels.map((panel, i) =>
        (holes[i] ?? []).map((hole, j) => (
          <Hole
            key={`hole-${i}-${j}`}
            xMm={hole.xMm}
            yMm={hole.yMm}
            radiusMm={hole.radiusMm}
            holeType={hole.holeType}
            panelX={xs[i]}
            panelWidthMm={panel.widthMm}
            panelHeightMm={panel.heightMm}
            onMove={(x, y) => handleHoleMove(i, j, x, y)}
          />
        )),
      )}

      {/* ── Dimension lines ── */}
      {panels.map((panel, i) => (
        <HorizDim
          key={`dim-w-${i}`}
          x1={xs[i]} x2={xs[i] + panel.widthMm}
          y={heightMm + 22} label={`${panel.widthMm}`}
        />
      ))}
      <HorizDim x1={0} x2={totalWidthMm} y={heightMm + 50} label={`${totalWidthMm}`} bold />
      <VertDim x={totalWidthMm + 22} y1={0} y2={heightMm} label={`${heightMm}`} />
    </svg>
  )
}
