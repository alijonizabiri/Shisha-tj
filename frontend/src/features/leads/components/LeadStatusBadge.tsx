import { cn } from '@/shared/lib/cn'
import { LEAD_STATUS_META } from '../lib/leadStatuses'

interface Props {
  status: string
}

export function LeadStatusBadge({ status }: Props) {
  const meta = LEAD_STATUS_META[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}
