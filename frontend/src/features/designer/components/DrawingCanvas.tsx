import { cn } from '@/shared/lib/cn'
import type { Hole, HoleType, Panel } from '../lib/types'

// ── Constants ────────────────────────────────────────────────────────────────

const PAD = 60   // padding around the drawing in mm (room for dimension labels)
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

function holeStroke(type: HoleType): string {
  switch (type) {
    case 'Roller':  return '#3b82f6'
    case 'Handle':  return '#1e40af'
    case 'Mount':   return '#64748b'
    case 'Custom':  return '#94a3b8'
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface HorizDimProps {
  x1: number
  x2: number
  y: number
  label: string
  bold?: boolean
}

function HorizDim({ x1, x2, y, label, bold = false }: HorizDimProps) {
  const mx = (x1 + x2) / 2
  return (
    <g>
      <line x1={x1} y1={y - TICK} x2={x1} y2={y + TICK} stroke="#94a3b8" strokeWidth={1} />
      <line x1={x2} y1={y - TICK} x2={x2} y2={y + TICK} stroke="#94a3b8" strokeWidth={1} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#94a3b8" strokeWidth={1} />
      <text
        x={mx}
        y={y + 18}
        textAnchor="middle"
        fontSize={18}
        fill={bold ? '#334155' : '#64748b'}
        fontWeight={bold ? '600' : 'normal'}
      >
        {label}
      </text>
    </g>
  )
}

interface VertDimProps {
  x: number
  y1: number
  y2: number
  label: string
}

function VertDim({ x, y1, y2, label }: VertDimProps) {
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
  holesByPanel: Hole[][]
  className?: string
}

export function DrawingCanvas({ panels, holesByPanel, className }: DrawingCanvasProps) {
  if (panels.length === 0) return null

  const totalWidthMm = panels.reduce((acc, p) => acc + p.widthMm, 0)
  const heightMm = panels[0].heightMm
  const xs = xPositions(panels)

  const vbX = -PAD
  const vbY = -PAD
  const vbW = totalWidthMm + PAD * 2
  const vbH = heightMm + PAD * 2

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className={cn('w-full', className)}
      aria-label="Чертёж кабины"
    >
      {/* ── Panels ── */}
      {panels.map((panel, i) => (
        <g key={`panel-${i}`}>
          <rect
            x={xs[i]}
            y={0}
            width={panel.widthMm}
            height={heightMm}
            fill={panel.isDoor ? '#dbeafe' : '#f8fafc'}
            stroke="#334155"
            strokeWidth={2}
          />

          {/* Blue rail line at top of door panel */}
          {panel.isDoor && (
            <line
              x1={xs[i] + 2}
              y1={6}
              x2={xs[i] + panel.widthMm - 2}
              y2={6}
              stroke="#3b82f6"
              strokeWidth={4}
              strokeLinecap="round"
            />
          )}

          {/* Panel type label */}
          <text
            x={xs[i] + panel.widthMm / 2}
            y={heightMm - 20}
            textAnchor="middle"
            fontSize={22}
            fill="#94a3b8"
          >
            {panel.isDoor ? 'Дверь' : 'Глухое'}
          </text>
        </g>
      ))}

      {/* ── Holes ── */}
      {panels.map((_, i) =>
        (holesByPanel[i] ?? []).map((hole, j) => (
          <circle
            key={`hole-${i}-${j}`}
            cx={xs[i] + hole.xMm}
            cy={hole.yMm}
            r={hole.radiusMm}
            fill="white"
            stroke={holeStroke(hole.holeType)}
            strokeWidth={2}
          />
        )),
      )}

      {/* ── Individual panel width dims ── */}
      {panels.map((panel, i) => (
        <HorizDim
          key={`dim-w-${i}`}
          x1={xs[i]}
          x2={xs[i] + panel.widthMm}
          y={heightMm + 22}
          label={`${panel.widthMm}`}
        />
      ))}

      {/* ── Total width dim ── */}
      <HorizDim
        x1={0}
        x2={totalWidthMm}
        y={heightMm + 50}
        label={`${totalWidthMm}`}
        bold
      />

      {/* ── Height dim ── */}
      <VertDim
        x={totalWidthMm + 22}
        y1={0}
        y2={heightMm}
        label={`${heightMm}`}
      />
    </svg>
  )
}
