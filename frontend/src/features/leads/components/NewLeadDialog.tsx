import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { createLeadSchema, type CreateLeadFormValues } from '../schemas'
import { useCreateLead, useProducts } from '../api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const SELECT_CLASS =
  'flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

interface Props {
  open: boolean
  onClose: () => void
}

export function NewLeadDialog({ open, onClose }: Props) {
  const navigate = useNavigate()
  const createLead = useCreateLead()
  const { data: products = [] } = useProducts()

  const form = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name:     '',
      phone:    '',
      address:  '',
      product:  '',
      source:   '',
      note:     '',
      callDate: new Date().toISOString().split('T')[0],
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  async function onSubmit(values: CreateLeadFormValues) {
    const result = await createLead.mutateAsync({
      name:     values.name,
      phone:    values.phone,
      address:  values.address || null,
      product:  values.product,
      source:   values.source || null,
      note:     values.note || null,
      callDate: values.callDate,
    })
    onClose()
    navigate(`/leads/${result.id}`)
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Новый лид</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 overflow-y-auto p-5"
          noValidate
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-name">ФИО клиента *</Label>
            <Input
              id="lead-name"
              placeholder="Иванов Иван"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-phone">Телефон *</Label>
            <Input
              id="lead-phone"
              type="tel"
              inputMode="tel"
              placeholder="+992xxxxxxxxx"
              {...register('phone')}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          {/* Product */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-product">Продукт *</Label>
            {products.length > 0 ? (
              <select id="lead-product" {...register('product')} className={SELECT_CLASS}>
                <option value="">— Выберите —</option>
                {products.filter((p) => p.isActive).map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            ) : (
              <Input
                id="lead-product"
                placeholder="Душевая кабина"
                {...register('product')}
              />
            )}
            {errors.product && <p className="text-xs text-destructive">{errors.product.message}</p>}
          </div>

          {/* Call date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-callDate">Дата звонка *</Label>
            <Input
              id="lead-callDate"
              type="date"
              {...register('callDate')}
            />
            {errors.callDate && <p className="text-xs text-destructive">{errors.callDate.message}</p>}
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-address">Адрес</Label>
            <Input
              id="lead-address"
              placeholder="ул. Рудаки 1, кв. 5"
              {...register('address')}
            />
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-source">Источник</Label>
            <Input
              id="lead-source"
              placeholder="Instagram, рекомендация…"
              {...register('source')}
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-note">Заметка</Label>
            <textarea
              id="lead-note"
              rows={3}
              placeholder="Дополнительная информация…"
              {...register('note')}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* API error */}
          {createLead.isError && (
            <p className="text-sm text-destructive">
              Ошибка создания лида. Проверьте данные и попробуйте снова.
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Сохранение…' : 'Создать лид'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
