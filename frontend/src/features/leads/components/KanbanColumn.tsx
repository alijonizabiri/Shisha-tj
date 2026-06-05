import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/shared/lib/cn'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LeadCard } from './LeadCard'
import type { Lead } from '../api'

interface Props {
  status: string
  leads: Lead[]
  onSelectLead?: (id: string) => void
}

export function KanbanColumn({ status, leads, onSelectLead }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <LeadStatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-medium">{leads.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 rounded-lg border-2 border-dashed p-2 min-h-24 transition-colors',
          isOver
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/20',
        )}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
        ))}
        {leads.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">Пусто</p>
        )}
      </div>
    </div>
  )
}
