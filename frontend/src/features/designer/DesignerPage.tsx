import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast, Toaster } from 'sonner'
import { computeInitialPanels, computeMetricsFromPanels } from './lib/computePanels'
import { defaultHoles } from './lib/defaultHoles'
import {
  resizeDoor,
  resizePanel,
  resizeHeight,
  toggleHingeSide,
  toggleMechanism,
  moveDoorSide,
  moveDoorToOtherWall,
  convertToDoor,
  syncHolesAfterPanelChange,
} from './lib/panelActions'
import type { Hole, Panel, HoleType, PanelShape, LShapeConfig, DoorMechanism } from './lib/types'
import { measurementFormSchema, type MeasurementFormValues, type GlassColor, type HardwareColor } from './schemas'
import { downloadMeasurementPdf, useDesignerLeads, useGetMeasurement, useSaveMeasurement, useUpdateMeasurement, type HoleRequest } from './api'
import { glassesToFormValues } from './lib/glassesToFormValues'
import type { LShapeInitValues } from './lib/glassesToFormValues'
import { DrawingCanvas, type PanelScreenRect } from './components/DrawingCanvas'
import { ThreeCanvas } from './components/ThreeCanvas'
import { DesignerTopBar } from './components/DesignerTopBar'
import { DesignerInfoCard } from './components/DesignerInfoCard'
import { DesignerZoomControls } from './components/DesignerZoomControls'
import { DesignerFab } from './components/DesignerFab'
import { DesignerSheet } from './components/DesignerSheet'
import { PanelContextMenu } from './components/PanelContextMenu'

const DEFAULT_FORM_VALUES: MeasurementFormValues = {
  leadId:        '',
  product:       '',
  measureMm:     '' as unknown as number,
  heightMm:      2000,
  glassColor:    'Transparent',
  hardwareColor: 'BlackMatte',
  deliveryTjs:   100,
  depositTjs:    0,
}

function flattenHoles(holesByPanel: Hole[][]): HoleRequest[] {
  return holesByPanel.flatMap((holes, panelIndex) =>
    holes.map((hole) => ({
      panelIndex,
      xMm: hole.xMm,
      yMm: hole.yMm,
      radiusMm: hole.radiusMm,
      holeType: hole.holeType,
    })),
  )
}

// Infer LShapeConfig from the current panel arrangement
function inferLShapeConfig(panels: Panel[]): LShapeConfig | undefined {
  const setId = panels.find((p) => p.setId)?.setId
  if (!setId) return undefined

  const door = panels.find((p) => p.isDoor && p.setId === setId)
  if (!door) return undefined

  const shape = door.shape
  const wallPanels = panels.filter((p) => p.setId === setId && p.shape === shape)
  const isDoorOnA = shape === 'LShapeLeft'

  const doorIdx = wallPanels.findIndex((p) => p.id === door.id)
  const isNearWall = doorIdx === 0 // door is first (leftmost) → near concrete wall

  if (isDoorOnA) {
    return isNearWall ? 'DoorOnA_NearWall' : 'DoorOnA_NearCorner'
  } else {
    return isNearWall ? 'DoorOnB_NearCorner' : 'DoorOnB_NearWall'
  }
}

