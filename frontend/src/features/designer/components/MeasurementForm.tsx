import { type UseFormReturn } from 'react-hook-form'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { MeasurementFormValues } from '../schemas'
import {
  GLASS_COLOR_LABELS,
  HARDWARE_COLOR_LABELS,
  GlassColorValues,
  HardwareColorValues,
} from '../schemas'
import type { DesignerLeadOption } from '../api'

const STATUS_LABELS: Record<string, string> = {
  Measurement:      'Замер',
  Buying:           'Покупает',
  OrderedAtFactory: 'Заказ на завод',
  GlassArrived:     'Стекло пришло',
}

const SELECT_CLASS =
  'flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

interface Props {
  form: UseFormReturn<MeasurementFormValues>
  onSubmit: (values: MeasurementFormValues) => void
  leads: DesignerLeadOption[]
  isLoading?: boolean
  disableLeadSelector?: boolean
}

export function MeasurementForm({ form, onSubmit, leads, isLoading = false, disableLeadSelector = false }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form

  const configuration = watch('configuration')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

      {/* Lead selector */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Лид
        </h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leadId">Клиент *</Label>
          <select
            id="leadId"
            {...register('leadId')}
            className={SELECT_CLASS}
            disabled={disableLeadSelector}
          >
            <option value="">— Выберите лид —</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {STATUS_LABELS[l.status] ?? l.status}
              </option>
            ))}
          </select>
          {errors.leadId && <p className="text-xs text-destructive">{errors.leadId.message}</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Размеры
        </h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="measureMm">Ширина проёма (мм)</Label>
          <Input
            id="measureMm"
            type="number"
            inputMode="numeric"
            placeholder="например, 1560"
            {...register('measureMm', { valueAsNumber: true })}
          />
          {errors.measureMm && (
            <p className="text-xs text-destructive">{errors.measureMm.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="heightMm">Высота (мм)</Label>
          <Input
            id="heightMm"
            type="number"
            inputMode="numeric"
            placeholder="например, 2000"
            {...register('heightMm', { valueAsNumber: true })}
          />
          {errors.heightMm && (
            <p className="text-xs text-destructive">{errors.heightMm.message}</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Конфигурация
        </h2>

        <div className="flex flex-col gap-1.5">
          <Label>Тип кабины</Label>
          <div
            className="flex overflow-hidden rounded-md border border-input"
            role="group"
            aria-label="Тип кабины"
          >
            {(['TwoGlass', 'ThreeGlass'] as const).map((val) => (
              <label key={val} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  value={val}
                  {...register('configuration')}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'block select-none py-2 text-center text-sm transition-colors',
                    configuration === val
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {val === 'TwoGlass' ? '2 стекла' : '3 стекла'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="glassColor">Цвет стекла</Label>
          <select id="glassColor" {...register('glassColor')} className={SELECT_CLASS}>
            {GlassColorValues.map((v) => (
              <option key={v} value={v}>
                {GLASS_COLOR_LABELS[v]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hardwareColor">Цвет фурнитуры</Label>
          <select id="hardwareColor" {...register('hardwareColor')} className={SELECT_CLASS}>
            {HardwareColorValues.map((v) => (
              <option key={v} value={v}>
                {HARDWARE_COLOR_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </form>
  )
}
