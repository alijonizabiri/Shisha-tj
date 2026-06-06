import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ColorRow } from '../api'

const COLOR_LABELS: Record<string, string> = {
  // Glass
  Transparent: 'Прозрачное',
  Matte: 'Матовое',
  Iodine: 'Йодное',
  Gray: 'Серое',
  EuroBronze: 'Евробронза',
  // Hardware
  BlackMatte: 'Чёрный матовый',
  Gold: 'Золото',
  Nickel: 'Никель',
  MatteGold: 'Матовое золото',
  WetAsphalt: 'Мокрый асфальт',
}

const PALETTE = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#a855f7',
  '#84cc16',
  '#f97316',
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} замеров</p>
    </div>
  )
}

interface Props {
  title: string
  data: ColorRow[]
}

export function ColorPieChart({ title, data }: Props) {
  const total = data.reduce((s, r) => s + r.count, 0)

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>

      {total === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Нет данных
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={data.map((r) => ({
                  name: COLOR_LABELS[r.color] ?? r.color,
                  value: r.count,
                }))}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <ul className="flex flex-col gap-1.5 text-xs">
            {data.map((row, i) => (
              <li key={row.color} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span className="text-muted-foreground">
                  {COLOR_LABELS[row.color] ?? row.color}
                </span>
                <span className="ml-auto pl-3 tabular-nums font-medium">
                  {row.count}
                </span>
              </li>
            ))}
            <li className="mt-1 border-t border-border pt-1 flex items-center gap-2">
              <span className="text-muted-foreground">Итого</span>
              <span className="ml-auto pl-3 tabular-nums font-medium">{total}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
