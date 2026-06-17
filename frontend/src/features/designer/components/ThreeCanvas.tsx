import { useRef, useMemo, useEffect, type MutableRefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Bounds, Center, useBounds } from '@react-three/drei'
import * as THREE from 'three'
import type { Hole, Panel } from '../lib/types'

const GLASS_THICKNESS = 8
const GLASS_COLOR = '#88ccee'
const DOOR_GLASS_COLOR = '#4f8ef7'
const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

interface ThreeCanvasProps {
  panels: Panel[]
  holesByPanel: Hole[][]
}

export function ThreeCanvas({ panels, holesByPanel }: ThreeCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null)
  const fitRef = useRef<(() => void) | null>(null)

  const totalWidthMm = panels.reduce((s, p) => s + p.widthMm, 0)
  const totalAreaSqM =
    Math.round(panels.reduce((s, p) => s + (p.widthMm / 1000) * (p.heightMm / 1000), 0) * 100) / 100

  const handleReset = () => fitRef.current?.()

  const handleZoomIn = () => {
    const c = controlsRef.current
    if (!c) return
    const off = new THREE.Vector3().subVectors(c.object.position, c.target).multiplyScalar(1 / 1.2)
    c.object.position.copy(c.target).add(off)
    c.update()
  }

  const handleZoomOut = () => {
    const c = controlsRef.current
    if (!c) return
    const off = new THREE.Vector3().subVectors(c.object.position, c.target).multiplyScalar(1.2)
    c.object.position.copy(c.target).add(off)
    c.update()
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <Canvas style={{ width: '100%', height: '100%', background: '#0d1117' }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} />
          <directionalLight position={[-10, 5, -5]} intensity={0.4} />
          <hemisphereLight args={['#88ccee', '#1a2744', 0.6]} />

          <Bounds fit clip observe margin={1.2}>
            <Center>
              <GlassScene panels={panels} holesByPanel={holesByPanel} />
            </Center>
            <BoundsSetup fitRef={fitRef} />
          </Bounds>

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN,
            }}
          />
          <ControlsInit controlsRef={controlsRef} />

          <Grid
            args={[20000, 20000]}
            cellSize={500}
            position={[0, 0, 0]}
            cellColor="#1e3a5f"
            sectionColor="#1e3a5f"
            sectionSize={2000}
            fadeDistance={15000}
            infiniteGrid
          />
        </Canvas>
      </div>

      {/* Info overlay — top left */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70 backdrop-blur-sm">
        Панелей: {panels.length}
        &nbsp;|&nbsp;Общая ширина: {totalWidthMm} мм
        &nbsp;|&nbsp;Площадь: {totalAreaSqM} м²
      </div>

      {/* Camera controls — bottom right, above FAB */}
      <div className="absolute bottom-[5.5rem] right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleReset}
          title="Сбросить вид"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-[#c9a84c] backdrop-blur-sm hover:bg-black/90 text-lg"
        >
          ⟳
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          title="Приблизить"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-[#c9a84c] backdrop-blur-sm hover:bg-black/90 text-xl font-bold"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Отдалить"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-[#c9a84c] backdrop-blur-sm hover:bg-black/90 text-xl font-bold"
        >
          −
        </button>
      </div>

      {/* Bottom hints */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1">
        <div className="whitespace-nowrap rounded-md border border-white/10 bg-black/50 px-3 py-1 text-xs text-white/40 backdrop-blur-sm">
          3D — только просмотр. Для редактирования переключитесь в 2D.
        </div>
        {isTouchDevice && (
          <div className="whitespace-nowrap rounded-md border border-white/10 bg-black/50 px-3 py-1 text-xs text-white/30 backdrop-blur-sm">
            Один палец — вращение&nbsp;•&nbsp;Два пальца — масштаб&nbsp;•&nbsp;Три пальца — перемещение
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inner Canvas helpers ───────────────────────────────────────────────────────

function BoundsSetup({ fitRef }: { fitRef: MutableRefObject<(() => void) | null> }) {
  const bounds = useBounds()
  useEffect(() => {
    fitRef.current = () => bounds.refresh().fit()
  }, [bounds, fitRef])
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ControlsInit({ controlsRef }: { controlsRef: MutableRefObject<any> }) {
  useEffect(() => {
    controlsRef.current?.reset()
  }, [controlsRef])
  return null
}

// ── GlassScene ────────────────────────────────────────────────────────────────

function GlassScene({ panels, holesByPanel }: { panels: Panel[]; holesByPanel: Hole[][] }) {
  const sorted = useMemo(
    () => [...panels].sort((a, b) => a.position - b.position),
    [panels],
  )

  type PanelEntry = { panel: Panel; holes: Hole[] }

  const { cabinSets, flatEntries } = useMemo(() => {
    const sets = new Map<string, { left?: PanelEntry; right?: PanelEntry; door?: PanelEntry }>()
    const flat: PanelEntry[] = []

    sorted.forEach((panel, i) => {
      const holes = holesByPanel[i] ?? []
      if (!panel.setId) {
        flat.push({ panel, holes })
        return
      }
      const g = sets.get(panel.setId) ?? {}
      if (panel.shape === 'LShapeLeft') g.left = { panel, holes }
      else if (panel.shape === 'LShapeRight') g.right = { panel, holes }
      else if (panel.isDoor) g.door = { panel, holes }
      sets.set(panel.setId, g)
    })

    return { cabinSets: sets, flatEntries: flat }
  }, [sorted, holesByPanel])

  const flatXs = useMemo(() => {
    const xs: number[] = []
    let cursor = 0
    for (const { panel } of flatEntries) {
      xs.push(cursor)
      cursor += panel.widthMm + 10
    }
    return xs
  }, [flatEntries])

  return (
    <group>
      {/* L-shape cabin sets — corner cabin geometry */}
      {Array.from(cabinSets.entries()).map(([setId, { left, right, door }]) => {
        if (!left || !right) return null
        const h = left.panel.heightMm
        const lw = left.panel.widthMm
        const rw = right.panel.widthMm
        const dw = door?.panel.widthMm ?? 0
        return (
          <group key={setId}>
            {/* Back wall (LShapeLeft) — along X axis */}
            <group position={[0, h / 2, -rw / 2]}>
              <GlassMesh panel={left.panel} holes={left.holes} />
            </group>
            {/* Side wall (LShapeRight) — along Z axis, rotated 90° */}
            <group position={[lw / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
              <GlassMesh panel={right.panel} holes={right.holes} />
            </group>
            {/* Door — front opening */}
            {door && (
              <group position={[lw / 2 - dw / 2, h / 2, rw / 2]}>
                <GlassMesh panel={door.panel} holes={door.holes} />
              </group>
            )}
          </group>
        )
      })}

      {/* Flat panels — laid out in a row */}
      {flatEntries.map(({ panel, holes }, i) => (
        <group key={panel.id} position={[flatXs[i] + panel.widthMm / 2, panel.heightMm / 2, 0]}>
          <GlassMesh panel={panel} holes={holes} />
        </group>
      ))}
    </group>
  )
}

// ── GlassMesh ─────────────────────────────────────────────────────────────────

function GlassMesh({ panel, holes }: { panel: Panel; holes: Hole[] }) {
  const color = panel.isDoor ? DOOR_GLASS_COLOR : GLASS_COLOR

  const geometry = useMemo(() => {
    if (panel.shape === 'Curved') {
      const r = panel.curvatureRadiusMm ?? 1000
      return new THREE.CylinderGeometry(r, r, panel.heightMm, 64, 1, true, -Math.PI / 4, Math.PI / 2)
    }
    return new THREE.BoxGeometry(panel.widthMm, panel.heightMm, GLASS_THICKNESS)
  }, [panel.shape, panel.widthMm, panel.heightMm, panel.curvatureRadiusMm])

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          opacity={0.55}
          transparent
          roughness={0.05}
          metalness={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {holes.map((hole, j) => (
        <HoleMesh key={j} hole={hole} panel={panel} />
      ))}
    </group>
  )
}

// ── HoleMesh ──────────────────────────────────────────────────────────────────

function HoleMesh({ hole, panel }: { hole: Hole; panel: Panel }) {
  const localX = hole.xMm - panel.widthMm / 2
  const localY = panel.heightMm / 2 - hole.yMm
  const geo = useMemo(
    () => new THREE.CylinderGeometry(hole.radiusMm, hole.radiusMm, GLASS_THICKNESS + 2, 16),
    [hole.radiusMm],
  )
  return (
    <mesh geometry={geo} position={[localX, localY, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color="#1a2744" opacity={0.9} transparent />
    </mesh>
  )
}
