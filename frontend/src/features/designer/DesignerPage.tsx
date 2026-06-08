import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { computeInitialPanels, computeMetrics } from './lib/computePanels'
import { defaultHoles } from './lib/defaultHoles'
import type { Hole, Panel } from './lib/types'
import { measurementFormSchema, type MeasurementFormValues } from './schemas'
import { downloadMeasurementPdf, useDesignerLeads, useSaveMeasurement, type HoleRequest } from './api'
import { CalculationSidebar } from './components/CalculationSidebar'
import { DrawingCanvas } from './components/DrawingCanvas'
import { MeasurementForm } from './components/MeasurementForm'
import { Button } from '@/shared/ui/button'

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

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    mode: 'onBlur',
    defaultValues: {
      leadId:        '',
      measureMm:     '' as unknown as number,
      heightMm:      2000,
      glassColor:    'Transparent',
      hardwareColor: 'BlackMatte',
      deliveryTjs:   100,
      depositTjs:    0,
    },
  })

  useEffect(() => {
    if (leadIdFromUrl) {
      form.setValue('leadId', leadIdFromUrl, { shouldValidate: false })
    }
  }, [leadIdFromUrl, form])

  const leadIneligible =
    !!leadIdFromUrl && !leadsLoading && !leads.some((l) => l.id === leadIdFromUrl)

  const saveMutation = useSaveMeasurement()

  const measureMm = useWatch({ control: form.control, name: 'measureMm' })
  const heightMm  = useWatch({ control: form.control, name: 'heightMm' })

  // ── Auto-computed panel layout (from form dimensions) ──────────────────────

  const autoComputed = useMemo(() => {
    const m = typeof measureMm === 'number' ? measureMm : Number(measureMm)
    const h = typeof heightMm  === 'number' ? heightMm  : Number(heightMm)
    if (!Number.isFinite(m) || !Number.isFinite(h)) return []
    if (m < 600 || m > 3000 || h < 1500 || h > 2500) return []
    return computeInitialPanels(m, h)
  }, [measureMm, heightMm])

  const autoComputedKey = autoComputed.map((p) => `${p.widthMm}-${p.heightMm}`).join('|')

  // ── Panel state (mutable by the user) ─────────────────────────────────────

  const [panels, setPanels] = useState<Panel[]>([])
  const [panelsEdited, setPanelsEdited] = useState(false)
  const [showResetWarning, setShowResetWarning] = useState(false)
  const [pendingAutoComputed, setPendingAutoComputed] = useState<Panel[]>([])

  // Derived-state sync: update panels when autoComputed changes.
  // Using the "setState during render" pattern (React docs: Storing information
  // from previous renders) — concurrent-mode safe and synchronous (no flicker).
  const [prevAutoComputedKey, setPrevAutoComputedKey] = useState(autoComputedKey)
  if (prevAutoComputedKey !== autoComputedKey) {
    setPrevAutoComputedKey(autoComputedKey)
    if (autoComputed.length === 0) {
      if (panels.length > 0)  setPanels([])
      if (panelsEdited)       setPanelsEdited(false)
      if (showResetWarning)   setShowResetWarning(false)
    } else if (!panelsEdited) {
      setPanels(autoComputed)
    } else {
      // User has manual edits — ask before overwriting
      setShowResetWarning(true)
      setPendingAutoComputed(autoComputed)
    }
  }

  // ── Cabin height ───────────────────────────────────────────────────────────

  const rawH = typeof heightMm === 'number' ? heightMm : Number(heightMm)
  const cabinHeightMm = Number.isFinite(rawH) && rawH >= 1500 && rawH <= 2500 ? rawH : 2000

  // ── Panel edit handlers ────────────────────────────────────────────────────

  function markEdited() {
    setPanelsEdited(true)
    setSavedSnapshot(null)
  }

  function handlePanelsChange(newPanels: Panel[]) {
    setPanels(newPanels)
    markEdited()
  }

  function handleSplitPanel(panelIdx: number) {
    const panel = panels[panelIdx]
    if (panel.isDoor || panel.widthMm < 400) return
    const half1 = Math.round(panel.widthMm / 2)
    const half2 = panel.widthMm - half1
    const newPanels = [
      ...panels.slice(0, panelIdx),
      { ...panel, widthMm: half1 },
      { widthMm: half2, heightMm: panel.heightMm, isDoor: false, position: 0 },
      ...panels.slice(panelIdx + 1),
    ].map((p, i) => ({ ...p, position: i }))
    setPanels(newPanels)
    markEdited()
  }

  function handleToggleDoor(panelIdx: number) {
    const willBeDoor = !panels[panelIdx].isDoor
    const newPanels = panels.map((p, i) => {
      if (i === panelIdx) {
        const widthMm = willBeDoor
          ? Math.min(800, Math.max(500, p.widthMm))
          : p.widthMm
        return { ...p, isDoor: willBeDoor, widthMm }
      }
      // Demote the existing door when another panel becomes a door
      if (willBeDoor && p.isDoor) return { ...p, isDoor: false }
      return p
    })
    setPanels(newPanels)
    markEdited()
  }

  function handleConfirmReset() {
    setPanels(pendingAutoComputed)
    setPanelsEdited(false)
    setShowResetWarning(false)
  }

  function handleKeepPanels() {
    setShowResetWarning(false)
  }

  // ── Holes ──────────────────────────────────────────────────────────────────

  const holesByPanel = useMemo(
    () => panels.map((p) => defaultHoles(p, p.heightMm)),
    [panels],
  )

  const canvasKey = panels.map((p) => `${p.widthMm}x${p.heightMm}`).join('-')

  const [holeTracker, setHoleTracker] = useState<{ key: string; holes: Hole[][] }>({
    key: canvasKey,
    holes: holesByPanel,
  })
  const currentHoles = holeTracker.key === canvasKey ? holeTracker.holes : holesByPanel

  // ── Saved snapshot ─────────────────────────────────────────────────────────

  const [savedSnapshot, setSavedSnapshot] = useState<{
    id: string
    measureMm: unknown
    heightMm: unknown
  } | null>(null)

  const savedId =
    savedSnapshot !== null &&
    savedSnapshot.measureMm === measureMm &&
    savedSnapshot.heightMm === heightMm
      ? savedSnapshot.id
      : null

  // ── Metrics & warnings ─────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const m = typeof measureMm === 'number' ? measureMm : Number(measureMm)
    const h = typeof heightMm  === 'number' ? heightMm  : Number(heightMm)
    if (!Number.isFinite(m) || !Number.isFinite(h) || m < 600 || m > 3000 || h < 1500 || h > 2500) {
      return null
    }
    return computeMetrics(m, h)
  }, [measureMm, heightMm])

  const warning = useMemo(() => {
    if (panels.length === 0) return null
    const wide = panels.find((p) => !p.isDoor && p.widthMm > 1500)
    if (wide) return `Глухая панель ${wide.widthMm} мм — очень широкая`
    const narrow = panels.find((p) => !p.isDoor && p.widthMm < 200)
    if (narrow) return `Глухая панель ${narrow.widthMm} мм — слишком узкая`
    return null
  }, [panels])

  // ── Save ───────────────────────────────────────────────────────────────────

  function handleSave(values: MeasurementFormValues): void {
    saveMutation.mutate(
      {
        leadId:        values.leadId,
        measureMm:     values.measureMm,
        heightMm:      values.heightMm,
        glassColor:    values.glassColor,
        hardwareColor: values.hardwareColor,
        panels:        panels.map((p) => ({
          position: p.position,
          widthMm:  p.widthMm,
          heightMm: p.heightMm,
          isDoor:   p.isDoor,
        })),
        holes: flattenHoles(currentHoles),
      },
      {
        onSuccess: (data) => {
          setSavedSnapshot({
            id: data.id,
            measureMm: values.measureMm,
            heightMm:  values.heightMm,
          })
          if (leadIdFromUrl) {
            toast.success('Замер сохранён')
            navigate(-1)
          }
        },
      },
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-card">
        <div className="p-4">
          <h1 className="mb-4 text-lg font-semibold">Дизайнер</h1>

          {leadIneligible && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
            >
              <p className="font-medium">Лид не в подходящем статусе</p>
              <p className="mt-1 text-xs">
                Замер можно создать только для лидов в статусах: Замер, Покупает, Заказ на завод, Стекло пришло.
              </p>
              <button
                onClick={() => navigate(-1)}
                className="mt-2 text-xs font-medium underline hover:no-underline"
              >
                ← Назад к лиду
              </button>
            </div>
          )}

          <MeasurementForm
            form={form}
            onSubmit={handleSave}
            isLoading={saveMutation.isPending}
            disableLeadSelector={!!leadIdFromUrl}
          />

          {saveMutation.isError && (
            <p className="mt-2 text-sm text-destructive">Ошибка сохранения. Попробуйте ещё раз.</p>
          )}

          {savedId && !leadIdFromUrl && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Замер сохранён ✓
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void downloadMeasurementPdf(savedId, 'a4')}
              >
                Скачать PDF (A4)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void downloadMeasurementPdf(savedId, 'a3')}
              >
                Скачать PDF (A3)
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Width-change warning after manual panel edits */}
        {showResetWarning && (
          <div
            role="alert"
            className="m-4 mb-0 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200"
          >
            <p className="font-medium">Размеры кабины изменены</p>
            <p className="mt-1 text-xs">Раскладка будет пересчитана. Ручные правки будут потеряны.</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleConfirmReset}
                className="rounded bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-700"
              >
                Пересчитать
              </button>
              <button
                onClick={handleKeepPanels}
                className="rounded border border-orange-400 px-3 py-1 text-xs font-medium text-orange-800 hover:bg-orange-100 dark:text-orange-200"
              >
                Оставить
              </button>
            </div>
          </div>
        )}

        {/* Panel width warning */}
        {warning && (
          <div
            role="alert"
            className="m-4 mb-0 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
          >
            {warning}
          </div>
        )}

        <div className="flex-1 min-h-0 p-4">
          {panels.length > 0 ? (
            <DrawingCanvas
              key={canvasKey}
              panels={panels}
              holesByPanel={currentHoles}
              cabinHeightMm={cabinHeightMm}
              onHolesChange={(holes) => setHoleTracker({ key: canvasKey, holes })}
              onPanelsChange={handlePanelsChange}
              onSplitPanel={handleSplitPanel}
              onToggleDoor={handleToggleDoor}
              className="h-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-base">Введите ширину проёма</p>
                <p className="mt-1 text-sm">600 – 3000 мм</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <CalculationSidebar
        areaSqM={metrics?.areaSqM ?? null}
        masterFeeTjs={metrics?.masterFeeTjs ?? null}
        form={form}
      />
    </div>
  )
}
