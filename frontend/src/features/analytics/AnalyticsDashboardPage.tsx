import { formatMoney } from '@/shared/lib/formatMoney'
import { useAnalyticsDashboard, useAnalyticsByProduct, useAnalyticsFunnel, useAnalyticsRefusals } from './api'
import { KpiCard } from './components/KpiCard'
import { RevenueByProductChart } from './components/RevenueByProductChart'
import { FunnelChart } from './components/FunnelChart'
import { RefusalsTable } from './components/RefusalsTable'

export function AnalyticsDashboardPage() {
  const { data: dash, isLoading: dashLoading } = useAnalyticsDashboard()
  const { data: byProduct, isLoading: productLoading } = useAnalyticsByProduct()
  const { data: funnel, isLoading: funnelLoading } = useAnalyticsFunnel()
  const { data: refusals, isLoading: refusalsLoading } = useAnalyticsRefusals()

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Аналитика</h1>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      {dashLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard
            label="Всего лидов"
            value={String(dash?.totalLeads ?? 0)}
          />
          <KpiCard
            label="Активных"
            value={String(dash?.activeLeads ?? 0)}
          />
          <KpiCard
            label="Выручка"
            value={formatMoney(dash?.revenueTjs ?? 0)}
          />
          <KpiCard
            label="Конверсия"
            value={dash?.conversionRate != null ? `${dash.conversionRate}%` : '—'}
            trend={
              dash?.conversionRate == null
                ? undefined
                : dash.conversionRate >= 30
                  ? 'up'
                  : 'neutral'
            }
          />
          <KpiCard
            label="Средний чек"
            value={dash?.avgDealSizeTjs != null ? formatMoney(dash.avgDealSizeTjs) : '—'}
          />
        </div>
      )}

      {/* ── Two-column charts ─────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-medium">Выручка по продуктам</h2>
          {productLoading ? (
            <div className="h-64 animate-pulse rounded-md bg-muted" />
          ) : (
            <RevenueByProductChart data={byProduct?.products ?? []} />
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-medium">Воронка продаж</h2>
          {funnelLoading ? (
            <div className="h-64 animate-pulse rounded-md bg-muted" />
          ) : (
            <FunnelChart data={funnel?.statuses ?? []} />
          )}
        </div>
      </div>

      {/* ── Refusal reasons ───────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-base font-medium">Причины отказов</h2>
        {refusalsLoading ? (
          <div className="h-32 animate-pulse rounded-md bg-muted" />
        ) : (
          <RefusalsTable
            data={refusals ?? { reasons: [], totalRefused: 0 }}
          />
        )}
      </div>
    </div>
  )
}
