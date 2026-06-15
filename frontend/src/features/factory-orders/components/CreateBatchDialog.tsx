import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMeasurementKanban, type MeasurementKanbanItem } from '@/features/measurements/api'
import { useCreateBatchOrder } from '../api'
import { Button } from '@/shared/ui/button'

interface Props {
  onClose: () => void
}

// Rendered conditionally in parent — state resets automatically on each mount
export function CreateBatchDialog({ onClose }: Props) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: kanban, isLoading } = useMeasurementKanban()
  const createBatch = useCreateBatchOrder()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const buyingMeasurements: MeasurementKanbanItem[] =
    kanban?.columns.find((c) => c.status === 'Buying')?.items ?? []

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === buyingMeasurements.length) setSelected(new Set())
    else setSelected(new Set(buyingMeasurements.map((m) => m.id)))
  }

  async function handleSubmit() {
    if (selected.size === 0) return
    try {
      const order = await createBatch.mutateAsync([...selected])
      onClose()
      navigate(`/factory-orders/${order.id}`)
    } catch {
      // error shown below
    }
  }

  const allSelected = buyingMeasurements.length > 0 && selected.size === buyingMeasurements.length

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold">Создать партию</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col overflow-y-auto">
          <p className="px-5 pt-4 text-sm text-muted-foreground">
            Выберите замеры в статусе «Покупает» — их стёкла войдут в одну партию на завод.
          </p>

          {isLoading && (
            <p className="px-5 py-6 text-sm text-muted-foreground">Загрузка…</p>
          )}

          {!isLoading && buyingMeasurements.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Нет замеров в статусе «Покупает».
            </p>
          )}

          {buyingMeasurements.length > 0 && (
            <div className="mt-3 border-y border-border divide-y divide-border">
              {/* Select all */}
              <label className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm font-medium">Все ({buyingMeasurements.length})</span>
              </label>

              {buyingMeasurements.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="h-4 w-4 rounded border-input shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.leadName}</p>
                    <p className="text-xs text-muted-foreground">{m.product}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {m.measureMm} × {m.heightMm} мм
                  </span>
                </label>
              ))}
            </div>
          )}

          {createBatch.isError && (
            <p className="px-5 py-2 text-sm text-destructive">
              {createBatch.error instanceof Error
                ? createBatch.error.message
                : 'Ошибка создания партии. Некоторые стёкла уже в активном заказе.'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selected.size === 0 || createBatch.isPending}
            className="flex-1"
          >
            {createBatch.isPending
              ? 'Создание…'
              : `Создать (${selected.size} замер${selected.size !== 1 ? 'а' : ''})`}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
