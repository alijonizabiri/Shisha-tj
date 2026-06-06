import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FunnelRow } from '../api'

const STATUS_LABELS: Record<string, string> = {
  New: 'Новый',
  Measurement: 'Замер',
  Thinking: 'Думает',
  Buying: 'Покупает',
  OrderedAtFactory: 'Заказ на заводе',
  GlassArrived: 'Стекло получено',
  Installed: 'Установлено',
  Refused: 'Отказ',
  Closed: 'Закрыт',
}

const FUNNEL_ORDER = [
  'New',
  'Measurement',
  'Thinking',
  'Buying',
  'OrderedAtFactory',
  'GlassArrived',
  'Installed',
  'Refused',
  'Closed',
]

function barColor(status: string): string {
  if (status === 'Refused') return 'hsl(var(--destructive))'
  if (status === 'Closed') return 'hsl(var(--muted-foreground))'
  return 'hsl(var(--primary))'
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: { label: string }; value: number }>
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{payload[0].payload.label}</p>
      <p className="text-muted-foreground">{payload[0].value} лидов</p>
    </div>
  )
}

interface Props {
  data: FunnelRow[]
}

export function FunnelChart({ data }: Props) {
  const total = data.reduce((s, r) => s + r.count, 0)

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Нет данных
      </div>
    )
  }

  const sorted = FUNNEL_ORDER.map((s) => {
    const row = data.find((r) => r.status === s)
    return {
      status: s,
      label: STATUS_LABELS[s] ?? s,
      count: row?.count ?? 0,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={sorted.length * 44}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
        barSize={20}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="count"
            position="right"
            style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
          />
          {sorted.map((entry) => (
            <Cell key={entry.status} fill={barColor(entry.status)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
