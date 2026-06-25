import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { List } from 'lucide-react'
import { useMeasurementKanban, usePatchMeasurementStatus, type MeasurementKanbanItem } from '@/features/measurements/api'
import { KanbanColumn } from './components/KanbanColumn'
import { MeasurementCard } from './components/MeasurementCard'
import { NewLeadDialog } from './components/NewLeadDialog'
import { RefuseMeasurementDialog } from './components/RefuseMeasurementDialog'
import { LEAD_STATUS_META } from './lib/leadStatuses'
import { Button } from '@/shared/ui/button'

interface PendingTransition {
  measurementId: string
  measurementTitle: string
  targetStatus: 'Refused'
}

const COLUMN_ORDER = Object.keys(LEAD_STATUS_META)

export function LeadsKanbanPage() {
  const { data, isLoading, isError } = useMeasurementKanban()
  const patchStatus = usePatchMeasurementStatus()
  const navigate = useNavigate()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingTransition | null>(null)
  const [newLeadOpen, setNewLeadOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const columnMap: Record<string, MeasurementKanbanItem[]> = {}
  for (const status of COLUMN_ORDER) columnMap[status] = []
  if (data) {
    for (const col of data.columns) {
      columnMap[col.status] = col.items
    }
  }

  const activeItem = activeId
    ? Object.values(columnMap).flat().find((m) => m.id === activeId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
    setDragError(null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const measurementId = String(active.id)
    const targetStatus = String(over.id)

    const item = Object.values(columnMap).flat().find((m) => m.id === measurementId)
    if (!item || item.status === targetStatus) return

    if (targetStatus === 'Refused') {
      setPending({ measurementId, measurementTitle: item.leadName, targetStatus })
      return
    }

    try {
      await patchStatus.mutateAsync({ id: measurementId, body: { status: targetStatus } })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string; title?: string } } })
        ?.response?.data
      if (status === 409) {
        setDragError(detail?.detail ?? 'Этот переход запрещён')
      } else if (status === 400) {
        setDragError(detail?.title ?? 'Требуются дополнительные данные')
      } else {
        setDragError('Ошибка сервера. Попробуйте снова.')
      }
    }
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Загрузка…</div>
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-destructive">
        Ошибка загрузки. Попробуйте обновить страницу.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <h1 className="text-2xl font-semibold">Канбан</h1>
        <div className="flex items-center gap-2">
          {dragError && (
            <p className="text-sm text-destructive hidden sm:block">{dragError}</p>
          )}
          <Link
            to="/leads"
            className="inline-flex items-center h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <List className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Таблица</span>
          </Link>
          <Button onClick={() => setNewLeadOpen(true)}>+ Новый лид</Button>
        </div>
      </div>
      {dragError && (
        <p className="text-sm text-destructive sm:hidden">{dragError}</p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              items={columnMap[status] ?? []}
              onSelect={(leadId) => navigate(`/leads/${leadId}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem ? <MeasurementCard item={activeItem} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <NewLeadDialog open={newLeadOpen} onClose={() => setNewLeadOpen(false)} />

      <RefuseMeasurementDialog
        open={pending?.targetStatus === 'Refused'}
        measurementId={pending?.measurementId ?? ''}
        title={pending?.measurementTitle ?? ''}
        onClose={() => setPending(null)}
      />
    </div>
  )
}
