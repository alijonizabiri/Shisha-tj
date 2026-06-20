import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import type { Hole as HoleData, Panel, PanelShape } from '../lib/types'
import { Hole } from './Hole'

// ── Constants ────────────────────────────────────────────────────────────────

const PAD = 60
const TICK = 6

const SHAPE_STROKE: Record<PanelShape, string> = {
  Flat:        '#334155',
  LShapeLeft:  '#818cf8',
  LShapeRight: '#a78bfa',
  Curved:      '#34d399',
}

const MIN_DOOR_W  = 500
const MAX_DOOR_W  = 800
const MIN_FIXED_W = 200
const MAX_FIXED_W = 3000
const MIN_HEIGHT  = 200

const SNAP_THRESHOLD  = 5
const HOLE_EDGE_MARGIN = 20

const LONG_PRESS_MS = 500
const SHORT_TAP_MS  = 200

// ── Types ─────────────────────────────────────────────────────────────────────

interface DragState {
  type: 'boundary' | 'height'
  panelIdx: number
  startWidths: number[]
  startHeights: number[]
  startClientX: number
  startClientY: number
}

interface AbsPos { x: number; y: number }

export interface PanelScreenRect {
  x: number
  y: number
  w: number
  h: number
}

// ── Snap ──────────────────────────────────────────────────────────────────────

export function computeSnap(
  currentX: number,
  currentY: number,
  others: AbsPos[],
  threshold = SNAP_THRESHOLD,
): { x: number; y: number; guides: { x: number | null; y: number | null } } {
  let guideX: number | null = null
  let guideY: number | null = null
  let minDistX = Infinity
  let minDistY = Infinity

  for (const other of others) {
    const dx = Math.abs(currentX - other.x)
    const dy = Math.abs(currentY - other.y)
    if (dx <= threshold && dx < minDistX) { minDistX = dx; guideX = other.x }
    if (dy <= threshold && dy < minDistY) { minDistY = dy; guideY = other.y }
  }

  return {
    x: guideX !== null ? guideX : currentX,
    y: guideY !== null ? guideY : currentY,
    guides: { x: guideX, y: guideY },
  }
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
  cabinHeightMm: number
  zoom: number
  onZoomChange: (z: number) => void
  onHolesChange?: (holesByPanel: HoleData[][]) => void
  onPanelsChange?: (panels: Panel[]) => void
  selectedPanelId?: string | null
  onSelectPanel?: (id: string | null, rect?: PanelScreenRect) => void
  onRequestContextMenu?: (panelId: string, rect: PanelScreenRect) => void
  className?: string
}

// ── Main component ────────────────────────────────────────────────────────────

