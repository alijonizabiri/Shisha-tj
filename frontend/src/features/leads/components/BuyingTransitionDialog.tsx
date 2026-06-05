import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCreatePayment, useLead, useLeadFinances, usePatchLeadStatus } from '../api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { formatMoney } from '@/shared/lib/formatMoney'

const MIN_DEPOSIT = 100

const schema = z.object({
  dealPriceStr: z
    .string()
    .min(1, 'Введите сумму сделки')
    .refine((s) => !isNaN(Number(s)) && Number(s) > 0, 'Сумма должна быть > 0'),
  promisedInstallDate: z.string().optional(),
})

const depositSchema = z.object({
  depositStr: z
    .string()
    .min(1, 'Введите сумму')
    .refine(
      (s) => !isNaN(Number(s)) && Number(s) >= MIN_DEPOSIT,
      `Минимальный депозит — ${MIN_DEPOSIT} сом`,
    ),
})

type FormValues = z.infer<typeof schema>
type DepositValues = z.infer<typeof depositSchema>


interface Props {
  leadId: string
  onClose: () => void
}

export function BuyingTransitionDialog({ leadId, onClose }: Props) {
  const { data: lead } = useLead(leadId)
  const { data: finances, refetch: refetchFinances } = useLeadFinances(leadId)
  const patchStatus = usePatchLeadStatus()
  const createPayment = useCreatePayment(leadId)

  const totalDeposit = finances?.totalDepositTjs ?? 0
  const depositSufficient = totalDeposit >= MIN_DEPOSIT

  // Main form
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dealPriceStr:        lead?.dealPriceTjs != null ? String(lead.dealPriceTjs) : '',
      promisedInstallDate: lead?.promisedInstallDate ?? '',
    },
  })

  // Inline deposit mini-form
  const depositForm = useForm<DepositValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: { depositStr: '' },
  })
  const [depositSaved, setDepositSaved] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleAddDeposit(values: DepositValues) {
    await createPayment.mutateAsync({
      leadId,
      amountTjs: Number(values.depositStr),
      kind:      'Deposit',
      paidAt:    new Date().toISOString().split('T')[0],
      note:      null,
    })
    await refetchFinances()
    setDepositSaved(true)
    depositForm.reset({ depositStr: '' })
  }

  async function onSubmit(values: FormValues) {
    await patchStatus.mutateAsync({
      id: leadId,
      body: {
        status:              'Buying',
        dealPriceTjs:        Number(values.dealPriceStr),
        promisedInstallDate: values.promisedInstallDate || null,
      },
    })
    onClose()
  }

  const hasMeasurement = (lead?.measurements.length ?? 0) > 0
  const canSubmit = hasMeasurement && depositSufficient

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Перевести в «Покупает»</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent transition-colors" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Deal price */}
          <form id="buying-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buying-deal-price">Сумма сделки (сом) *</Label>
              <Input
                id="buying-deal-price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                {...register('dealPriceStr')}
              />
              {errors.dealPriceStr && (
                <p className="text-xs text-destructive">{errors.dealPriceStr.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buying-install-date">
                Дата установки <span className="text-muted-foreground">(необязательно)</span>
              </Label>
              <Input id="buying-install-date" type="date" {...register('promisedInstallDate')} />
            </div>
          </form>

          {/* Deposit section */}
          <div className="rounded-md border border-border p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Депозит</p>
              <p className={`text-sm font-semibold tabular-nums ${depositSufficient ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {formatMoney(totalDeposit)}
                {!depositSufficient && ` / ${formatMoney(MIN_DEPOSIT)} мин.`}
              </p>
            </div>

            {!depositSufficient && (
              <form onSubmit={depositForm.handleSubmit(handleAddDeposit)} className="flex gap-2" noValidate>
                <div className="flex-1 flex flex-col gap-1">
                  <Input
                    type="number"
                    min={MIN_DEPOSIT}
                    step="0.01"
                    placeholder={`Мин. ${MIN_DEPOSIT} сом`}
                    {...depositForm.register('depositStr')}
                  />
                  {depositForm.formState.errors.depositStr && (
                    <p className="text-xs text-destructive">{depositForm.formState.errors.depositStr.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={depositForm.formState.isSubmitting}
                  className="shrink-0"
                >
                  {depositForm.formState.isSubmitting ? '…' : '+ Депозит'}
                </Button>
              </form>
            )}

            {!hasMeasurement && (
              <p className="text-xs text-destructive">Нет замера — сначала откройте Дизайнер.</p>
            )}

            {depositSaved && depositSufficient && (
              <p className="text-xs text-green-600 dark:text-green-400">Депозит принят ✓</p>
            )}
          </div>

          {patchStatus.isError && (
            <p className="text-sm text-destructive">Ошибка. Попробуйте снова.</p>
          )}

          {/* Footer */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button
              form="buying-form"
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Сохранение…' : 'Подтвердить'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
