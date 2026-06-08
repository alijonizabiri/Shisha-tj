import { useCallback, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import type { Hole as HoleData, Panel } from '../lib/types'
import { Hole } from './Hole'

// ── Constants ────────────────────────────────────────────────────────────────

const PAD = 60
const TICK = 6
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const STEP = 0.1

const MIN_DOOR_W  = 500
const MAX_DOOR_W  = 800
const MIN_FIXED_W = 200
const MAX_FIXED_W = 3000
const MIN_HEIGHT  = 200
const MAX_PANELS  = 6

// ── Types ─────────────────────────────────────────────────────────────────────

interface DragState {
  type: 'boundary' | 'height'
  panelIdx: number
  startWidths: number[]
  startHeights: number[]
  startClientX: number
  startClientY: number
}

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface DrawingCanvasProps {
  panels: Panel[]
  holesByPanel: HoleData[][]
  /** Cabin opening height in mm — floor coordinate and height-drag constraint */
  cabinHeightMm: number
  onHolesChange?: (holesByPanel: HoleData[][]) => void
  /** Called when boundary or height drag is committed (pointer-up) */
  onPanelsChange?: (panels: Panel[]) => void
  onSplitPanel?: (panelIdx: number) => void
  onToggleDoor?: (panelIdx: number) => void
  className?: string
}

// ── Main component ────────────────────────────────────────────────────────────

export function DrawingCanvas({
  panels,
  holesByPanel: initialHoles,
  cabinHeightMm,
  onHolesChange,
  onPanelsChange,
  onSplitPanel,
  onToggleDoor,
  className,
}: DrawingCanvasProps) {
  const [holes, setHoles] = useState<HoleData[][]>(initialHoles)
  const [zoom, setZoom] = useState(1)
  // localPanels: in-progress drag visual; null when not dragging
  const [localPanels, setLocalPanels] = useState<Panel[] | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)
  const activeDragRef = useRef<DragState | null>(null)

  const renderPanels = localPanels ?? panels
  const totalWidthMm = renderPanels.reduce((acc, p) => acc + p.widthMm, 0)
  const xs = xPositions(renderPanels)

  const fullW = totalWidthMm + PAD * 2
  const fullH = cabinHeightMm + PAD * 2
  const scaledW = fullW / zoom
  const scaledH = fullH / zoom
  const vbX = -PAD + (fullW - scaledW) / 2
  const vbY = -PAD + (fullH - scaledH) / 2

  // ── Hole drag ──────────────────────────────────────────────────────────────

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

  // ── Zoom ──────────────────────────────────────────────────────────────────

  function adjustZoom(delta: number) {
    setZoom((z) => clampZoom(z + delta))
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    adjustZoom(e.deltaY < 0 ? STEP : -STEP)
  }

  // ── Panel drag ────────────────────────────────────────────────────────────

  function startDrag(
    e: React.PointerEvent<SVGRectElement>,
    type: 'boundary' | 'height',
    panelIdx: number,
  ) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    activeDragRef.current = {
      type,
      panelIdx,
      startWidths:  renderPanels.map((p) => p.widthMm),
      startHeights: renderPanels.map((p) => p.heightMm),
      startClientX: e.clientX,
      startClientY: e.clientY,
    }
    setIsDragging(true)
  }

  function handleDragMove(e: React.PointerEvent<SVGRectElement>) {
    const drag = activeDragRef.current
    if (!drag || !svgRef.current) return

    // getScreenCTM().a/.d give screen-pixels-per-SVG-unit, including viewBox scale
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return
    const scaleX = 1 / ctm.a  // SVG units per screen pixel
    const scaleY = 1 / ctm.d

    if (drag.type === 'boundary') {
      const svgDelta = Math.round((e.clientX - drag.startClientX) * scaleX)
      const { panelIdx, startWidths } = drag
      const totalTwo = startWidths[panelIdx] + startWidths[panelIdx + 1]

      const pL = renderPanels[panelIdx]
      const pR = renderPanels[panelIdx + 1]
      const minL = pL.isDoor ? MIN_DOOR_W : MIN_FIXED_W
      const maxL = pL.isDoor ? MAX_DOOR_W : MAX_FIXED_W
      const minR = pR.isDoor ? MIN_DOOR_W : MIN_FIXED_W
      const maxR = pR.isDoor ? MAX_DOOR_W : MAX_FIXED_W

      let newL = Math.max(minL, Math.min(maxL, startWidths[panelIdx] + svgDelta))
      let newR = totalTwo - newL
      if (newR < minR) { newR = minR; newL = totalTwo - minR }
      if (newR > maxR) { newR = maxR; newL = totalTwo - maxR }

      setLocalPanels(renderPanels.map((p, i) => {
        if (i === panelIdx)     return { ...p, widthMm: newL }
        if (i === panelIdx + 1) return { ...p, widthMm: newR }
        return p
      }))
    } else {
      // Drag top edge up → panel gets taller (svgDelta < 0 → height increases)
      const svgDelta = Math.round((e.clientY - drag.startClientY) * scaleY)
      const { panelIdx, startHeights } = drag
      const newH = Math.max(MIN_HEIGHT, Math.min(cabinHeightMm, startHeights[panelIdx] - svgDelta))
      setLocalPanels(renderPanels.map((p, i) => (i === panelIdx ? { ...p, heightMm: newH } : p)))
    }
  }

  function handleDragUp(e: React.PointerEvent<SVGRectElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (localPanels) {
      onPanelsChange?.(localPanels)
      setLocalPanels(null)
    }
    activeDragRef.current = null
    setIsDragging(false)
  }

  function handleDragCancel() {
    setLocalPanels(null)
    activeDragRef.current = null
    setIsDragging(false)
  }

  if (panels.length === 0) return null

  return (
    <div className={cn('relative h-full w-full', className)} onWheel={handleWheel}>
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
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${scaledW} ${scaledH}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Чертёж кабины"
      >
        {/* ── 1. Glass panel rects ── */}
        {renderPanels.map((panel, i) => {
          const yOffset = cabinHeightMm - panel.heightMm
          return (
            <g key={`panel-${i}`}>
              <rect
                data-testid="glass-rect"
                x={xs[i]} y={yOffset}
                width={panel.widthMm} height={panel.heightMm}
                fill={panel.isDoor ? '#dbeafe' : '#f8fafc'}
                stroke="#334155" strokeWidth={2}
              />
              {panel.isDoor && (
                <line
                  x1={xs[i] + 2} y1={yOffset + 6}
                  x2={xs[i] + panel.widthMm - 2} y2={yOffset + 6}
                  stroke="#3b82f6" strokeWidth={4} strokeLinecap="round"
                />
              )}
              {/* Show individual height when panel is shorter than cabin */}
              {panel.heightMm !== cabinHeightMm && (
                <text
                  x={xs[i] + panel.widthMm / 2} y={yOffset + 28}
                  textAnchor="middle" fontSize={20} fill="#94a3b8"
                >
                  {panel.heightMm} мм ↕
                </text>
              )}
            </g>
          )
        })}

        {/* ── 2. Boundary drag handles ── */}
        {renderPanels.slice(0, -1).map((_, i) => {
          const bx = xs[i] + renderPanels[i].widthMm
          return (
            <g key={`boundary-${i}`}>
              <line
                x1={bx} y1={0} x2={bx} y2={cabinHeightMm}
                stroke="#94a3b8" strokeWidth={1} strokeDasharray="6 3"
                pointerEvents="none"
              />
              <rect
                x={bx - 10} y={0} width={20} height={cabinHeightMm}
                fill="transparent"
                style={{ cursor: 'ew-resize' }}
                onPointerDown={(e) => startDrag(e, 'boundary', i)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragUp}
                onPointerCancel={handleDragCancel}
              />
            </g>
          )
        })}

        {/* ── 3. Height drag handles (top edge of each panel) ── */}
        {renderPanels.map((panel, i) => {
          const topY = cabinHeightMm - panel.heightMm
          return (
            <g key={`height-handle-${i}`}>
              <line
                x1={xs[i] + 8} y1={topY}
                x2={xs[i] + panel.widthMm - 8} y2={topY}
                stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4"
                pointerEvents="none"
              />
              <rect
                x={xs[i]} y={topY - 10} width={panel.widthMm} height={20}
                fill="transparent"
                style={{ cursor: 'ns-resize' }}
                onPointerDown={(e) => startDrag(e, 'height', i)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragUp}
                onPointerCancel={handleDragCancel}
              />
            </g>
          )
        })}

        {/* ── 4. Holes (above drag handles so they keep pointer priority) ── */}
        {renderPanels.map((panel, i) => {
          const yOffset = cabinHeightMm - panel.heightMm
          return (holes[i] ?? []).map((hole, j) => (
            <Hole
              key={`hole-${i}-${j}`}
              xMm={hole.xMm}
              yMm={hole.yMm + yOffset}
              radiusMm={hole.radiusMm}
              holeType={hole.holeType}
              panelX={xs[i]}
              panelWidthMm={panel.widthMm}
              panelHeightMm={panel.heightMm}
              onMove={(x, y) => handleHoleMove(i, j, x, y - yOffset)}
            />
          ))
        })}

        {/* ── 5. Dimension lines ── */}
        {renderPanels.map((panel, i) => (
          <HorizDim
            key={`dim-w-${i}`}
            x1={xs[i]} x2={xs[i] + panel.widthMm}
            y={cabinHeightMm + 22} label={`${panel.widthMm}`}
          />
        ))}
        <HorizDim x1={0} x2={totalWidthMm} y={cabinHeightMm + 50} label={`${totalWidthMm}`} bold />
        <VertDim x={totalWidthMm + 22} y1={0} y2={cabinHeightMm} label={`${cabinHeightMm}`} />

        {/* ── 6. Action buttons (hidden during drag to avoid mis-taps) ── */}
        {!isDragging && renderPanels.map((panel, i) => {
          const midX = xs[i] + panel.widthMm / 2
          // Buttons anchored near the floor; always inside panel (min height ≥ 200 mm)
          const doorBtnTop  = cabinHeightMm - 70
          const splitBtnTop = cabinHeightMm - 118

          return (
            <g key={`actions-${i}`}>
              {/* Door ↔ Fixed toggle */}
              <g
                onClick={(e) => { e.stopPropagation(); onToggleDoor?.(i) }}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={panel.isDoor ? 'Сделать глухим' : 'Сделать дверью'}
              >
                <rect
                  x={midX - 65} y={doorBtnTop} width={130} height={44}
                  rx={6}
                  fill={panel.isDoor ? '#eff6ff' : '#f1f5f9'}
                  stroke="#94a3b8" strokeWidth={1.5}
                />
                <text
                  x={midX} y={doorBtnTop + 28}
                  textAnchor="middle" fontSize={26}
                  fill="#475569" fontFamily="system-ui,sans-serif"
                  pointerEvents="none"
                >
                  {panel.isDoor ? '→ Глухое' : '→ Дверь'}
                </text>
              </g>

              {/* Split — only for non-door panels wide enough to halve legally */}
              {!panel.isDoor && panel.widthMm >= 400 && renderPanels.length < MAX_PANELS && (
                <g
                  onClick={(e) => { e.stopPropagation(); onSplitPanel?.(i) }}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  aria-label="Разделить"
                >
                  <rect
                    x={midX - 55} y={splitBtnTop} width={110} height={40}
                    rx={6}
                    fill="#f8fafc"
                    stroke="#94a3b8" strokeWidth={1.5}
                  />
                  <text
                    x={midX} y={splitBtnTop + 26}
                    textAnchor="middle" fontSize={24}
                    fill="#64748b" fontFamily="system-ui,sans-serif"
                    pointerEvents="none"
                  >
                    Разделить
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
