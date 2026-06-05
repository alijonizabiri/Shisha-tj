import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { useKanban, usePatchLeadStatus, type Lead } from './api'
import { KanbanColumn } from './components/KanbanColumn'
import { LeadCard } from './components/LeadCard'
import { RefuseLeadDialog } from './components/RefuseLeadDialog'
import { SetDealPriceDialog } from './components/SetDealPriceDialog'
import { LEAD_STATUS_META } from './lib/leadStatuses'

interface PendingTransition {
  leadId: string
  leadName: string
  targetStatus: 'Buying' | 'Refused'
}

// Ordered list of status keys for column display
const COLUMN_ORDER = Object.keys(LEAD_STATUS_META)

export function LeadsKanbanPage() {
  const { data, isLoading, isError } = useKanban()
  const patchStatus = usePatchLeadStatus()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingTransition | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Build a lookup: status → leads (using server data as base)
  const columnMap: Record<string, Lead[]> = {}
  for (const status of COLUMN_ORDER) columnMap[status] = []
  if (data) {
    for (const col of data.columns) {
      columnMap[col.status] = col.items
    }
  }

  const activeLead = activeId
    ? Object.values(columnMap).flat().find((l) => l.id === activeId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
    setDragError(null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = String(active.id)
    const targetStatus = String(over.id)

    // Find current status of the dragged lead
    const lead = Object.values(columnMap).flat().find((l) => l.id === leadId)
    if (!lead || lead.status === targetStatus) return

    // Statuses that require extra data — show a dialog instead of patching immediately
    if (targetStatus === 'Buying' || targetStatus === 'Refused') {
      setPending({ leadId, leadName: lead.name, targetStatus })
      return
    }

    try {
      await patchStatus.mutateAsync({ id: leadId, body: { status: targetStatus } })
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
      {/* Page header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-semibold">Канбан</h1>
        <div className="flex items-center gap-2">
          {dragError && (
            <p className="text-sm text-destructive">{dragError}</p>
          )}
          <Link
            to="/leads"
            className="inline-flex items-center h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <List className="mr-1 h-4 w-4" />
            Таблица
          </Link>
        </div>
      </div>

      {/* Board */}
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
              leads={columnMap[status] ?? []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <SetDealPriceDialog
        open={pending?.targetStatus === 'Buying'}
        leadId={pending?.leadId ?? ''}
        leadName={pending?.leadName ?? ''}
        onClose={() => setPending(null)}
      />

      <RefuseLeadDialog
        open={pending?.targetStatus === 'Refused'}
        leadId={pending?.leadId ?? ''}
        leadName={pending?.leadName ?? ''}
        onClose={() => setPending(null)}
      />
    </div>
  )
}
