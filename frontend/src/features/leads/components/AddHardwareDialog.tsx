import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCreateHardware } from '../api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const HARDWARE_COLORS: Record<string, string> = {
  BlackMatte:  'Матовый чёрный',
  Gold:        'Золото',
  Nickel:      'Никель',
  MatteGold:   'Матовое золото',
  WetAsphalt:  'Мокрый асфальт',
}

const schema = z.object({
  color: z.string().min(1, 'Выберите цвет'),
  costStr: z
    .string()
    .min(1, 'Введите стоимость')
    .refine((s) => !isNaN(Number(s)) && Number(s) > 0, 'Стоимость должна быть > 0'),
  purchasedAt: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  measurementId: string
  defaultColor: string
  leadId: string
  onClose: () => void
}

// Conditionally rendered in parent — state resets on each mount
export function AddHardwareDialog({ measurementId, defaultColor, leadId, onClose }: Props) {
  const createHardware = useCreateHardware(leadId)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      color:       defaultColor in HARDWARE_COLORS ? defaultColor : 'BlackMatte',
      costStr:     '',
      purchasedAt: '',
    },
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function onSubmit(values: FormValues) {
    await createHardware.mutateAsync({
      measurementId,
      color:       values.color,
      costTjs:     Number(values.costStr),
      purchasedAt: values.purchasedAt || null,
    })
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Фурнитура</h2>
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
          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hw-color">Цвет фурнитуры</Label>
            <select id="hw-color" {...register('color')} className={SELECT_CLASS}>
              {Object.entries(HARDWARE_COLORS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
          </div>

          {/* Cost */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hw-cost">Стоимость (сом)</Label>
            <Input
              id="hw-cost"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              {...register('costStr')}
            />
            {errors.costStr && (
              <p className="text-xs text-destructive">{errors.costStr.message}</p>
            )}
          </div>

          {/* Purchased date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hw-date">Дата покупки <span className="text-muted-foreground">(необязательно)</span></Label>
            <Input id="hw-date" type="date" {...register('purchasedAt')} />
          </div>

          {createHardware.isError && (
            <p className="text-sm text-destructive">
              {(createHardware.error as { response?: { status?: number } })?.response?.status === 409
                ? 'Фурнитура для этого замера уже добавлена.'
                : 'Ошибка. Попробуйте снова.'}
            </p>
          )}

          {/* Footer */}
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
