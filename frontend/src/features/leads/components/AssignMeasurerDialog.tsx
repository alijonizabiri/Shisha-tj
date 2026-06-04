import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAssignMeasurer, useMeasurers, usePatchLeadStatus } from '../api'
import type { LeadDetail } from '../api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const SELECT_CLASS =
  'flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const schema = z.object({
  measurerUserId: z.string().min(1, 'Выберите замерщика'),
  address: z.string().min(2, 'Укажите адрес').max(500),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  lead: LeadDetail
}

export function AssignMeasurerDialog({ open, onClose, lead }: Props) {
  const { data: measurers = [], isLoading: loadingMeasurers } = useMeasurers()
  const assignMeasurer = useAssignMeasurer()
  const patchStatus = usePatchLeadStatus()

  const isNew = lead.status === 'New'

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      measurerUserId: lead.assignedMeasurerId ?? '',
      address: lead.address ?? '',
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      reset({
        measurerUserId: lead.assignedMeasurerId ?? '',
        address: lead.address ?? '',
      })
    }
  }, [open, reset, lead.assignedMeasurerId, lead.address])

  async function onSubmit(values: FormValues) {
    if (isNew) {
      // New → Measurement: single PATCH call handles both assignment + transition
      await patchStatus.mutateAsync({
        id: lead.id,
        body: {
          status: 'Measurement',
          assignedMeasurerId: values.measurerUserId,
          address: values.address,
        },
      })
    } else {
      // Already in flow: just reassign the measurer
      await assignMeasurer.mutateAsync({ id: lead.id, userId: values.measurerUserId })
    }
    onClose()
  }

  const isError = assignMeasurer.isError || patchStatus.isError

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">
            {isNew ? 'Отправить на замер' : 'Назначить замерщика'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5" noValidate>
          {/* Measurer select */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="am-measurer">Замерщик *</Label>
            {loadingMeasurers ? (
              <div className="h-10 rounded-md border border-input bg-muted animate-pulse" />
            ) : (
              <select id="am-measurer" {...register('measurerUserId')} className={SELECT_CLASS}>
                <option value="">— Выберите замерщика —</option>
                {measurers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            )}
            {errors.measurerUserId && (
              <p className="text-xs text-destructive">{errors.measurerUserId.message}</p>
            )}
          </div>

          {/* Address — always shown, required for the Measurement transition */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="am-address">Адрес объекта *</Label>
            <Input
              id="am-address"
              placeholder="ул. Рудаки 1, кв. 5"
              {...register('address')}
            />
            {errors.address && (
              <p className="text-xs text-destructive">{errors.address.message}</p>
            )}
          </div>

          {isError && (
            <p className="text-sm text-destructive">
              Ошибка. Проверьте данные и попробуйте снова.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting
                ? 'Сохранение…'
                : isNew ? 'Отправить на замер' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