export function DesignerPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const leadIdFromUrl = searchParams.get('leadId')
  const measurementIdFromUrl = searchParams.get('measurementId')

  const isEditMode = !!measurementIdFromUrl
  const storageKey = `designer_form_${measurementIdFromUrl ?? 'new'}`

  const { data: leads = [], isLoading: leadsLoading } = useDesignerLeads()
  const { data: existingMeasurement } = useGetMeasurement(measurementIdFromUrl)

  const lshapeInit: LShapeInitValues | undefined = useMemo(() => {
    if (!existingMeasurement) return undefined
    const state = glassesToFormValues(existingMeasurement.glasses)
    return state?.cabinType === 'lshape' ? state.lshape : undefined
  }, [existingMeasurement])

  const initialLeadId = leadIdFromUrl ?? ''

  // ── Form state ─────────────────────────────────────────────────────────────
  const infoForm = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    mode: 'onBlur',
    defaultValues: { ...DEFAULT_FORM_VALUES, leadId: initialLeadId },
  })

  const [formValues, setFormValues] = useState<MeasurementFormValues>(() => ({
    ...DEFAULT_FORM_VALUES,
    leadId: initialLeadId,
  }))

  // ── Load existing measurement ──────────────────────────────────────────────
  const initializedRef = useRef(false)
  useEffect(() => {
    if (!existingMeasurement || initializedRef.current) return
    initializedRef.current = true

    const sorted = [...existingMeasurement.glasses].sort((a, b) => a.position - b.position)

    const loadedPanels: Panel[] = sorted.map((g) => ({
      id: crypto.randomUUID(),
      position: g.position,
      widthMm: g.widthMm,
      heightMm: g.heightMm,
      isDoor: g.isDoor,
      shape: (g.shape ?? 'Flat') as PanelShape,
      setId: g.setId ?? undefined,
      curvatureRadiusMm: g.curvatureRadiusMm ?? undefined,
      mechanism: (g.mechanism as import('./lib/types').DoorMechanism | null) ?? undefined,
      hingeSide: (g.hingeSide as import('./lib/types').HandleSide | null) ?? undefined,
    }))

    const loadedHoles: Hole[][] = sorted.map((g) =>
      g.holes.map((h) => ({
        xMm: h.xMm,
        yMm: h.yMm,
        radiusMm: h.radiusMm,
        holeType: h.holeType as HoleType,
      })),
    )

    const values: MeasurementFormValues = {
      leadId:        existingMeasurement.leadId ?? '',
      product:       existingMeasurement.product ?? '',
      measureMm:     existingMeasurement.measureMm,
      heightMm:      existingMeasurement.heightMm,
      glassColor:    existingMeasurement.glassColor as GlassColor,
      hardwareColor: existingMeasurement.hardwareColor as HardwareColor,
      deliveryTjs:   existingMeasurement.deliveryCostTjs ?? 0,
      depositTjs:    0,
    }

    const key = loadedPanels
      .map((p) => (p.isDoor && p.hingeSide ? `${p.widthMm}x${p.heightMm}h${p.hingeSide}` : `${p.widthMm}x${p.heightMm}`))
      .join('-')

    setFormValues(values)
    infoForm.reset(values)
    setPanels(loadedPanels)
    setHoleTracker({ key, holes: loadedHoles })
  }, [existingMeasurement]) // eslint-disable-line react-hooks/exhaustive-deps

  const leadIneligible =
    !!leadIdFromUrl && !leadsLoading && !leads.some((l) => l.id === leadIdFromUrl)

  const saveMutation = useSaveMeasurement()
  const updateMutation = useUpdateMeasurement()

  // ── Panel state ────────────────────────────────────────────────────────────
  const [panels, setPanels] = useState<Panel[]>([])

  const cabinHeightMm = useMemo(() => {
    const h = Number(formValues.heightMm)
    return Number.isFinite(h) && h >= 1500 && h <= 2500 ? h : 2000
  }, [formValues.heightMm])

  // ── Holes ──────────────────────────────────────────────────────────────────
  const defaultHolesByPanel = useMemo(
    () => panels.map((p) => defaultHoles(p, p.heightMm, p.hingeSide)),
    [panels],
  )
  const canvasKey = panels
    .map((p) => (p.isDoor && p.hingeSide ? `${p.widthMm}x${p.heightMm}h${p.hingeSide}` : `${p.widthMm}x${p.heightMm}`))
    .join('-')
  const [holeTracker, setHoleTracker] = useState<{ key: string; holes: Hole[][] }>({
    key: canvasKey,
    holes: defaultHolesByPanel,
  })
  const currentHoles = holeTracker.key === canvasKey ? holeTracker.holes : defaultHolesByPanel

  // ── UI state ───────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  const [zoom, setZoom] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)

  // Context menu state (separate from visual selection)
  const [menuPanelId, setMenuPanelId] = useState<string | null>(null)
  const [menuPanelRect, setMenuPanelRect] = useState<PanelScreenRect | null>(null)

  const menuPanel = panels.find((p) => p.id === menuPanelId) ?? null
  const lShapeConfig = useMemo(() => inferLShapeConfig(panels), [panels])

  function handleSelectPanel(id: string | null, _rect?: PanelScreenRect) {
    setSelectedPanelId(id)
    // Close context menu when selecting different panel
    if (id !== menuPanelId) {
      setMenuPanelId(null)
      setMenuPanelRect(null)
    }
  }

  function handleRequestContextMenu(panelId: string, rect: PanelScreenRect) {
    setMenuPanelId(panelId)
    setMenuPanelRect(rect)
    setSelectedPanelId(panelId)
  }

  function handleCloseContextMenu() {
    setMenuPanelId(null)
    setMenuPanelRect(null)
  }

  // ── Saved snapshot ─────────────────────────────────────────────────────────
  const [savedId, setSavedId] = useState<string | null>(null)

  // ── Metrics & warnings ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (panels.length === 0) return null
    return computeMetricsFromPanels(panels)
  }, [panels])

  const warning = useMemo(() => {
    if (panels.length === 0) return null
    const wide = panels.find((p) => !p.isDoor && p.widthMm > 1500)
    if (wide) return `Панель ${wide.widthMm} мм — очень широкая`
    const narrow = panels.find((p) => !p.isDoor && p.widthMm < 200)
    if (narrow) return `Панель ${narrow.widthMm} мм — слишком узкая`
    return null
  }, [panels])

  // ── Apply form values from sheet ───────────────────────────────────────────
  function handleApply(values: MeasurementFormValues, customPanels?: Panel[]) {
    setFormValues(values)
    infoForm.reset(values)
    if (customPanels && customPanels.length > 0) {
      setPanels(customPanels.map((p, i) => ({ ...p, position: i })))
    } else {
      const m = Number(values.measureMm)
      const h = Number(values.heightMm)
      if (Number.isFinite(m) && Number.isFinite(h) && m >= 600 && m <= 3000 && h >= 1500 && h <= 2500) {
        setPanels(computeInitialPanels(m, h))
      } else {
        setPanels([])
      }
    }
    setSelectedPanelId(null)
    setMenuPanelId(null)
    setSavedId(null)
  }

  // ── Panel actions dispatcher ───────────────────────────────────────────────
  const handlePanelAction = useCallback((
    action:
      | 'resizeDoor'
      | 'resizePanel'
      | 'resizeHeight'
      | 'toggleHingeSide'
      | 'toggleMechanism'
      | 'moveDoorSide'
      | 'moveDoorToOtherWall'
      | 'convertToDoor',
    panelId: string,
    payload?: Record<string, unknown>,
  ) => {
    setPanels((prev) => {
      let next: Panel[]
      switch (action) {
        case 'resizeDoor':
          next = resizeDoor(prev, panelId, payload?.widthMm as number)
          break
        case 'resizePanel':
          next = resizePanel(prev, panelId, payload?.widthMm as number)
          break
        case 'resizeHeight':
          next = resizeHeight(prev, payload?.heightMm as number)
          break
        case 'toggleHingeSide':
          next = toggleHingeSide(prev, panelId)
          break
        case 'toggleMechanism':
          next = toggleMechanism(prev, panelId, payload?.mechanism as DoorMechanism)
          break
        case 'moveDoorSide':
          next = moveDoorSide(prev, panelId)
          break
        case 'moveDoorToOtherWall':
          next = lShapeConfig
            ? moveDoorToOtherWall(prev, panelId, lShapeConfig)
            : prev
          break
        case 'convertToDoor':
          next = convertToDoor(prev, panelId)
          break
        default:
          next = prev
      }
      // Sync holes for any panels whose properties changed
      const newHoles = syncHolesAfterPanelChange(next, prev, currentHoles)
      const newKey = next
        .map((p) => (p.isDoor && p.hingeSide ? `${p.widthMm}x${p.heightMm}h${p.hingeSide}` : `${p.widthMm}x${p.heightMm}`))
        .join('-')
      setHoleTracker({ key: newKey, holes: newHoles })
      return next
    })
    setSavedId(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lShapeConfig, currentHoles])

  // ── Legacy panel actions (from canvas drag) ────────────────────────────────
  function handlePanelsChange(newPanels: Panel[]) {
    setPanels(newPanels)
    setSavedId(null)
  }

  // ── Lead name lookup ───────────────────────────────────────────────────────
  const leadName = useMemo(() => {
    const id = formValues.leadId || leadIdFromUrl
    if (!id) return undefined
    return leads.find((l) => l.id === id)?.name
  }, [formValues.leadId, leadIdFromUrl, leads])

  // ── Save ───────────────────────────────────────────────────────────────────
  const isSaving = saveMutation.isPending || updateMutation.isPending
  const canSave = isEditMode
    ? panels.length > 0 && !isSaving
    : !!formValues.leadId && panels.length > 0 && !leadIneligible

  function handleSave() {
    const infoValues = infoForm.getValues()
    const merged = { ...formValues, deliveryTjs: infoValues.deliveryTjs, depositTjs: infoValues.depositTjs }
    const deliveryCostTjs = Number(merged.deliveryTjs) || 0
    const dealPriceTjs = (metrics?.masterFeeTjs ?? 0) + deliveryCostTjs

    const panelData = panels.map((p) => ({
      position:          p.position,
      widthMm:           p.widthMm,
      heightMm:          p.heightMm,
      isDoor:            p.isDoor,
      shape:             p.shape,
      setId:             p.setId ?? null,
      curvatureRadiusMm: p.curvatureRadiusMm ?? null,
      mechanism:         p.mechanism ?? null,
      hingeSide:         p.hingeSide ?? null,
    }))
    const holeData = flattenHoles(currentHoles)

    const onSuccess = (id: string) => {
      setSavedId(id)
      localStorage.removeItem(storageKey)
      localStorage.removeItem(`${storageKey}_lshape`)
      localStorage.removeItem(`${storageKey}_cabintype`)
      toast.success('Замер сохранён')
      if (leadIdFromUrl || isEditMode) navigate(-1)
    }
    const onError = () => toast.error('Ошибка сохранения. Попробуйте ещё раз.')

    if (isEditMode && measurementIdFromUrl) {
      updateMutation.mutate(
        {
          id: measurementIdFromUrl,
          request: {
            product:         merged.product || null,
            measureMm:       merged.measureMm,
            heightMm:        merged.heightMm,
            glassColor:      merged.glassColor,
            hardwareColor:   merged.hardwareColor,
            dealPriceTjs:    dealPriceTjs > 0 ? dealPriceTjs : null,
            deliveryCostTjs: deliveryCostTjs > 0 ? deliveryCostTjs : null,
            panels:          panelData,
            holes:           holeData,
          },
        },
        { onSuccess: (data) => onSuccess(data.id), onError },
      )
    } else {
      saveMutation.mutate(
        {
          leadId:          merged.leadId,
          product:         merged.product || null,
          measureMm:       merged.measureMm,
          heightMm:        merged.heightMm,
          glassColor:      merged.glassColor,
          hardwareColor:   merged.hardwareColor,
          dealPriceTjs:    dealPriceTjs > 0 ? dealPriceTjs : null,
          deliveryCostTjs: deliveryCostTjs > 0 ? deliveryCostTjs : null,
          panels:          panelData,
          holes:           holeData,
        },
        { onSuccess: (data) => onSuccess(data.id), onError },
      )
    }
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
      <Toaster richColors position="top-right" />

      <DesignerTopBar
        leadName={leadName}
        canSave={canSave}
        isSaving={isSaving}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBack={() => navigate(-1)}
        onSave={handleSave}
      />

      <div className="relative flex-1 overflow-hidden" data-testid="canvas-area">
        {panels.length > 0 ? (
          viewMode === '3d' ? (
            <ThreeCanvas panels={panels} holesByPanel={currentHoles} />
          ) : (
            <DrawingCanvas
              key={canvasKey}
              panels={panels}
              holesByPanel={currentHoles}
              cabinHeightMm={cabinHeightMm}
              zoom={zoom}
              onZoomChange={setZoom}
              onHolesChange={(holes) => setHoleTracker({ key: canvasKey, holes })}
              onPanelsChange={handlePanelsChange}
              selectedPanelId={selectedPanelId}
              onSelectPanel={handleSelectPanel}
              onRequestContextMenu={handleRequestContextMenu}
              className="h-full w-full"
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-base">Введите параметры замера</p>
              <p className="mt-1 text-sm">Нажмите ⚙ чтобы открыть форму</p>
            </div>
          </div>
        )}

        {/* Info card — 2D only */}
        {viewMode === '2d' && (
          <DesignerInfoCard
            areaSqM={metrics?.areaSqM ?? null}
            masterFeeTjs={metrics?.masterFeeTjs ?? null}
            form={infoForm}
            warning={warning}
          />
        )}

        {/* Zoom controls — 2D only */}
        {viewMode === '2d' && (
          <DesignerZoomControls
            zoom={zoom}
            onChange={setZoom}
            onFit={() => setZoom(1)}
          />
        )}

        {/* FAB */}
        <DesignerFab onClick={() => setSheetOpen(true)} />

        {/* Panel context menu — 2D only */}
        {viewMode === '2d' && menuPanel && menuPanelRect && (
          <PanelContextMenu
            panel={menuPanel}
            allPanels={panels}
            rect={menuPanelRect}
            lShapeConfig={lShapeConfig}
            onAction={handlePanelAction}
            onClose={handleCloseContextMenu}
          />
        )}

        {/* PDF download buttons */}
        {savedId && !leadIdFromUrl && (
          <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 rounded-xl border border-border bg-white/90 p-3 shadow-md backdrop-blur dark:bg-neutral-900/90">
            <p className="text-xs font-medium text-green-600 dark:text-green-400">Замер сохранён ✓</p>
            <button
              type="button"
              onClick={() => void downloadMeasurementPdf(savedId, 'a4')}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              Скачать PDF (A4)
            </button>
            <button
              type="button"
              onClick={() => void downloadMeasurementPdf(savedId, 'a3')}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              Скачать PDF (A3)
            </button>
          </div>
        )}

        {/* Ineligible lead warning */}
        {leadIneligible && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 shadow-md dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <p className="font-medium">Лид не в подходящем статусе</p>
            <button onClick={() => navigate(-1)} className="mt-1 text-xs underline">
              ← Назад к лиду
            </button>
          </div>
        )}
      </div>

      <DesignerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        values={formValues}
        disableLeadSelector={!!leadIdFromUrl}
        storageKey={storageKey}
        lshapeInit={lshapeInit}
        onApply={handleApply}
      />
    </div>
  )
}
