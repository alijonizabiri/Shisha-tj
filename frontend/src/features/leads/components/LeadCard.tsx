import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/shared/lib/cn'
import type { Lead } from '../api'

interface Props {
  lead: Lead
  isDragOverlay?: boolean
  onSelect?: (id: string) => void
}

export function LeadCard({ lead, isDragOverlay = false, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
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
      <button
        type="button"
        className="block text-left text-sm font-medium text-foreground hover:underline w-full"
        onClick={(e) => { e.stopPropagation(); onSelect?.(lead.id) }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {lead.name}
      </button>
      <p className="mt-0.5 text-xs text-muted-foreground">{lead.phone}</p>
      <p className="mt-1 text-xs text-muted-foreground truncate">{lead.product}</p>
    </div>
  )
}
