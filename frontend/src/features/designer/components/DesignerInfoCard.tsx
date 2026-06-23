import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
  /** Warning text for wide/narrow panels */
  warning?: string | null
}

export function DesignerInfoCard({ areaSqM, masterFeeTjs, form, warning }: Props) {
  const [expanded, setExpanded] = useState(false)

  const { register, watch } = form
  const deliveryRaw  = watch('deliveryTjs')
  const depositRaw   = watch('depositTjs')
  const dealRaw      = watch('dealPriceTjs')
  const delivery  = Number.isFinite(Number(deliveryRaw)) ? Number(deliveryRaw) : 0
  const deposit   = Number.isFinite(Number(depositRaw))  ? Number(depositRaw)  : 0
  const autoDeal  = masterFeeTjs !== null ? masterFeeTjs + delivery : null
  const customDeal = dealRaw != null && Number(dealRaw) > 0 ? Number(dealRaw) : null
  const effectiveDeal = customDeal ?? autoDeal
  const balance   = effectiveDeal !== null ? effectiveDeal - deposit : null

  return (
    <div
      className="absolute left-4 top-4 z-10 min-w-[180px] max-w-[280px] cursor-pointer select-none rounded-xl border border-border bg-white/90 shadow-md backdrop-blur dark:bg-neutral-900/90"
      onClick={() => setExpanded((v) => !v)}
      role="button"
      aria-expanded={expanded}
      aria-label={expanded ? 'Свернуть расчёт' : 'Развернуть расчёт'}
    >
      {/* Always-visible summary row */}
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Площадь</span>
          <span className="text-sm font-semibold tabular-nums">
            {areaSqM !== null ? `${areaSqM.toFixed(2)} м²` : '—'}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Мастер</span>
          <span className="text-sm font-semibold tabular-nums">
            {masterFeeTjs !== null ? formatMoney(masterFeeTjs) : '—'}
          </span>
        </div>
        {warning && (
          <>
            <div className="h-8 w-px bg-border" />
            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
              ⚠
            </span>
          </>
        )}
        <div className="ml-auto pl-1 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          className="border-t border-border px-3 pb-3 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {warning && (
            <p className="mb-2 text-xs text-yellow-700 dark:text-yellow-400">{warning}</p>
          )}

          <div className={cn('flex flex-col gap-3')}>
            <div className="flex flex-col gap-1">
              <Label htmlFor="info-delivery" className="text-xs">Доставка</Label>
              <Input
                id="info-delivery"
                type="number"
                inputMode="numeric"
                min={0}
                className="h-8 text-sm"
                {...register('deliveryTjs', { valueAsNumber: true })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="info-deal" className="text-xs">
                Договорная цена
                {autoDeal !== null && (
                  <span className="ml-1 text-muted-foreground">(авто: {formatMoney(autoDeal)})</span>
                )}
              </Label>
              <Input
                id="info-deal"
                type="number"
                inputMode="numeric"
                min={0}
                className="h-8 text-sm"
                placeholder={autoDeal !== null ? String(autoDeal) : ''}
                {...register('dealPriceTjs', { valueAsNumber: true, setValueAs: (v) => (v === '' || v === 0 || Number.isNaN(v) ? null : Number(v)) })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="info-deposit" className="text-xs">Депозит (получен)</Label>
              <Input
                id="info-deposit"
                type="number"
                inputMode="numeric"
                min={0}
                className="h-8 text-sm"
                {...register('depositTjs', { valueAsNumber: true })}
              />
            </div>

            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Остаток</span>
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    balance !== null && balance < 0 && 'text-destructive',
                  )}
                >
                  {balance !== null ? formatMoney(balance) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
