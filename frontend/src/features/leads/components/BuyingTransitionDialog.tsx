import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  usePatchMeasurementStatus,
  useMeasurementFinances,
  useCreateMeasurementPayment,
} from '@/features/measurements/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { formatMoney } from '@/shared/lib/formatMoney'

const MIN_DEPOSIT = 100

const depositSchema = z.object({
  depositStr: z
    .string()
    .min(1, 'Введите сумму')
    .refine(
      (s) => !isNaN(Number(s)) && Number(s) >= MIN_DEPOSIT,
      `Минимальный депозит — ${MIN_DEPOSIT} сом`,
    ),
})

type DepositValues = z.infer<typeof depositSchema>

interface Props {
  measurementId: string
  onClose: () => void
}

export function BuyingTransitionDialog({ measurementId, onClose }: Props) {
  const { data: finances, refetch: refetchFinances } = useMeasurementFinances(measurementId)
  const patchStatus = usePatchMeasurementStatus()
  const createPayment = useCreateMeasurementPayment(measurementId)

  const totalDeposit = finances?.totalDepositTjs ?? 0
  const depositSufficient = totalDeposit >= MIN_DEPOSIT
  const hasDealPrice = finances?.dealPriceTjs != null && finances.dealPriceTjs > 0

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
      measurementId,
      amountTjs: Number(values.depositStr),
      kind:      'Deposit',
      paidAt:    new Date().toISOString().split('T')[0],
    })
    await refetchFinances()
    setDepositSaved(true)
    depositForm.reset({ depositStr: '' })
  }

  async function handleConfirm() {
    await patchStatus.mutateAsync({ id: measurementId, body: { status: 'Buying' } })
    onClose()
  }

  const canSubmit = hasDealPrice && depositSufficient

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Перевести в «Покупает»</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent transition-colors" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {!hasDealPrice && (
            <p className="text-sm text-destructive">Укажите сумму сделки на замере перед переводом.</p>
          )}

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

            {depositSaved && depositSufficient && (
              <p className="text-xs text-green-600 dark:text-green-400">Депозит принят ✓</p>
            )}
          </div>

          {patchStatus.isError && (
            <p className="text-sm text-destructive">Ошибка. Попробуйте снова.</p>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button
              type="button"
              disabled={!canSubmit || patchStatus.isPending}
              onClick={handleConfirm}
              className="flex-1"
            >
              {patchStatus.isPending ? 'Сохранение…' : 'Подтвердить'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
