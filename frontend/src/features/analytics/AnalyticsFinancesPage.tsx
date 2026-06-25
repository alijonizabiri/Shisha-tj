import { useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { usePeriodFinances, useExportReport } from './api'
import { KpiCard } from './components/KpiCard'
import { formatMoney } from '@/shared/lib/formatMoney'
import { Button } from '@/shared/ui/button'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function firstOfYear(): string {
  return isoDate(new Date(new Date().getFullYear(), 0, 1))
}

const MONTH_LABELS = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
]

export function AnalyticsFinancesPage() {
  const [from, setFrom] = useState(firstOfYear())
  const [to, setTo] = useState(isoDate(new Date()))
  const [appliedFrom, setAppliedFrom] = useState(from)
  const [appliedTo, setAppliedTo] = useState(to)

  const { data, isLoading, isError } = usePeriodFinances(appliedFrom, appliedTo)
  const { isExporting, triggerExport } = useExportReport()

  function handleApply() {
    setAppliedFrom(from)
    setAppliedTo(to)
  }

  const chartData = (data?.monthlyBreakdown ?? []).map((m) => ({
    label: `${MONTH_LABELS[m.month - 1]} ${m.year}`,
    revenue: m.revenueTjs,
    cost: m.costTjs,
    profit: m.profitTjs,
  }))

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold mr-auto">P&L Финансы</h1>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-sm text-muted-foreground">—</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button size="sm" onClick={handleApply}>
          Применить
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isExporting !== null}
          onClick={() => triggerExport('pdf', appliedFrom, appliedTo)}
          className="gap-1.5"
        >
          {isExporting === 'pdf'
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : null}
          Экспорт PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isExporting !== null}
          onClick={() => triggerExport('excel', appliedFrom, appliedTo)}
          className="gap-1.5"
        >
          {isExporting === 'excel'
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : null}
          Экспорт Excel
        </Button>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Выручка"
            value={formatMoney(data?.revenueTjs ?? 0)}
            sub={`${data?.closedMeasurementsCount ?? 0} сделок`}
          />
          <KpiCard
            label="Себестоимость"
            value={formatMoney(data?.totalCostTjs ?? 0)}
            trend="down"
          />
          <KpiCard
            label="Прибыль"
            value={formatMoney(data?.profitTjs ?? 0)}
            trend={(data?.profitTjs ?? 0) >= 0 ? 'up' : 'down'}
          />
          <KpiCard
            label="Маржа"
            value={data?.marginPct != null ? `${data.marginPct}%` : '—'}
            trend={(data?.marginPct ?? 0) >= 20 ? 'up' : 'neutral'}
          />
        </div>
      )}

      {/* Chart */}
      {!isLoading && !isError && chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-medium">Динамика по месяцам</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Выручка" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cost" name="Себестоимость" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Line
                type="monotone"
                dataKey="profit"
                name="Прибыль"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly table */}
      {!isLoading && !isError && (data?.monthlyBreakdown?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Месяц</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Выручка</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Себестоимость</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Прибыль</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Маржа%</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Сделок</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data!.monthlyBreakdown.map((m) => {
                const margin = m.revenueTjs > 0
                  ? Math.round((m.profitTjs / m.revenueTjs) * 1000) / 10
                  : 0
                return (
                  <tr key={`${m.year}-${m.month}`} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      {MONTH_LABELS[m.month - 1]} {m.year}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMoney(m.revenueTjs)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatMoney(m.costTjs)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${m.profitTjs >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                      {formatMoney(m.profitTjs)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {margin}%
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {m.closedCount}
                    </td>
                  </tr>
                )
              })}
              {/* Total row */}
              <tr className="bg-muted/30 font-medium border-t-2 border-border">
                <td className="px-4 py-2.5">Итого</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMoney(data!.revenueTjs)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMoney(data!.totalCostTjs)}
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${(data!.profitTjs) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {formatMoney(data!.profitTjs)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {data!.marginPct}%
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {data!.closedMeasurementsCount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && (data?.closedMeasurementsCount ?? 0) === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Нет закрытых сделок за выбранный период
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Ошибка загрузки данных. Попробуйте изменить период.
        </div>
      )}
    </div>
  )
}
