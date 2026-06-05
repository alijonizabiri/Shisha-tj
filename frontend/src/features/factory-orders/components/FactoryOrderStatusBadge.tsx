import { cn } from '@/shared/lib/cn'

const STATUS_META: Record<string, { label: string; className: string }> = {
  Draft:    { label: 'Черновик',  className: 'bg-muted text-muted-foreground' },
  Sent:     { label: 'Отправлен', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  Received: { label: 'Получен',   className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  Closed:   { label: 'Закрыт',    className: 'bg-secondary text-secondary-foreground' },
}

interface Props {
  status: string
}

export function FactoryOrderStatusBadge({ status }: Props) {
  const meta = STATUS_META[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', meta.className)}>
      {meta.label}
    </span>
  )
}
