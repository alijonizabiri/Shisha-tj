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

  // Prefill lead selector when coming from drawer
  useEffect(() => {
    if (leadIdFromUrl) {
      form.setValue('leadId', leadIdFromUrl, { shouldValidate: false })
    }
  }, [leadIdFromUrl, form])

  // Ineligible: URL has a leadId but it's not in eligible leads after loading
  const leadIneligible =
    !!leadIdFromUrl && !leadsLoading && !leads.some((l) => l.id === leadIdFromUrl)

  const saveMutation = useSaveMeasurement()

  // useWatch instead of form.watch() — compatible with the React Compiler
  const measureMm = useWatch({ control: form.control, name: 'measureMm' })
  const heightMm  = useWatch({ control: form.control, name: 'heightMm' })

  const panels: Panel[] = useMemo(() => {
    const m = typeof measureMm === 'number' ? measureMm : Number(measureMm)
    const h = typeof heightMm  === 'number' ? heightMm  : Number(heightMm)
    if (!Number.isFinite(m) || !Number.isFinite(h)) return []
    if (m < 600 || m > 3000 || h < 1500 || h > 2500) return []
    return computeInitialPanels(m, h)
  }, [measureMm, heightMm])

  const holesByPanel = useMemo(
    () => panels.map((p) => defaultHoles(p, p.heightMm)),
    [panels],
  )

  const canvasKey = panels.map((p) => `${p.widthMm}x${p.heightMm}`).join('-')

  // Hole tracker — keyed by canvasKey so dragged positions reset when panels resize.
  const [holeTracker, setHoleTracker] = useState<{ key: string; holes: Hole[][] }>({
    key: canvasKey,
    holes: holesByPanel,
  })
  const currentHoles = holeTracker.key === canvasKey ? holeTracker.holes : holesByPanel

  // Snapshot of what was last saved — null when form diverges from last save
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

          {/* Ineligible lead banner */}
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

          {/* Show inline success only when NOT navigating back (no leadIdFromUrl) */}
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
              holesByPanel={holesByPanel}
              onHolesChange={(holes) => setHoleTracker({ key: canvasKey, holes })}
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
