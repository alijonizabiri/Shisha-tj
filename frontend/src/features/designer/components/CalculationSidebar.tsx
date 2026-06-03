import { type UseFormReturn } from 'react-hook-form'
import { cn } from '@/shared/lib/cn'
import { formatMoney } from '@/shared/lib/formatMoney'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { MeasurementFormValues } from '../schemas'

interface Props {
  areaSqM: number | null
  masterFeeTjs: number | null
  form: UseFormReturn<MeasurementFormValues>
}

function MetricRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm font-medium tabular-nums', highlight && 'text-destructive')}>
        {value}
      </dd>
    </div>
  )
}

export function CalculationSidebar({ areaSqM, masterFeeTjs, form }: Props) {
  const {
    register,
    watch,
    formState: { errors },
  } = form

  const deliveryRaw = watch('deliveryTjs')
  const depositRaw = watch('depositTjs')

  const delivery = Number.isFinite(Number(deliveryRaw)) ? Number(deliveryRaw) : 0
  const deposit = Number.isFinite(Number(depositRaw)) ? Number(depositRaw) : 0
  const balance = masterFeeTjs !== null ? masterFeeTjs + delivery - deposit : null

  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-l border-border bg-card">
      <div className="p-4">
        <h2 className="mb-4 text-base font-semibold">Расчёт</h2>
        <dl className="flex flex-col gap-4">
          <MetricRow
            label="Площадь"
            value={areaSqM !== null ? `${areaSqM.toFixed(2)} м²` : '—'}
          />

          <MetricRow
            label="Работа мастера"
            value={masterFeeTjs !== null ? formatMoney(masterFeeTjs) : '—'}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deliveryTjs">Доставка</Label>
            <Input
              id="deliveryTjs"
              type="number"
              inputMode="numeric"
              min={0}
              {...register('deliveryTjs', { valueAsNumber: true })}
            />
            {errors.deliveryTjs && (
              <p className="text-xs text-destructive">{errors.deliveryTjs.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="depositTjs">Депозит</Label>
            <Input
              id="depositTjs"
              type="number"
              inputMode="numeric"
              min={0}
              {...register('depositTjs', { valueAsNumber: true })}
            />
            {errors.depositTjs && (
              <p className="text-xs text-destructive">{errors.depositTjs.message}</p>
            )}
          </div>

          <hr className="border-border" />

          <MetricRow
            label="Остаток"
            value={balance !== null ? formatMoney(balance) : '—'}
            highlight={balance !== null && balance < 0}
          />
        </dl>
      </div>
    </aside>
  )
}
