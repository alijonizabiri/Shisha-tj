import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast, Toaster } from 'sonner'
import { computeInitialPanels, computeMetrics } from './lib/computePanels'
import { defaultHoles } from './lib/defaultHoles'
import type { Hole, Panel } from './lib/types'
import { measurementFormSchema, type MeasurementFormValues } from './schemas'
import { downloadMeasurementPdf, useDesignerLeads, useSaveMeasurement, type HoleRequest } from './api'
import { DrawingCanvas, type PanelScreenRect } from './components/DrawingCanvas'
import { DesignerTopBar } from './components/DesignerTopBar'
import { DesignerInfoCard } from './components/DesignerInfoCard'
import { DesignerZoomControls } from './components/DesignerZoomControls'
import { DesignerFab } from './components/DesignerFab'
import { DesignerSheet } from './components/DesignerSheet'
import { GlassContextPopover } from './components/GlassContextPopover'

const DEFAULT_FORM_VALUES: MeasurementFormValues = {
  leadId:        '',
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

export function DesignerPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const leadIdFromUrl = searchParams.get('leadId')

  const { data: leads = [], isLoading: leadsLoading } = useDesignerLeads()

  const initialLeadId = leadIdFromUrl ?? ''

  // ── Form state for the info card (delivery/deposit inputs) ─────────────────
  // Separate from the sheet form; this form persists across sheet open/close.
  const infoForm = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    mode: 'onBlur',
    defaultValues: { ...DEFAULT_FORM_VALUES, leadId: initialLeadId },
  })

  // ── Applied measurement values (only update on sheet "Применить") ──────────
  const [formValues, setFormValues] = useState<MeasurementFormValues>(() => ({
    ...DEFAULT_FORM_VALUES,
    leadId: initialLeadId,
  }))

  const leadIneligible =
    !!leadIdFromUrl && !leadsLoading && !leads.some((l) => l.id === leadIdFromUrl)

  const saveMutation = useSaveMeasurement()

  // ── Panel state ────────────────────────────────────────────────────────────

  const [panels, setPanels] = useState<Panel[]>([])

  const cabinHeightMm = useMemo(() => {
    const h = Number(formValues.heightMm)
    return Number.isFinite(h) && h >= 1500 && h <= 2500 ? h : 2000
  }, [formValues.heightMm])

  // ── Holes ──────────────────────────────────────────────────────────────────

  const defaultHolesByPanel = useMemo(
    () => panels.map((p) => defaultHoles(p, p.heightMm)),
    [panels],
  )
  const canvasKey = panels.map((p) => `${p.widthMm}x${p.heightMm}`).join('-')
  const [holeTracker, setHoleTracker] = useState<{ key: string; holes: Hole[][] }>({
    key: canvasKey,
    holes: defaultHolesByPanel,
  })
  const currentHoles = holeTracker.key === canvasKey ? holeTracker.holes : defaultHolesByPanel

  // ── UI state ───────────────────────────────────────────────────────────────

  const [zoom, setZoom] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [selectedPanelRect, setSelectedPanelRect] = useState<PanelScreenRect | null>(null)

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null

  function handleSelectPanel(id: string | null, rect?: PanelScreenRect) {
    setSelectedPanelId(id)
    setSelectedPanelRect(rect ?? null)
  }

  // ── Saved snapshot ─────────────────────────────────────────────────────────

  const [savedId, setSavedId] = useState<string | null>(null)

  // ── Metrics & warnings ─────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const m = Number(formValues.measureMm)
    const h = Number(formValues.heightMm)
    if (!Number.isFinite(m) || !Number.isFinite(h) || m < 600 || m > 3000 || h < 1500 || h > 2500)
      return null
    return computeMetrics(m, h)
  }, [formValues.measureMm, formValues.heightMm])

  const warning = useMemo(() => {
    if (panels.length === 0) return null
    const wide = panels.find((p) => !p.isDoor && p.widthMm > 1500)
    if (wide) return `Панель ${wide.widthMm} мм — очень широкая`
    const narrow = panels.find((p) => !p.isDoor && p.widthMm < 200)
    if (narrow) return `Панель ${narrow.widthMm} мм — слишком узкая`
    return null
  }, [panels])

  // ── Apply form values from sheet ───────────────────────────────────────────

  function handleApply(values: MeasurementFormValues) {
    setFormValues(values)
    infoForm.reset(values)
    const m = Number(values.measureMm)
    const h = Number(values.heightMm)
    if (Number.isFinite(m) && Number.isFinite(h) && m >= 600 && m <= 3000 && h >= 1500 && h <= 2500) {
      setPanels(computeInitialPanels(m, h))
    } else {
      setPanels([])
    }
    setSelectedPanelId(null)
    setSavedId(null)
  }

  // ── Panel actions (from popover) ───────────────────────────────────────────

  function handleToggleDoor() {
    if (!selectedPanel) return
    const willBeDoor = !selectedPanel.isDoor
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id === selectedPanel.id) {
          const widthMm = willBeDoor ? Math.min(800, Math.max(500, p.widthMm)) : p.widthMm
          return { ...p, isDoor: willBeDoor, widthMm }
        }
        if (willBeDoor && p.isDoor) return { ...p, isDoor: false }
        return p
      }),
    )
    setSavedId(null)
  }

  function handleSplitPanel() {
    if (!selectedPanel || selectedPanel.isDoor || selectedPanel.widthMm < 400) return
    const half1 = Math.round(selectedPanel.widthMm / 2)
    const half2 = selectedPanel.widthMm - half1
    setPanels((prev) => {
      const idx = prev.findIndex((p) => p.id === selectedPanel.id)
      if (idx === -1) return prev
      const next = [
        ...prev.slice(0, idx),
        { ...prev[idx], widthMm: half1 },
        { id: crypto.randomUUID(), widthMm: half2, heightMm: selectedPanel.heightMm, isDoor: false, position: 0 },
        ...prev.slice(idx + 1),
      ].map((p, i) => ({ ...p, position: i }))
      return next
    })
    setSavedId(null)
  }

  function handleDeletePanel() {
    if (!selectedPanel || panels.length <= 1) return
    setPanels((prev) =>
      prev.filter((p) => p.id !== selectedPanel.id).map((p, i) => ({ ...p, position: i })),
    )
    setSavedId(null)
  }

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

  const canSave = !!formValues.leadId && panels.length > 0 && !leadIneligible

  function handleSave() {
    infoForm.handleSubmit((infoValues) => {
      const merged = { ...formValues, deliveryTjs: infoValues.deliveryTjs, depositTjs: infoValues.depositTjs }
      saveMutation.mutate(
        {
          leadId:        merged.leadId,
          measureMm:     merged.measureMm,
          heightMm:      merged.heightMm,
          glassColor:    merged.glassColor,
          hardwareColor: merged.hardwareColor,
          panels: panels.map((p) => ({
            position: p.position,
            widthMm:  p.widthMm,
            heightMm: p.heightMm,
            isDoor:   p.isDoor,
          })),
          holes: flattenHoles(currentHoles),
        },
        {
          onSuccess: (data) => {
            setSavedId(data.id)
            if (leadIdFromUrl) {
              toast.success('Замер сохранён')
              navigate(-1)
            } else {
              toast.success('Замер сохранён')
            }
          },
          onError: () => toast.error('Ошибка сохранения. Попробуйте ещё раз.'),
        },
      )
    })()
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
      <Toaster richColors position="top-right" />

      {/* ── Top bar ── */}
      <DesignerTopBar
        leadName={leadName}
        canSave={canSave}
        isSaving={saveMutation.isPending}
        onBack={() => navigate(-1)}
        onSave={handleSave}
      />

      {/* ── Canvas area (fills remaining height) ── */}
      <div
        className="relative flex-1 overflow-hidden"
        data-testid="canvas-area"
      >
        {panels.length > 0 ? (
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
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-base">Введите параметры замера</p>
              <p className="mt-1 text-sm">Нажмите ⚙ чтобы открыть форму</p>
            </div>
          </div>
        )}

        {/* ── Floating: info card ── */}
        <DesignerInfoCard
          areaSqM={metrics?.areaSqM ?? null}
          masterFeeTjs={metrics?.masterFeeTjs ?? null}
          form={infoForm}
          warning={warning}
        />

        {/* ── Floating: zoom controls ── */}
        <DesignerZoomControls
          zoom={zoom}
          onChange={setZoom}
          onFit={() => setZoom(1)}
        />

        {/* ── Floating: FAB ── */}
        <DesignerFab onClick={() => setSheetOpen(true)} />

        {/* ── Glass context popover ── */}
        {selectedPanel && selectedPanelRect && (
          <GlassContextPopover
            panel={selectedPanel}
            allPanels={panels}
            rect={selectedPanelRect}
            onToggleDoor={handleToggleDoor}
            onSplit={handleSplitPanel}
            onDelete={handleDeletePanel}
            onClose={() => setSelectedPanelId(null)}
          />
        )}

        {/* ── PDF download buttons (after save, no leadId in URL) ── */}
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

      {/* ── Bottom sheet / side drawer with form ── */}
      <DesignerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        values={formValues}
        disableLeadSelector={!!leadIdFromUrl}
        onApply={handleApply}
      />
    </div>
  )
}
