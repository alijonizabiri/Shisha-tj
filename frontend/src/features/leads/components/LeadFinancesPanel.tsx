import { useState } from 'react'
import type { LeadMeasurement } from '../api'
import { useLeadFinances } from '../api'
import { AddPaymentDialog } from './AddPaymentDialog'
import { MeasurerPayoutSection } from '@/features/measurements/MeasurerPayoutSection'
import { Button } from '@/shared/ui/button'
import { formatMoney } from '@/shared/lib/formatMoney'
import { cn } from '@/shared/lib/cn'

interface Props {
  leadId: string
  measurements: LeadMeasurement[]
}

interface RowProps {
  label: string
  value: number | null
  bold?: boolean
  highlight?: 'profit' | 'balance'
}

function Row({ label, value, bold, highlight }: RowProps) {
  const text = value == null ? '—' : formatMoney(value)

  const colorClass =
    highlight === 'profit' && value != null
      ? value >= 0
        ? 'text-green-600 dark:text-green-400'
        : 'text-destructive'
      : 'tabular-nums'

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={cn('text-sm text-muted-foreground', bold && 'font-medium text-foreground')}>
        {label}
      </span>
      <span className={cn('text-sm', bold && 'font-semibold', colorClass)}>
        {text}
      </span>
    </div>
  )
}

function Divider() {
  return <div className="my-1 border-t border-border" />
}

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function LeadFinancesPanel({ leadId, measurements }: Props) {
  const { data, isLoading, isError } = useLeadFinances(leadId)
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [payMeasurementId, setPayMeasurementId] = useState(measurements[0]?.id ?? '')

  const hasMeasurements = measurements.length > 0

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Финансы
      </h2>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      )}

      {isError && (
        <p className="text-sm text-destructive">Ошибка загрузки финансов.</p>
      )}

      {data && (
        <div>
          {/* Deal price */}
          {data.dealPriceTjs != null ? (
            <>
              <Row label="Сумма сделки" value={data.dealPriceTjs} bold />
              <Divider />
            </>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground italic">
              Сумма сделки будет указана при переводе в статус «Покупка».
            </p>
          )}

          {/* Cost breakdown */}
          <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Расходы
          </p>
          <Row label="Стёкла (завод)" value={data.glassCostTjs || null} />
          {data.reworkCostTjs > 0 && (
            <Row label="Переделки (наша ошибка)" value={data.reworkCostTjs} />
          )}
          <Row label="Фурнитура" value={data.hardwareCostTjs || null} />
          <Row label="Работа мастера" value={data.masterFeeTjs || null} />
          {data.deliveryCostTjs > 0 && (
            <Row label="Доставка" value={data.deliveryCostTjs} />
          )}
          {data.otherCostsTjs > 0 && (
            <Row label="Прочее" value={data.otherCostsTjs} />
          )}

          <Divider />

          <Row label="Итого расходов" value={data.totalCostTjs} bold />
          <Row label="Прибыль" value={data.profitTjs} bold highlight="profit" />

          <Divider />

          {/* Payment summary */}
          <p className="mb-1 mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Оплата
          </p>
          <Row label="Оплачено" value={data.totalPaidTjs || null} />
          <Row
            label="Остаток к оплате"
            value={data.balanceDueTjs}
            bold={data.balanceDueTjs != null && data.balanceDueTjs > 0}
            highlight="balance"
          />

          <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
            {/* When there are multiple measurements, show a selector so the user
                can choose which measurement receives the payment */}
            {measurements.length > 1 && (
              <select
                value={payMeasurementId}
                onChange={(e) => setPayMeasurementId(e.target.value)}
                className={SELECT_CLASS}
                aria-label="Замер для платежа"
              >
                {measurements.map((m, i) => (
                  <option key={m.id} value={m.id}>
                    Замер {i + 1}: {m.measureMm} × {m.heightMm} мм
                  </option>
                ))}
              </select>
            )}

            <Button
              size="sm"
              variant="outline"
              disabled={!hasMeasurements || !payMeasurementId}
              onClick={() => setAddPaymentOpen(true)}
            >
              + Добавить платёж
            </Button>
            {!hasMeasurements && (
              <p className="text-xs text-muted-foreground">Сначала создайте замер</p>
            )}
          </div>
        </div>
      )}

      {/* Measurer payouts — one per measurement */}
      {data && measurements.length > 0 && (
        <div className="mt-2">
          {measurements.map((m) => (
            <MeasurerPayoutSection key={m.id} measurementId={m.id} />
          ))}
        </div>
      )}

      {addPaymentOpen && payMeasurementId && (
        <AddPaymentDialog
          measurementId={payMeasurementId}
          onClose={() => setAddPaymentOpen(false)}
        />
      )}
    </div>
  )
}
