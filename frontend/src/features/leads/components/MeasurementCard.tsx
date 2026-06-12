import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/shared/lib/cn'
import { formatMoney } from '@/shared/lib/formatMoney'
import type { MeasurementKanbanItem } from '@/features/measurements/api'

interface Props {
  item: MeasurementKanbanItem
  isDragOverlay?: boolean
}

export function MeasurementCard({ item, isDragOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-md border border-border bg-card p-3 shadow-sm select-none touch-none',
        'cursor-grab active:cursor-grabbing',
        isDragging && !isDragOverlay && 'opacity-40',
        isDragOverlay && 'shadow-lg rotate-1 cursor-grabbing',
      )}
    >
      <p className="text-sm font-medium text-foreground truncate">{item.leadName}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{item.leadPhone}</p>
      <p className="mt-1 text-xs text-muted-foreground truncate">{item.product}</p>
      {item.dealPriceTjs != null && (
        <p className="mt-1 text-xs font-medium tabular-nums">
          {formatMoney(item.dealPriceTjs)}
        </p>
      )}
      {item.assignedMeasurerName && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          👤 {item.assignedMeasurerName}
        </p>
      )}
    </div>
  )
}
