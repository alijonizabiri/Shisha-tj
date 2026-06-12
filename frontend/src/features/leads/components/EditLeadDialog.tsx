import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useUpdateLead, useProducts, type LeadDetail } from '../api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const SELECT_CLASS =
  'flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const LEAD_SOURCES = [
  'Instagram',
  'Рекомендация',
  'Google / Яндекс',
  'Объявление (Avito / OLX)',
  'Выставка',
  'Другое',
] as const

const schema = z.object({
  name:     z.string().min(2, 'Мин. 2 символа').max(200),
  phone:    z.string().regex(/^\+?\d{9,15}$/, 'Формат: +992xxxxxxxxx'),
  product:  z.string().min(1, 'Выберите продукт'),
  source:   z.string().max(100).optional(),
  note:     z.string().max(2000).optional(),
  callDate: z.string().min(1, 'Укажите дату звонка'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  lead: LeadDetail
  onClose: () => void
}

export function EditLeadDialog({ lead, onClose }: Props) {
  const updateLead = useUpdateLead(lead.id)
  const { data: products = [] } = useProducts()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:     lead.name,
      phone:    lead.phone,
      product:  lead.product,
      source:   lead.source ?? '',
      note:     lead.note ?? '',
      callDate: lead.callDate,
    },
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function onSubmit(values: FormValues) {
    await updateLead.mutateAsync({
      name:     values.name,
      phone:    values.phone,
      product:  values.product,
      source:   values.source || null,
      note:     values.note || null,
      callDate: values.callDate,
    })
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold">Редактировать лид</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 overflow-y-auto p-5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-lead-name">ФИО клиента *</Label>
            <Input id="edit-lead-name" placeholder="Иванов Иван" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-lead-phone">Телефон *</Label>
            <Input
              id="edit-lead-phone"
              type="tel"
              inputMode="tel"
              placeholder="+992xxxxxxxxx"
              {...register('phone')}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-lead-product">Продукт *</Label>
            {products.length > 0 ? (
              <select id="edit-lead-product" {...register('product')} className={SELECT_CLASS}>
                <option value="">— Выберите —</option>
                {products.filter((p) => p.isActive).map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            ) : (
              <Input id="edit-lead-product" placeholder="Душевая кабина" {...register('product')} />
            )}
            {errors.product && <p className="text-xs text-destructive">{errors.product.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-lead-callDate">Дата звонка *</Label>
            <Input id="edit-lead-callDate" type="date" {...register('callDate')} />
            {errors.callDate && <p className="text-xs text-destructive">{errors.callDate.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-lead-source">Источник</Label>
            <select id="edit-lead-source" {...register('source')} className={SELECT_CLASS}>
              <option value="">— Выберите —</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-lead-note">Заметка</Label>
            <textarea
              id="edit-lead-note"
              rows={3}
              placeholder="Дополнительная информация…"
              {...register('note')}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {updateLead.isError && (
            <p className="text-sm text-destructive">Ошибка сохранения. Попробуйте снова.</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
