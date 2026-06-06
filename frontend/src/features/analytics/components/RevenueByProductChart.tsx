import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney } from '@/shared/lib/formatMoney'
import type { ProductRow } from '../api'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-muted-foreground">{formatMoney(payload[0].value)}</p>
    </div>
  )
}

interface Props {
  data: ProductRow[]
}

export function RevenueByProductChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Нет данных
      </div>
    )
  }

  const chartData = data.map((r) => ({
    name: r.product,
    revenue: r.revenueTjs,
    leads: r.leadCount,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  )
}
