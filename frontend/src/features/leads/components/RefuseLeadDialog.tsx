import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useRefusalReasons, usePatchLeadStatus } from '../api'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { refuseLeadSchema, type RefuseLeadFormValues } from '../schemas'

interface Props {
  open: boolean
  onClose: () => void
  leadId: string
  leadName: string
}

export function RefuseLeadDialog({ open, onClose, leadId, leadName }: Props) {
  const { data: reasons = [], isLoading } = useRefusalReasons()
  const patchStatus = usePatchLeadStatus()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RefuseLeadFormValues>({
    resolver: zodResolver(refuseLeadSchema),
    defaultValues: { refusalReasonId: '', refusalNote: '' },
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) reset({ refusalReasonId: '', refusalNote: '' })
  }, [open, reset])

  async function onSubmit(values: RefuseLeadFormValues) {
    await patchStatus.mutateAsync({
      id: leadId,
      body: {
        status: 'Refused',
        refusalReasonId: values.refusalReasonId,
        refusalNote: values.refusalNote || null,
      },
    })
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Отказ: {leadName}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-5" noValidate>
          {/* Reason radio list */}
          <div className="flex flex-col gap-2">
            <Label>Причина отказа *</Label>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2" role="group" aria-label="Причина отказа">
                {reasons.map((r) => (
                  <label key={r.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      value={r.id}
                      {...register('refusalReasonId')}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            )}
            {errors.refusalReasonId && (
              <p className="text-xs text-destructive">{errors.refusalReasonId.message}</p>
            )}
          </div>

          {/* Optional note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refuse-note">Комментарий</Label>
            <textarea
              id="refuse-note"
              rows={3}
              placeholder="Необязательно"
              {...register('refusalNote')}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {patchStatus.isError && (
            <p className="text-sm text-destructive">Ошибка. Попробуйте снова.</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Сохранение…' : 'Отказать'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
