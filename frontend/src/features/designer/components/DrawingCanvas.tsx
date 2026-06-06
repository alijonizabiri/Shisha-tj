import { useCallback, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import type { Hole as HoleData, Panel } from '../lib/types'
import { Hole } from './Hole'

// ── Constants ────────────────────────────────────────────────────────────────

const PAD = 60   // mm padding around the drawing for dimension labels
const TICK = 6   // half-length of dimension tick marks in mm

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const STEP = 0.1

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

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 10) / 10))
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
  const [zoom, setZoom] = useState(1)

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

  // ViewBox zoom — scale from center so content stays centered at any zoom level
  const fullW = totalWidthMm + PAD * 2
  const fullH = heightMm + PAD * 2
  const scaledW = fullW / zoom
  const scaledH = fullH / zoom
  const vbX = -PAD + (fullW - scaledW) / 2
  const vbY = -PAD + (fullH - scaledH) / 2

  function adjustZoom(delta: number) {
    setZoom((z) => clampZoom(z + delta))
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    adjustZoom(e.deltaY < 0 ? STEP : -STEP)
  }

  return (
    <div
      className={cn('relative h-full w-full', className)}
      onWheel={handleWheel}
    >
      {/* ── Zoom controls ── */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-md border border-border bg-card/90 p-1 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={() => adjustZoom(-STEP)}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Уменьшить"
          className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-accent disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-[3.25rem] text-center text-xs tabular-nums text-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => adjustZoom(STEP)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Увеличить"
          className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-accent disabled:opacity-40"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          aria-label="Сброс зума"
          className="ml-0.5 h-7 rounded px-2 text-xs hover:bg-accent"
        >
          Сброс
        </button>
      </div>

      <svg
        viewBox={`${vbX} ${vbY} ${scaledW} ${scaledH}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
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
    </div>
  )
}
