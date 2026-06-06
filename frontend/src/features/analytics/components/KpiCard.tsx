import { cn } from '@/shared/lib/cn'

interface Props {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ label, value, sub, trend }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          trend === 'up' && 'text-green-600 dark:text-green-400',
          trend === 'down' && 'text-destructive',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
