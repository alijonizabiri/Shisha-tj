import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/shared/lib/cn'
import { LeadStatusBadge } from './LeadStatusBadge'
import { MeasurementCard } from './MeasurementCard'
import type { MeasurementKanbanItem } from '@/features/measurements/api'

interface Props {
  status: string
  items: MeasurementKanbanItem[]
}

export function KanbanColumn({ status, items }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <LeadStatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-medium">{items.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 rounded-lg border-2 border-dashed p-2 min-h-24 transition-colors',
          isOver
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/20',
        )}
      >
        {items.map((item) => (
          <MeasurementCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">Пусто</p>
        )}
      </div>
    </div>
  )
}
