import type { RefusalsDto } from '../api'

interface Props {
  data: RefusalsDto
}

export function RefusalsTable({ data }: Props) {
  if (data.totalRefused === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        Нет отказов за выбранный период
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Причина</span>
        <span>
          Всего отказов: <strong className="text-foreground">{data.totalRefused}</strong>
        </span>
      </div>

      <div className="divide-y divide-border">
        {data.reasons.map((row, i) => (
          <div key={i} className="py-2.5">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="truncate pr-4">{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.count} &nbsp;
                <span className="font-medium text-foreground">{row.percentage}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-destructive/70"
                style={{ width: `${row.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
