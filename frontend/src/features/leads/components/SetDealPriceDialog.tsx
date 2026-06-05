import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePatchLeadStatus } from '../api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const schema = z.object({
  dealPriceStr: z
    .string()
    .min(1, 'Введите сумму сделки')
    .refine((s) => !isNaN(Number(s)) && Number(s) > 0, 'Сумма должна быть > 0'),
  promisedInstallDate: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  leadId: string
  leadName: string
}

export function SetDealPriceDialog({ open, onClose, leadId, leadName }: Props) {
  const patchStatus = usePatchLeadStatus()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { dealPriceStr: '', promisedInstallDate: '' },
    })

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) reset({ dealPriceStr: '', promisedInstallDate: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    await patchStatus.mutateAsync({
      id: leadId,
      body: {
        status: 'Buying',
        dealPriceTjs: Number(values.dealPriceStr),
        promisedInstallDate: values.promisedInstallDate || null,
      },
    })
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Покупка: {leadName}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent transition-colors" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deal-price">Сумма сделки (сом) *</Label>
            <Input
              id="deal-price"
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
            <Label htmlFor="install-date">
              Дата установки <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Input id="install-date" type="date" {...register('promisedInstallDate')} />
          </div>

          {patchStatus.isError && (
            <p className="text-sm text-destructive">Ошибка. Попробуйте снова.</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Сохранение…' : 'Подтвердить'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
