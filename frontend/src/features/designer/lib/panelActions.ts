import type { Panel, DoorMechanism, HandleSide, LShapeConfig } from './types'
import { defaultHoles } from './defaultHoles'
import { buildLShapePanels } from './buildLShapePanels'

export const MIN_WALL_WIDTH = 900
export const MIN_DOOR_WIDTH = 600
export const MIN_REMAINDER  = 200

export function resizeDoor(
  panels: Panel[],
  doorId: string,
  newWidthMm: number,
): Panel[] {
  const door = panels.find((p) => p.id === doorId)
  if (!door || !door.isDoor) return panels

  // Find the companion remainder panel (same setId, same wall shape, not door)
  const remainder = door.setId
    ? panels.find((p) => p.setId === door.setId && !p.isDoor && p.shape === door.shape)
    : panels.find((p) => !p.isDoor && !p.setId)

  const wallTotal = remainder
    ? door.widthMm + remainder.widthMm
    : door.widthMm

  if (newWidthMm < MIN_DOOR_WIDTH) return panels
  if (remainder && wallTotal - newWidthMm < MIN_REMAINDER) return panels

  const minDoor = MIN_DOOR_WIDTH
  const maxDoor = remainder ? wallTotal - MIN_REMAINDER : door.widthMm

  const clamped = Math.max(minDoor, Math.min(maxDoor, newWidthMm))
  const remainderWidth = remainder ? wallTotal - clamped : undefined

  return panels.map((p) => {
    if (p.id === doorId) return { ...p, widthMm: clamped }
    if (remainder && p.id === remainder.id && remainderWidth !== undefined)
      return { ...p, widthMm: remainderWidth }
    return p
  })
}

export function resizePanel(
  panels: Panel[],
  panelId: string,
  newWidthMm: number,
): Panel[] {
  if (newWidthMm < MIN_WALL_WIDTH) return panels
  return panels.map((p) =>
    p.id === panelId ? { ...p, widthMm: Math.max(MIN_WALL_WIDTH, newWidthMm) } : p,
  )
}

export function resizeHeight(
  panels: Panel[],
  newHeightMm: number,
): Panel[] {
  const h = Math.max(1500, Math.min(2500, newHeightMm))
  return panels.map((p) => ({ ...p, heightMm: h }))
}

export function toggleHingeSide(
  panels: Panel[],
  doorId: string,
): Panel[] {
  return panels.map((p) => {
    if (p.id !== doorId || !p.isDoor) return p
    const next: HandleSide = p.hingeSide === 'Left' ? 'Right' : 'Left'
    return { ...p, hingeSide: next }
  })
}

export function toggleMechanism(
  panels: Panel[],
  doorId: string,
  mechanism: DoorMechanism,
): Panel[] {
  return panels.map((p) => {
    if (p.id !== doorId || !p.isDoor) return p
    return { ...p, mechanism }
  })
}

export function moveDoorSide(
  panels: Panel[],
  doorId: string,
): Panel[] {
  const door = panels.find((p) => p.id === doorId)
  if (!door || !door.isDoor) return panels

  // Only handle panels on the same "wall" (same shape in an L-shape set, or flat)
  const wallPanels = door.setId
    ? panels.filter((p) => p.setId === door.setId && p.shape === door.shape)
    : panels.filter((p) => !p.setId)

  if (wallPanels.length !== 2) return panels

  // Swap order of the two panels on this wall
  const [first, second] = wallPanels
  const swappedFirst = { ...second, position: first.position }
  const swappedSecond = { ...first, position: second.position }

  return panels
    .map((p) => {
      if (p.id === first.id) return swappedFirst
      if (p.id === second.id) return swappedSecond
      return p
    })
    .sort((a, b) => a.position - b.position)
    .map((p, i) => ({ ...p, position: i }))
}

export function moveDoorToOtherWall(
  panels: Panel[],
  doorId: string,
  lShapeConfig: LShapeConfig,
): Panel[] {
  const door = panels.find((p) => p.id === doorId)
  if (!door || !door.isDoor || !door.setId) return panels

  // Determine current and target config
  const configMap: Record<LShapeConfig, LShapeConfig> = {
    DoorOnA_NearWall:    'DoorOnB_NearWall',
    DoorOnA_NearCorner:  'DoorOnB_NearCorner',
    DoorOnB_NearWall:    'DoorOnA_NearWall',
    DoorOnB_NearCorner:  'DoorOnA_NearCorner',
    DoorsAtCorner:       'DoorsAtCorner',
  }
  const newConfig = configMap[lShapeConfig]
  if (newConfig === lShapeConfig) return panels

  // Gather wall widths from existing panels
  const setId = door.setId
  const aPanel = panels.find((p) => p.setId === setId && p.shape === 'LShapeLeft')
  const bPanel = panels.find((p) => p.setId === setId && p.shape === 'LShapeRight')
  if (!aPanel || !bPanel) return panels

  const wallAMm = panels
    .filter((p) => p.setId === setId && p.shape === 'LShapeLeft')
    .reduce((s, p) => s + p.widthMm, 0)
  const wallBMm = panels
    .filter((p) => p.setId === setId && p.shape === 'LShapeRight')
    .reduce((s, p) => s + p.widthMm, 0)

  return buildLShapePanels({
    config: newConfig,
    wallAMm,
    wallBMm,
    heightMm: door.heightMm,
    doorWidthAMm: door.widthMm,
    mechanism: door.mechanism ?? 'Hinge',
    hingeSide: door.hingeSide ?? 'Left',
  }).map((p, i) => ({ ...p, position: i }))
}

export function convertToDoor(
  panels: Panel[],
  panelId: string,
): Panel[] {
  const panel = panels.find((p) => p.id === panelId)
  if (!panel || panel.isDoor) return panels

  // Only one door allowed — if there's already one, can't convert
  const hasDoor = panels.some((p) => p.isDoor)
  if (hasDoor) return panels

  const doorWidth = Math.min(panel.widthMm, Math.round(panel.widthMm / 2))
  const clampedDoor = Math.max(400, Math.min(800, doorWidth))

  return panels.map((p) => {
    if (p.id !== panelId) return p
    return {
      ...p,
      isDoor: true,
      widthMm: clampedDoor,
      mechanism: 'Hinge' as DoorMechanism,
      hingeSide: 'Left' as HandleSide,
    }
  })
}

// Recalculate holes array (indexed by panel position) when panels change
export function syncHolesAfterPanelChange(
  panels: Panel[],
  prevPanels: Panel[],
  prevHoles: import('./types').Hole[][],
): import('./types').Hole[][] {
  return panels.map((panel) => {
    const prevIdx = prevPanels.findIndex((p) => p.id === panel.id)
    const propertiesChanged =
      prevIdx === -1 ||
      prevPanels[prevIdx].widthMm !== panel.widthMm ||
      prevPanels[prevIdx].heightMm !== panel.heightMm ||
      prevPanels[prevIdx].isDoor !== panel.isDoor ||
      prevPanels[prevIdx].hingeSide !== panel.hingeSide

    if (propertiesChanged || prevIdx === -1) {
      return defaultHoles(panel, panel.heightMm, panel.hingeSide ?? 'Left')
    }
    return prevHoles[prevIdx] ?? defaultHoles(panel, panel.heightMm, panel.hingeSide ?? 'Left')
  })
}
