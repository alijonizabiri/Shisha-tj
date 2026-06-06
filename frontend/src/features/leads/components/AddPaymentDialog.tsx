import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCreatePayment } from '../api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const schema = z.object({
  kind: z.enum(['Deposit', 'Balance', 'Refund']),
  amountStr: z
    .string()
    .min(1, 'Введите сумму')
    .refine((s) => !isNaN(Number(s)) && Number(s) > 0, 'Сумма должна быть больше 0'),
  paidAt: z.string().min(1, 'Укажите дату'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const KIND_LABELS: Record<'Deposit' | 'Balance' | 'Refund', string> = {
  Deposit: 'Аванс',
  Balance: 'Остаток',
  Refund:  'Возврат',
}

interface Props {
  leadId: string
  hasMeasurements: boolean
  onClose: () => void
}

// Conditionally rendered in parent — mounts fresh each time
export function AddPaymentDialog({ leadId, hasMeasurements, onClose }: Props) {
  const createPayment = useCreatePayment(leadId)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind:      'Deposit',
      amountStr: '',
      paidAt:    new Date().toISOString().split('T')[0],
      note:      '',
    },
  })

  const selectedKind = watch('kind')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function onSubmit(values: FormValues) {
    const amount = Number(values.amountStr)
    await createPayment.mutateAsync({
      leadId,
      amountTjs: values.kind === 'Refund' ? -amount : amount,
      kind: values.kind,
      paidAt: values.paidAt,
      note: values.note || null,
    })
    onClose()
  }

  const depositBlocked = !hasMeasurements && selectedKind === 'Deposit'

  // Extract server error code for race-condition guard
  const serverErrorCode = createPayment.isError
    ? (createPayment.error as { response?: { data?: { errorCode?: string } } })
        ?.response?.data?.errorCode
    : undefined

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Добавить платёж</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5" noValidate>
          {/* Kind */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-kind">Тип платежа</Label>
            <select id="pay-kind" {...register('kind')} className={SELECT_CLASS}>
              {(Object.entries(KIND_LABELS) as [FormValues['kind'], string][]).map(([v, label]) => (
                <option key={v} value={v} disabled={v === 'Deposit' && !hasMeasurements}>
                  {label}{v === 'Deposit' && !hasMeasurements ? ' (нет замера)' : ''}
                </option>
              ))}
            </select>
            {!hasMeasurements && selectedKind === 'Deposit' && (
              <p className="text-xs text-muted-foreground">
                Сначала создайте замер в Дизайнере.
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-amount">Сумма (сом)</Label>
            <Input
              id="pay-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              {...register('amountStr')}
            />
            {errors.amountStr && (
              <p className="text-xs text-destructive">{errors.amountStr.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-date">Дата</Label>
            <Input id="pay-date" type="date" {...register('paidAt')} />
            {errors.paidAt && (
              <p className="text-xs text-destructive">{errors.paidAt.message}</p>
            )}
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-note">Заметка</Label>
            <Input id="pay-note" placeholder="Необязательно" {...register('note')} />
          </div>

          {createPayment.isError && (
            <p className="text-sm text-destructive">
              {serverErrorCode === 'MEASUREMENT_REQUIRED_FOR_DEPOSIT'
                ? 'Нельзя принять депозит: у лида нет замера. Создайте замер в Дизайнере.'
                : 'Ошибка создания платежа. Попробуйте снова.'}
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || depositBlocked}
              className="flex-1"
            >
              {isSubmitting ? 'Сохранение…' : 'Добавить'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
