import { useRef, useMemo, useEffect, useState, type MutableRefObject } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Bounds, Center, useBounds } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'
import type { Hole, Panel } from '../lib/types'

const GLASS_THICKNESS = 8
const GLASS_COLOR = '#88ccee'
const DOOR_GLASS_COLOR = '#4f8ef7'
const DOOR_EDGE_COLOR = '#c9a84c'
const CONCRETE_COLOR = '#374151'
const WALL_DEPTH = 200
const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window
const OPEN_ANGLE = Math.PI * 110 / 180

interface DoorInteraction {
  openDoors: Set<string>
  hoveredDoor: string | null
  onHoverDoor: (id: string | null) => void
  onClickDoor: (panelId: string) => void
}

interface ThreeCanvasProps {
  panels: Panel[]
  holesByPanel: Hole[][]
}

export function ThreeCanvas({ panels, holesByPanel }: ThreeCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null)
  const fitRef = useRef<(() => void) | null>(null)

  const [openDoors, setOpenDoors] = useState<Set<string>>(new Set())
  const [hoveredDoor, setHoveredDoor] = useState<string | null>(null)

  const hasDoors = panels.some((p) => p.isDoor)
  const [showHint, setShowHint] = useState(() => !localStorage.getItem('designer_hint_shown'))

  useEffect(() => {
    if (!hasDoors || !showHint) return
    localStorage.setItem('designer_hint_shown', '1')
    const id = setTimeout(() => setShowHint(false), 4000)
    return () => clearTimeout(id)
  }, [hasDoors, showHint])

  const lShapeInfo = useMemo(() => {
    const wallA = panels.filter((p) => p.shape === 'LShapeLeft')
    const wallB = panels.filter((p) => p.shape === 'LShapeRight')
    if (!wallA.length || !wallB.length) return null
    const totalWidthA = wallA.reduce((s, p) => s + p.widthMm, 0)
    const totalWidthB = wallB.reduce((s, p) => s + p.widthMm, 0)
    const maxHeight = Math.max(...panels.map((p) => p.heightMm))
    return { totalWidthA, totalWidthB, maxHeight }
  }, [panels])

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

  const toggleDoor = (panelId: string) => {
    setOpenDoors((prev) => {
      const next = new Set(prev)
      if (next.has(panelId)) next.delete(panelId)
      else next.add(panelId)
      return next
    })
  }

  const doorInteraction: DoorInteraction = {
    openDoors,
    hoveredDoor,
    onHoverDoor: setHoveredDoor,
    onClickDoor: toggleDoor,
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <Canvas
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%', background: '#0d1117' }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} />
          <directionalLight position={[-10, 5, -5]} intensity={0.4} />
          <hemisphereLight args={['#88ccee', '#1a2744', 0.6]} />

          <Bounds fit clip observe margin={1.2}>
            {lShapeInfo ? (
              <GlassScene panels={panels} holesByPanel={holesByPanel} doorInteraction={doorInteraction} />
            ) : (
              <Center>
                <GlassScene panels={panels} holesByPanel={holesByPanel} doorInteraction={doorInteraction} />
              </Center>
            )}
            <BoundsSetup fitRef={fitRef} controlsRef={controlsRef} lShapeInfo={lShapeInfo} />
          </Bounds>

          <OrbitControls
            ref={controlsRef}
            makeDefault
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
          <ControlsInit controlsRef={controlsRef} lShapeInfo={lShapeInfo} />

          <StableGrid />
        </Canvas>
      </div>

      {/* Info overlay — top left */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70 backdrop-blur-sm">
        Панелей: {panels.length}
        &nbsp;|&nbsp;Общая ширина: {totalWidthMm} мм
        &nbsp;|&nbsp;Площадь: {totalAreaSqM} м²
      </div>

      {/* Camera controls — bottom right */}
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

      {/* First-open hint */}
      {hasDoors && showHint && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#0d1117]/80 border border-[#c9a84c]/30 rounded-full px-4 py-2 text-sm text-white/60 backdrop-blur-sm animate-pulse whitespace-nowrap z-10">
          👆 Нажмите на дверь чтобы открыть её
        </div>
      )}

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

// ── StableGrid ────────────────────────────────────────────────────────────────
// Custom shader grid: uses fwidth() derivatives for GPU-side anti-aliasing.
// Static geometry (no per-frame movement) eliminates the sub-pixel jitter that
// drei's Grid produces when followCamera moves the plane every frame.

const GRID_VERT = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const GRID_FRAG = `
  uniform vec3 uCamPos;
  varying vec3 vWorldPos;

  // Returns 1.0 on the grid line, 0.0 away from it.
  // px controls line width in screen pixels.
  float gridLine(float coord, float size, float px) {
    float v = coord / size;
    float fw = max(fwidth(v), 1e-6);
    float dist = abs(fract(v - 0.5) - 0.5);
    return 1.0 - smoothstep((px - 1.0) * fw, px * fw, dist);
  }

  void main() {
    float cell = max(
      gridLine(vWorldPos.x, 500.0, 0.5),
      gridLine(vWorldPos.z, 500.0, 0.5)
    );
    float section = max(
      gridLine(vWorldPos.x, 2500.0, 1.5),
      gridLine(vWorldPos.z, 2500.0, 1.5)
    );

    float d = length(vWorldPos.xz - uCamPos.xz);
    float fade = 1.0 - smoothstep(5000.0, 8000.0, d);

    vec3 cCell = vec3(0.118, 0.227, 0.373);
    vec3 cSect = vec3(0.165, 0.314, 0.502);

    float a = max(cell * 0.6, section) * fade;
    if (a < 0.001) discard;
    gl_FragColor = vec4(mix(cCell, cSect, min(section * 1.5, 1.0)), a);
  }
`

function StableGrid() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        uniforms: { uCamPos: { value: new THREE.Vector3() } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  )

  const { camera } = useThree()

  useFrame(() => {
    material.uniforms.uCamPos.value.copy(camera.position)
  })

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[40000, 40000]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ── Inner Canvas helpers ───────────────────────────────────────────────────────

type LShapeInfo = { totalWidthA: number; totalWidthB: number; maxHeight: number } | null

function setLShapeCamera(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: MutableRefObject<any>,
  info: NonNullable<LShapeInfo>,
) {
  const { totalWidthA, totalWidthB, maxHeight } = info
  const cx = totalWidthA * 0.8
  const cy = maxHeight * 1.2
  const cz = totalWidthB * 0.8
  const tx = totalWidthA / 2
  const ty = maxHeight / 2
  const tz = totalWidthB / 2
  const ctrl = controlsRef.current
  if (!ctrl) return
  ctrl.object.position.set(cx, cy, cz)
  ctrl.target.set(tx, ty, tz)
  ctrl.update()
}

function BoundsSetup({
  fitRef,
  controlsRef,
  lShapeInfo,
}: {
  fitRef: MutableRefObject<(() => void) | null>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: MutableRefObject<any>
  lShapeInfo: LShapeInfo
}) {
  const bounds = useBounds()
  useEffect(() => {
    if (lShapeInfo) {
      fitRef.current = () => setLShapeCamera(controlsRef, lShapeInfo)
    } else {
      fitRef.current = () => bounds.refresh().fit()
    }
  }, [bounds, fitRef, controlsRef, lShapeInfo])
  return null
}

function ControlsInit({
  controlsRef,
  lShapeInfo,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: MutableRefObject<any>
  lShapeInfo: LShapeInfo
}) {
  const { camera } = useThree()
  useEffect(() => {
    if (lShapeInfo) {
      const id = setTimeout(() => setLShapeCamera(controlsRef, lShapeInfo), 50)
      return () => clearTimeout(id)
    } else {
      controlsRef.current?.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])
  return null
}

// ── GlassScene ────────────────────────────────────────────────────────────────

type PanelEntry = { panel: Panel; holes: Hole[] }

function GlassScene({
  panels,
  holesByPanel,
  doorInteraction,
}: {
  panels: Panel[]
  holesByPanel: Hole[][]
  doorInteraction: DoorInteraction
}) {
  const sorted = useMemo(
    () => [...panels].sort((a, b) => a.position - b.position),
    [panels],
  )

  const { cabinSets, flatEntries } = useMemo(() => {
    const sets = new Map<string, { wallA: PanelEntry[]; wallB: PanelEntry[] }>()
    const flat: PanelEntry[] = []

    sorted.forEach((panel, i) => {
      const holes = holesByPanel[i] ?? []
      if (!panel.setId) {
        flat.push({ panel, holes })
        return
      }
      const g = sets.get(panel.setId) ?? { wallA: [], wallB: [] }
      if (panel.shape === 'LShapeLeft') g.wallA.push({ panel, holes })
      else if (panel.shape === 'LShapeRight') g.wallB.push({ panel, holes })
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
      {Array.from(cabinSets.entries()).map(([setId, { wallA, wallB }]) => {
        if (!wallA.length || !wallB.length) return null
        const height = wallA[0].panel.heightMm
        const totalWidthA = wallA.reduce((s, e) => s + e.panel.widthMm, 0)
        const totalWidthB = wallB.reduce((s, e) => s + e.panel.widthMm, 0)

        let cursorA = 0
        const wallAPanels = wallA.map((entry) => {
          const x = cursorA + entry.panel.widthMm / 2
          cursorA += entry.panel.widthMm
          return { ...entry, x }
        })

        let cursorB = 0
        const wallBPanels = wallB.map((entry) => {
          const z = cursorB + entry.panel.widthMm / 2
          cursorB += entry.panel.widthMm
          return { ...entry, z }
        })

        return (
          <group key={setId}>
            {/* Wall A — along X, face toward +Z */}
            {wallAPanels.map(({ panel, holes, x }, idx) => (
              <group key={panel.id} position={[x, height / 2, -GLASS_THICKNESS / 2]}>
                {panel.isDoor ? (
                  <AnimatedDoorPanel
                    panel={panel}
                    holes={holes}
                    isOpen={doorInteraction.openDoors.has(panel.id)}
                    isHovered={doorInteraction.hoveredDoor === panel.id}
                    onHover={(h) => doorInteraction.onHoverDoor(h ? panel.id : null)}
                    onClickDoor={doorInteraction.onClickDoor}
                    rollerSlideDir={idx < wallAPanels.length - 1 ? 1 : -1}
                  />
                ) : (
                  <GlassMesh panel={panel} holes={holes} />
                )}
              </group>
            ))}

            {/* Wall B — along Z from corner, rotated 90° around Y */}
            {wallBPanels.map(({ panel, holes, z }, idx) => (
              <group
                key={panel.id}
                position={[totalWidthA + GLASS_THICKNESS / 2, height / 2, z]}
                rotation={[0, Math.PI / 2, 0]}
              >
                {panel.isDoor ? (
                  <AnimatedDoorPanel
                    panel={panel}
                    holes={holes}
                    isOpen={doorInteraction.openDoors.has(panel.id)}
                    isHovered={doorInteraction.hoveredDoor === panel.id}
                    onHover={(h) => doorInteraction.onHoverDoor(h ? panel.id : null)}
                    onClickDoor={doorInteraction.onClickDoor}
                    rollerSlideDir={idx < wallBPanels.length - 1 ? 1 : -1}
                  />
                ) : (
                  <GlassMesh panel={panel} holes={holes} />
                )}
              </group>
            ))}

            {/* Roller rails */}
            {wallAPanels.some((e) => e.panel.isDoor && e.panel.mechanism === 'Roller') && (
              <mesh position={[totalWidthA / 2, height + 7.5, -GLASS_THICKNESS / 2]}>
                <boxGeometry args={[totalWidthA, 15, 15]} />
                <meshStandardMaterial color={DOOR_EDGE_COLOR} roughness={0.3} metalness={0.8} />
              </mesh>
            )}
            {wallBPanels.some((e) => e.panel.isDoor && e.panel.mechanism === 'Roller') && (
              <mesh
                position={[totalWidthA + GLASS_THICKNESS / 2, height + 7.5, totalWidthB / 2]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <boxGeometry args={[totalWidthB, 15, 15]} />
                <meshStandardMaterial color={DOOR_EDGE_COLOR} roughness={0.3} metalness={0.8} />
              </mesh>
            )}

            {/* Concrete wall behind wall A */}
            <mesh position={[-WALL_DEPTH / 2, height / 2, totalWidthB / 2]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[totalWidthB + WALL_DEPTH, height, WALL_DEPTH]} />
              <meshStandardMaterial color={CONCRETE_COLOR} opacity={0.3} transparent side={THREE.DoubleSide} depthWrite={false} />
            </mesh>

            {/* Concrete wall behind wall B */}
            <mesh position={[totalWidthA / 2, height / 2, -WALL_DEPTH / 2]}>
              <boxGeometry args={[totalWidthA + WALL_DEPTH, height, WALL_DEPTH]} />
              <meshStandardMaterial color={CONCRETE_COLOR} opacity={0.3} transparent side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        )
      })}

      {/* Flat panels — laid out in a row */}
      {flatEntries.map(({ panel, holes }, i) => (
        <group key={panel.id} position={[flatXs[i] + panel.widthMm / 2, panel.heightMm / 2, 0]}>
          {panel.isDoor ? (
            <AnimatedDoorPanel
              panel={panel}
              holes={holes}
              isOpen={doorInteraction.openDoors.has(panel.id)}
              isHovered={doorInteraction.hoveredDoor === panel.id}
              onHover={(h) => doorInteraction.onHoverDoor(h ? panel.id : null)}
              onClickDoor={doorInteraction.onClickDoor}
            />
          ) : (
            <GlassMesh panel={panel} holes={holes} />
          )}
        </group>
      ))}
    </group>
  )
}

// ── AnimatedDoorPanel ─────────────────────────────────────────────────────────

const AnimatedGroup = animated.group

interface AnimatedDoorPanelProps {
  panel: Panel
  holes: Hole[]
  isOpen: boolean
  isHovered: boolean
  onHover: (hovered: boolean) => void
  onClickDoor: (panelId: string) => void
  rollerSlideDir?: 1 | -1
}

function AnimatedDoorPanel({ panel, holes, isOpen, isHovered, onHover, onClickDoor, rollerSlideDir }: AnimatedDoorPanelProps) {
  const hingeSide = panel.hingeSide ?? 'Left'
  const isRoller = panel.mechanism === 'Roller'

  // Roller: explicit direction from GlassScene based on panel position in wall.
  // Flat roller fallback: derive from hingeSide.
  const slideDir: 1 | -1 = rollerSlideDir ?? (hingeSide === 'Left' ? -1 : 1)
  // LShapeLeft faces outward in +Z → positive base angle
  // LShapeRight (parent rotated 90°) and Flat face outward in -Z → negative base angle
  const baseAngle = panel.shape === 'LShapeLeft' ? OPEN_ANGLE : -OPEN_ANGLE
  const openAngle = hingeSide === 'Right' ? -baseAngle : baseAngle

  // LShapeRight parent is Ry(π/2): local X maps to world -Z (along wall B).
  // For wall B roller, negate slideDir so the door slides in the correct world direction.
  const isWallB = panel.shape === 'LShapeRight'
  const effectiveDir = isWallB ? (-slideDir as 1 | -1) : slideDir
  const { rotY, slideX } = useSpring({
    rotY: isOpen && !isRoller ? openAngle : 0,
    slideX: isOpen && isRoller ? effectiveDir * panel.widthMm * 0.85 : 0,
    config: { mass: 2, tension: 80, friction: 20, precision: 0.001 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (e: any) => {
    e.stopPropagation()
    onClickDoor(panel.id)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    onHover(true)
    document.body.style.cursor = 'pointer'
  }
  const handlePointerOut = () => {
    onHover(false)
    document.body.style.cursor = 'default'
  }

  const doorContent = (
    <>
      <mesh onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
        <boxGeometry args={[panel.widthMm, panel.heightMm, GLASS_THICKNESS]} />
        <meshPhysicalMaterial
          color={DOOR_GLASS_COLOR}
          opacity={isHovered ? 0.65 : 0.5}
          transparent
          roughness={0.05}
          metalness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
          emissive={DOOR_GLASS_COLOR}
          emissiveIntensity={isHovered ? 0.25 : 0}
        />
      </mesh>
      <DoorEdgeFrame widthMm={panel.widthMm} heightMm={panel.heightMm} />
      {isRoller ? (
        <RollerWheel heightMm={panel.heightMm} />
      ) : (
        <HingeDecor heightMm={panel.heightMm} widthMm={panel.widthMm} hingeSide={hingeSide} />
      )}
      {holes.map((hole, j) => (
        <HoleMesh key={j} hole={hole} panel={panel} />
      ))}
    </>
  )

  if (isRoller) {
    return <AnimatedGroup position-x={slideX}>{doorContent}</AnimatedGroup>
  }

  // Pivot trick: shift to hinge edge, rotate, shift content back to center
  const pivotX = hingeSide === 'Left' ? -panel.widthMm / 2 : panel.widthMm / 2
  return (
    <group position={[pivotX, 0, 0]}>
      <AnimatedGroup rotation-y={rotY}>
        <group position={[-pivotX, 0, 0]}>{doorContent}</group>
      </AnimatedGroup>
    </group>
  )
}

// ── DoorEdgeFrame ─────────────────────────────────────────────────────────────

function DoorEdgeFrame({ widthMm, heightMm }: { widthMm: number; heightMm: number }) {
  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(widthMm, heightMm, GLASS_THICKNESS)),
    [widthMm, heightMm],
  )
  return (
    <lineSegments geometry={edgesGeo}>
      <lineBasicMaterial color={DOOR_EDGE_COLOR} linewidth={2} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </lineSegments>
  )
}

// ── GlassMesh (non-door panels) ───────────────────────────────────────────────

function GlassMesh({ panel, holes }: { panel: Panel; holes: Hole[] }) {
  const color = panel.isDoor ? DOOR_GLASS_COLOR : GLASS_COLOR

  const geometry = useMemo(() => {
    if (panel.shape === 'Curved') {
      const r = panel.curvatureRadiusMm ?? 1000
      return new THREE.CylinderGeometry(r, r, panel.heightMm, 64, 1, true, -Math.PI / 4, Math.PI / 2)
    }
    return new THREE.BoxGeometry(panel.widthMm, panel.heightMm, GLASS_THICKNESS)
  }, [panel.shape, panel.widthMm, panel.heightMm, panel.curvatureRadiusMm])

  const edgesGeometry = useMemo(() => {
    if (!panel.isDoor || panel.shape === 'Curved') return null
    return new THREE.EdgesGeometry(geometry as THREE.BoxGeometry)
  }, [panel.isDoor, panel.shape, geometry])

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
      {edgesGeometry && (
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color={DOOR_EDGE_COLOR} linewidth={2} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </lineSegments>
      )}
      {panel.isDoor && panel.mechanism === 'Hinge' && (
        <HingeDecor heightMm={panel.heightMm} widthMm={panel.widthMm} hingeSide={panel.hingeSide ?? 'Left'} />
      )}
      {panel.isDoor && panel.mechanism === 'Roller' && (
        <RollerWheel heightMm={panel.heightMm} />
      )}
      {holes.map((hole, j) => (
        <HoleMesh key={j} hole={hole} panel={panel} />
      ))}
    </group>
  )
}

// ── HingeDecor ────────────────────────────────────────────────────────────────

function HingeDecor({
  heightMm,
  widthMm,
  hingeSide,
}: {
  heightMm: number
  widthMm: number
  hingeSide: 'Left' | 'Right'
}) {
  const hingeGeo = useMemo(() => new THREE.BoxGeometry(8, 80, GLASS_THICKNESS + 4), [])
  const hingeX = hingeSide === 'Right' ? widthMm / 2 - 4 : -widthMm / 2 + 4
  const yPositions = [-heightMm * 0.35, 0, heightMm * 0.35]
  return (
    <>
      {yPositions.map((y, i) => (
        <mesh key={i} geometry={hingeGeo} position={[hingeX, y, 0]}>
          <meshStandardMaterial color={DOOR_EDGE_COLOR} metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  )
}

// ── RollerWheel ───────────────────────────────────────────────────────────────

function RollerWheel({ heightMm }: { heightMm: number }) {
  const wheelGeo = useMemo(() => new THREE.CylinderGeometry(12, 12, 20, 8), [])
  return (
    <mesh geometry={wheelGeo} position={[0, heightMm / 2 + 12, 0]} rotation={[0, 0, Math.PI / 2]}>
      <meshStandardMaterial color={DOOR_EDGE_COLOR} roughness={0.3} metalness={0.8} />
    </mesh>
  )
}

// ── HoleMesh ──────────────────────────────────────────────────────────────────

function HoleMesh({ hole, panel }: { hole: Hole; panel: Panel }) {
  // LShapeRight panels are rotated +90° around Y in the 3D scene, making
  // local +X point toward world –Z (the corner between walls A and B).
  // Hole xMm is stored in 2D convention (x=0 at left edge facing the panel).
  // For wall B, "left in 2D" = away from the corner in 3D, so we mirror X.
  const effectiveXMm = panel.shape === 'LShapeRight'
    ? panel.widthMm - hole.xMm
    : hole.xMm
  const localX = effectiveXMm - panel.widthMm / 2
  const localY = panel.heightMm / 2 - hole.yMm
  const geo = useMemo(
    () => new THREE.CylinderGeometry(hole.radiusMm, hole.radiusMm, GLASS_THICKNESS + 6, 16),
    [hole.radiusMm],
  )
  return (
    <mesh geometry={geo} position={[localX, localY, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color="#1a2744" opacity={0.9} transparent side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
  )
}
