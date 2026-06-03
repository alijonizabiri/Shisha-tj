import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { computeMetrics, computePanels } from './lib/computePanels'
import { defaultHoles } from './lib/defaultHoles'
import type { Hole } from './lib/types'
import { measurementFormSchema, type MeasurementFormValues } from './schemas'
import { downloadMeasurementPdf, useSaveMeasurement, type HoleRequest } from './api'
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
  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    mode: 'onBlur',
    defaultValues: {
      measureMm: '' as unknown as number,
      heightMm: 2000,
      configuration: 'TwoGlass',
      glassColor: 'Transparent',
      hardwareColor: 'BlackMatte',
      clientName: '',
      clientPhone: '',
      clientAddress: '',
      deliveryTjs: 100,
      depositTjs: 0,
    },
  })

  const saveMutation = useSaveMeasurement()
  const [savedId, setSavedId] = useState<string | null>(null)

  const measureMm = form.watch('measureMm')
  const heightMm = form.watch('heightMm')
  const configuration = form.watch('configuration')

  // Clear the saved state when drawing parameters change
  useEffect(() => {
    setSavedId(null)
  }, [measureMm, heightMm, configuration])

  const panels = useMemo(() => {
    const m = typeof measureMm === 'number' ? measureMm : Number(measureMm)
    const h = typeof heightMm === 'number' ? heightMm : Number(heightMm)
    if (!Number.isFinite(m) || !Number.isFinite(h)) return []
    if (m < 600 || m > 3000 || h < 1500 || h > 2500) return []
    return computePanels(m, h, configuration)
  }, [measureMm, heightMm, configuration])

  const holesByPanel = useMemo(
    () => panels.map((p) => defaultHoles(p, p.heightMm)),
    [panels],
  )

  // Track current hole positions; reset whenever panels change (DrawingCanvas remounts)
  const [currentHoles, setCurrentHoles] = useState<Hole[][]>(holesByPanel)
  useEffect(() => {
    setCurrentHoles(holesByPanel)
  }, [holesByPanel])

  const metrics = useMemo(() => {
    const m = typeof measureMm === 'number' ? measureMm : Number(measureMm)
    const h = typeof heightMm === 'number' ? heightMm : Number(heightMm)
    if (!Number.isFinite(m) || !Number.isFinite(h) || m < 600 || m > 3000 || h < 1500 || h > 2500) {
      return null
    }
    return computeMetrics(m, h)
  }, [measureMm, heightMm])

  const warning = useMemo(() => {
    if (panels.length === 0) return null
    if (configuration === 'TwoGlass') {
      const fixed = panels.find((p) => !p.isDoor)
      if (fixed && fixed.widthMm > 1500) return `Глухая панель ${fixed.widthMm} мм — очень широкая`
    } else {
      const narrow = panels.filter((p) => !p.isDoor).find((s) => s.widthMm < 200)
      if (narrow) return `Боковая панель ${narrow.widthMm} мм — слишком узкая`
    }
    return null
  }, [panels, configuration])

  // Key forces DrawingCanvas to remount (and reset hole positions) when panel sizes change
  const canvasKey = panels.map((p) => `${p.widthMm}x${p.heightMm}`).join('-')

  function handleSave(values: MeasurementFormValues): void {
    saveMutation.mutate(
      {
        measureMm: values.measureMm,
        heightMm: values.heightMm,
        configuration: values.configuration,
        glassColor: values.glassColor,
        hardwareColor: values.hardwareColor,
        holes: flattenHoles(currentHoles),
      },
      { onSuccess: (data) => setSavedId(data.id) },
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-card">
        <div className="p-4">
          <h1 className="mb-4 text-lg font-semibold">Дизайнер</h1>
          <MeasurementForm
            form={form}
            onSubmit={handleSave}
            isLoading={saveMutation.isPending}
          />

          {saveMutation.isError && (
            <p className="mt-2 text-sm text-destructive">Ошибка сохранения. Попробуйте ещё раз.</p>
          )}

          {savedId && (
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

      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        {warning && (
          <div
            role="alert"
            className="m-4 mb-0 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
          >
            {warning}
          </div>
        )}
        <div className="flex-1 overflow-auto p-4">
          {panels.length > 0 ? (
            <DrawingCanvas
              key={canvasKey}
              panels={panels}
              holesByPanel={holesByPanel}
              onHolesChange={setCurrentHoles}
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
