import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { computePanels } from './lib/computePanels'
import { defaultHoles } from './lib/defaultHoles'
import { measurementFormSchema, type MeasurementFormValues } from './schemas'
import { DrawingCanvas } from './components/DrawingCanvas'
import { MeasurementForm } from './components/MeasurementForm'

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
    },
  })

  const measureMm = form.watch('measureMm')
  const heightMm = form.watch('heightMm')
  const configuration = form.watch('configuration')

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

  function handleSave(_values: MeasurementFormValues): void {
    // wired to backend in Step 11
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-card">
        <div className="p-4">
          <h1 className="mb-4 text-lg font-semibold">Дизайнер</h1>
          <MeasurementForm form={form} onSubmit={handleSave} />
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
            <DrawingCanvas key={canvasKey} panels={panels} holesByPanel={holesByPanel} />
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
    </div>
  )
}