export function DrawingCanvas({
  panels,
  holesByPanel: initialHoles,
  cabinHeightMm,
  zoom,
  onZoomChange,
  onHolesChange,
  onPanelsChange,
  selectedPanelId,
  onSelectPanel,
  onRequestContextMenu,
  className,
}: DrawingCanvasProps) {
  const [holes, setHoles] = useState<HoleData[][]>(initialHoles)
  const [localPanels, setLocalPanels] = useState<Panel[] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeGuides, setActiveGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })

  // Inline width editing state
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null)
  const [editingWidth, setEditingWidth] = useState('')

  const svgRef = useRef<SVGSVGElement>(null)
  const activeDragRef = useRef<DragState | null>(null)

  // Long-press / click tracking (per panel)
  const pointerDownTimeRef = useRef<number>(0)
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTargetRef = useRef<{ panelId: string; panelIdx: number } | null>(null)
  const hasMoved = useRef(false)
  const MOVE_THRESHOLD = 6 // px — ignore micro-jitter from trackpad/mouse

  const holesRef = useRef<HoleData[][]>(holes)
  const xsRef = useRef<number[]>([])
  const renderPanelsRef = useRef<Panel[]>([])

  const renderPanels = localPanels ?? panels
  const totalWidthMm = renderPanels.reduce((acc, p) => acc + p.widthMm, 0)
  const xs = xPositions(renderPanels)

  const setGroups = useMemo(() => {
    const map = new Map<string, number[]>()
    renderPanels.forEach((p, i) => {
      if (!p.setId) return
      const arr = map.get(p.setId) ?? []
      arr.push(i)
      map.set(p.setId, arr)
    })
    return map
  }, [renderPanels])

  holesRef.current = holes
  xsRef.current = xs
  renderPanelsRef.current = renderPanels

  const fullW = totalWidthMm + PAD * 2
  const fullH = cabinHeightMm + PAD * 2
  const scaledW = fullW / zoom
  const scaledH = fullH / zoom
  const vbX = -PAD + (fullW - scaledW) / 2
  const vbY = -PAD + (fullH - scaledH) / 2

  // ── Hole drag ──────────────────────────────────────────────────────────────

  const handleHoleMove = useCallback(
    (panelIdx: number, holeIdx: number, xMm: number, yMm: number) => {
      const currentHoles = holesRef.current
      const currentXs = xsRef.current
      const currentPanels = renderPanelsRef.current
      const panel = currentPanels[panelIdx]
      if (!panel) return

      const absX = currentXs[panelIdx] + xMm
      const absY = (cabinHeightMm - panel.heightMm) + yMm

      const others: AbsPos[] = []
      for (let i = 0; i < currentHoles.length; i++) {
        const rp = currentPanels[i]
        if (!rp) continue
        const yOff = cabinHeightMm - rp.heightMm
        for (let j = 0; j < currentHoles[i].length; j++) {
          if (i === panelIdx && j === holeIdx) continue
          const h = currentHoles[i][j]
          others.push({ x: currentXs[i] + h.xMm, y: yOff + h.yMm })
        }
      }

      const { x: snapAbsX, y: snapAbsY, guides } = computeSnap(absX, absY, others)
      setActiveGuides(guides)

      const finalX = Math.round(
        Math.min(Math.max(snapAbsX - currentXs[panelIdx], HOLE_EDGE_MARGIN), panel.widthMm - HOLE_EDGE_MARGIN),
      )
      const finalY = Math.round(
        Math.min(Math.max(snapAbsY - (cabinHeightMm - panel.heightMm), HOLE_EDGE_MARGIN), panel.heightMm - HOLE_EDGE_MARGIN),
      )

      setHoles((prev) => {
        const next = prev.map((pHoles, i) =>
          i === panelIdx
            ? pHoles.map((h, j) => (j === holeIdx ? { ...h, xMm: finalX, yMm: finalY } : h))
            : pHoles,
        )
        onHolesChange?.(next)
        return next
      })
    },
    [onHolesChange, cabinHeightMm],
  )

  const handleHoleDragEnd = useCallback(() => {
    setActiveGuides({ x: null, y: null })
  }, [])

  // ── Wheel zoom ────────────────────────────────────────────────────────────

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    onZoomChange(Math.min(3, Math.max(0.25, Math.round((zoom + delta) * 10) / 10)))
  }

  // ── Screen rect helper ─────────────────────────────────────────────────────

  function getGlassScreenRect(panelIdx: number): PanelScreenRect {
    const svg = svgRef.current!
    const ctm = svg.getScreenCTM()!
    const panel = renderPanels[panelIdx]
    const yOffset = cabinHeightMm - panel.heightMm
    return {
      x: xs[panelIdx] * ctm.a + ctm.e,
      y: yOffset * ctm.d + ctm.f,
      w: panel.widthMm * ctm.a,
      h: panel.heightMm * Math.abs(ctm.d),
    }
  }

  // ── Panel pointer events (select + long press + inline edit) ──────────────

  function startPanelPointer(
    e: React.PointerEvent<SVGRectElement>,
    panelId: string,
    panelIdx: number,
  ) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.stopPropagation()
    hasMoved.current = false
    pointerDownTimeRef.current = Date.now()
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY }
    longPressTargetRef.current = { panelId, panelIdx }

    // Long press only fires on touch devices; mouse uses click in endPanelPointer
    if (e.pointerType !== 'mouse') {
      longPressTimerRef.current = setTimeout(() => {
        if (hasMoved.current) return
        const rect = svgRef.current?.getScreenCTM?.()
          ? getGlassScreenRect(panelIdx)
          : { x: 0, y: 0, w: 0, h: 0 }
        onRequestContextMenu?.(panelId, rect)
      }, LONG_PRESS_MS)
    }
  }

  function endPanelPointer(
    _e: React.PointerEvent<SVGRectElement>,
    panelId: string,
    panelIdx: number,
  ) {
    clearTimeout(longPressTimerRef.current ?? undefined)
    longPressTimerRef.current = null

    if (hasMoved.current || isDragging) return
    const elapsed = Date.now() - pointerDownTimeRef.current
    if (elapsed >= SHORT_TAP_MS) return // long press was already handled by the timer

    const rect = svgRef.current?.getScreenCTM?.()
      ? getGlassScreenRect(panelIdx)
      : { x: 0, y: 0, w: 0, h: 0 }

    const isTouch = window.matchMedia('(pointer: coarse)').matches
    if (isTouch) {
      // Touch: short tap = visual select only; context menu comes from long press
      onSelectPanel?.(panelId, rect)
    } else {
      // Mouse / trackpad: click = open context menu immediately
      onRequestContextMenu?.(panelId, rect)
    }
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    hasMoved.current = true
  }

  // ── Double-click → inline edit ────────────────────────────────────────────

  function handlePanelDoubleClick(
    e: React.MouseEvent,
    panelId: string,
    panelIdx: number,
  ) {
    e.stopPropagation()
    const panel = renderPanels[panelIdx]
    if (!panel) return
    setEditingPanelId(panelId)
    setEditingWidth(String(panel.widthMm))
  }

  function applyInlineWidth() {
    if (!editingPanelId) return
    const panel = renderPanels.find((p) => p.id === editingPanelId)
    if (!panel) { setEditingPanelId(null); return }
    const v = parseInt(editingWidth, 10)
    if (!Number.isNaN(v) && v > 0) {
      const clamped = panel.isDoor
        ? Math.max(400, Math.min(800, v))
        : Math.max(200, Math.min(3000, v))
      const updated = renderPanels.map((p) =>
        p.id === editingPanelId ? { ...p, widthMm: clamped } : p,
      )
      onPanelsChange?.(updated)
    }
    setEditingPanelId(null)
  }

  function handleSvgClick() {
    onSelectPanel?.(null)
    setEditingPanelId(null)
  }

  // ── Panel boundary drag ───────────────────────────────────────────────────

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
    onSelectPanel?.(null)
  }

  function handleDragMove(e: React.PointerEvent<SVGRectElement>) {
    const drag = activeDragRef.current
    if (!drag || !svgRef.current) return

    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return
    const scaleX = 1 / ctm.a
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
    <div className={cn('h-full w-full', className)} onWheel={handleWheel}>
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${scaledW} ${scaledH}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Чертёж кабины"
        onClick={handleSvgClick}
      >
        {/* ── 0. Set group outlines ── */}
        {Array.from(setGroups.entries()).map(([setId, idxs]) => {
          const minX = Math.min(...idxs.map((i) => xs[i]))
          const maxX = Math.max(...idxs.map((i) => xs[i] + renderPanels[i].widthMm))
          const minY = Math.min(...idxs.map((i) => cabinHeightMm - renderPanels[i].heightMm))
          const maxY = cabinHeightMm
          const PAD_SET = 8
          return (
            <rect
              key={`set-${setId}`}
              x={minX - PAD_SET} y={minY - PAD_SET}
              width={maxX - minX + PAD_SET * 2} height={maxY - minY + PAD_SET * 2}
              fill="none"
              stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="8 4"
              opacity={0.3} rx={4} pointerEvents="none"
            />
          )
        })}

        {/* ── 1. Panel rects ── */}
        {renderPanels.map((panel, i) => {
          const shape = panel.shape ?? 'Flat'
          const yOffset = cabinHeightMm - panel.heightMm
          const isSelected = panel.id === selectedPanelId
          const baseStroke = shape === 'Flat' ? '#334155' : SHAPE_STROKE[shape]
          const selectedStroke = '#c9a84c'
          const baseFill = panel.isDoor ? '#dbeafe' : (shape !== 'Flat' ? `${SHAPE_STROKE[shape]}18` : '#f8fafc')
          const selectedFill = 'rgba(201, 168, 76, 0.08)'
          const isEditing = panel.id === editingPanelId

          return (
            <g key={`panel-${panel.id}`}>
              {/* Golden selection glow ring */}
              {isSelected && (
                <rect
                  x={xs[i] - 3} y={yOffset - 3}
                  width={panel.widthMm + 6} height={panel.heightMm + 6}
                  fill="none"
                  stroke="#c9a84c" strokeWidth={1} opacity={0.3}
                  rx={4} pointerEvents="none"
                />
              )}

              <rect
                data-testid="glass-rect"
                x={xs[i]} y={yOffset}
                width={panel.widthMm} height={panel.heightMm}
                fill={isSelected ? selectedFill : baseFill}
                stroke={isSelected ? selectedStroke : baseStroke}
                strokeWidth={isSelected ? 2.5 : 2}
                style={{ cursor: 'pointer', touchAction: 'none' }}
                onPointerDown={(e) => startPanelPointer(e, panel.id, i)}
                onPointerUp={(e) => endPanelPointer(e, panel.id, i)}
                onPointerMove={(e) => {
                  const dx = Math.abs(e.clientX - pointerDownPosRef.current.x)
                  const dy = Math.abs(e.clientY - pointerDownPosRef.current.y)
                  if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                    hasMoved.current = true
                    cancelLongPress()
                  }
                }}
                onPointerCancel={cancelLongPress}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => handlePanelDoubleClick(e, panel.id, i)}
              />

              {/* Door rail */}
              {panel.isDoor && (
                <line
                  x1={xs[i] + 2} y1={yOffset + 6}
                  x2={xs[i] + panel.widthMm - 2} y2={yOffset + 6}
                  stroke="#3b82f6" strokeWidth={4} strokeLinecap="round"
                  pointerEvents="none"
                />
              )}

              {/* Height annotation */}
              {panel.heightMm !== cabinHeightMm && (
                <text
                  x={xs[i] + panel.widthMm / 2} y={yOffset + 28}
                  textAnchor="middle" fontSize={20} fill="#94a3b8"
                  pointerEvents="none"
                >
                  {panel.heightMm} мм ↕
                </text>
              )}

              {/* Curved label */}
              {shape === 'Curved' && (
                <text
                  x={xs[i] + panel.widthMm / 2}
                  y={yOffset + panel.heightMm / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={18} fill="#34d399" pointerEvents="none"
                >
                  {`⌒ R: ${panel.curvatureRadiusMm ?? '?'}мм`}
                </text>
              )}

              {shape === 'LShapeLeft' && (
                <text
                  x={xs[i] + panel.widthMm - 10}
                  y={yOffset + panel.heightMm - 8}
                  textAnchor="end" fontSize={20} fill="#818cf8"
                  pointerEvents="none"
                >
                  ⌐
                </text>
              )}

              {shape === 'LShapeRight' && (
                <text
                  x={xs[i] + 10}
                  y={yOffset + panel.heightMm - 8}
                  textAnchor="start" fontSize={20} fill="#a78bfa"
                  pointerEvents="none"
                >
                  ¬
                </text>
              )}

              {/* Inline width editor (double-click) */}
              {isEditing && (
                <foreignObject
                  x={xs[i] + panel.widthMm / 2 - 70}
                  y={yOffset - 52}
                  width={140}
                  height={44}
                >
                  <div>
                    <input
                      type="number"
                      value={editingWidth}
                      onChange={(e) => setEditingWidth(e.target.value)}
                      onBlur={applyInlineWidth}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyInlineWidth()
                        if (e.key === 'Escape') setEditingPanelId(null)
                        e.stopPropagation()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      className="w-full rounded-lg border border-[#c9a84c] bg-[#0d1117]
                                 px-3 py-2 text-center font-mono text-sm text-white
                                 outline-none [appearance:textfield]
                                 [&::-webkit-inner-spin-button]:appearance-none
                                 [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </foreignObject>
              )}

              {/* Per-panel dimension label */}
              <g pointerEvents="none">
                <line
                  x1={xs[i]} x2={xs[i] + panel.widthMm}
                  y1={cabinHeightMm + 22} y2={cabinHeightMm + 22}
                  stroke="rgba(255,255,255,0.2)" strokeWidth={1}
                />
                <line
                  x1={xs[i]} x2={xs[i]}
                  y1={cabinHeightMm + 17} y2={cabinHeightMm + 27}
                  stroke="rgba(255,255,255,0.2)" strokeWidth={1}
                />
                <line
                  x1={xs[i] + panel.widthMm} x2={xs[i] + panel.widthMm}
                  y1={cabinHeightMm + 17} y2={cabinHeightMm + 27}
                  stroke="rgba(255,255,255,0.2)" strokeWidth={1}
                />
                <text
                  x={xs[i] + panel.widthMm / 2}
                  y={cabinHeightMm + 40}
                  textAnchor="middle" fontSize={14}
                  fill={isSelected ? 'rgba(201,168,76,0.8)' : 'rgba(255,255,255,0.35)'}
                  fontFamily="monospace"
                >
                  {panel.widthMm}мм
                </text>
              </g>
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
                style={{ cursor: 'ew-resize', touchAction: 'none' }}
                onPointerDown={(e) => startDrag(e, 'boundary', i)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragUp}
                onPointerCancel={handleDragCancel}
              />
            </g>
          )
        })}

        {/* ── 3. Height drag handles ── */}
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
                style={{ cursor: 'ns-resize', touchAction: 'none' }}
                onPointerDown={(e) => startDrag(e, 'height', i)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragUp}
                onPointerCancel={handleDragCancel}
              />
            </g>
          )
        })}

        {/* ── 4. Holes (with larger touch hit area) ── */}
        {renderPanels.map((panel, i) => {
          const yOffset = cabinHeightMm - panel.heightMm
          return (holes[i] ?? []).map((hole, j) => (
            <Hole
              key={`hole-${panel.id}-${j}`}
              xMm={hole.xMm}
              yMm={hole.yMm + yOffset}
              radiusMm={hole.radiusMm}
              holeType={hole.holeType}
              panelX={xs[i]}
              panelWidthMm={panel.widthMm}
              panelHeightMm={panel.heightMm}
              onMove={(x, y) => handleHoleMove(i, j, x, y - yOffset)}
              onDragEnd={handleHoleDragEnd}
            />
          ))
        })}

        {/* ── 5. Overall dimension lines ── */}
        <HorizDim x1={0} x2={totalWidthMm} y={cabinHeightMm + 58} label={`${totalWidthMm}`} bold />
        <VertDim x={totalWidthMm + 22} y1={0} y2={cabinHeightMm} label={`${cabinHeightMm}`} />

        {/* ── 6. Snap guides ── */}
        {activeGuides.y !== null && (
          <line
            data-testid="snap-guide-h"
            x1={vbX} y1={activeGuides.y}
            x2={vbX + scaledW} y2={activeGuides.y}
            stroke="#4f46e5" strokeDasharray="6 4" strokeWidth={2.5} opacity={1}
            pointerEvents="none"
          />
        )}
        {activeGuides.x !== null && (
          <line
            data-testid="snap-guide-v"
            x1={activeGuides.x} y1={vbY}
            x2={activeGuides.x} y2={vbY + scaledH}
            stroke="#4f46e5" strokeDasharray="6 4" strokeWidth={2.5} opacity={1}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  )
}
