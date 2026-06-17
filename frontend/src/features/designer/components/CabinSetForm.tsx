import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { glassColorSchema, hardwareColorSchema, GLASS_COLOR_LABELS, HARDWARE_COLOR_LABELS, GlassColorValues, HardwareColorValues } from '../schemas'
import type { MeasurementFormValues } from '../schemas'
import type { Panel } from '../lib/types'
import { LeadCombobox } from './LeadCombobox'
import { useProducts } from '@/features/leads/api'

const SELECT_CLASS =
  'flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

// ── L-shape schema ────────────────────────────────────────────────────────────

const lShapeSchema = z.object({
  leadId:        z.string().min(1, 'Выберите лид'),
  product:       z.string().min(1, 'Выберите продукт'),
  heightMm:      z.number().min(1500, 'Мин. 1500').max(2500, 'Макс. 2500'),
  leftWidthMm:   z.number().min(200, 'Мин. 200').max(3000, 'Макс. 3000'),
  rightWidthMm:  z.number().min(200, 'Мин. 200').max(3000, 'Макс. 3000'),
  doorWidthMm:   z.number().min(500, 'Мин. 500').max(800, 'Макс. 800'),
  doorSide:      z.enum(['Left', 'Right']),
  glassColor:    glassColorSchema,
  hardwareColor: hardwareColorSchema,
  deliveryTjs:   z.number().min(0),
  depositTjs:    z.number().min(0),
})

type LShapeValues = z.infer<typeof lShapeSchema>

// ── Curved schema ─────────────────────────────────────────────────────────────

const curvedSchema = z.object({
  leadId:             z.string().min(1, 'Выберите лид'),
  product:            z.string().min(1, 'Выберите продукт'),
  heightMm:           z.number().min(1500, 'Мин. 1500').max(2500, 'Макс. 2500'),
  widthMm:            z.number().min(200, 'Мин. 200').max(3000, 'Макс. 3000'),
  curvatureRadiusMm:  z.number().min(100, 'Мин. 100 мм'),
  hasDoor:            z.boolean(),
  doorWidthMm:        z.number().min(500, 'Мин. 500').max(800, 'Макс. 800').optional(),
  glassColor:         glassColorSchema,
  hardwareColor:      hardwareColorSchema,
  deliveryTjs:        z.number().min(0),
  depositTjs:         z.number().min(0),
})

type CurvedValues = z.infer<typeof curvedSchema>

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  cabinType: 'lshape' | 'curved'
  initialValues: MeasurementFormValues
  disableLeadSelector?: boolean
  onApply: (values: MeasurementFormValues, panels: Panel[]) => void
}

// ── LShapeForm ────────────────────────────────────────────────────────────────

export function CabinSetForm({ cabinType, initialValues, disableLeadSelector, onApply }: Props) {
  if (cabinType === 'lshape') {
    return (
      <LShapeForm initialValues={initialValues} disableLeadSelector={disableLeadSelector} onApply={onApply} />
    )
  }
  return (
    <CurvedForm initialValues={initialValues} disableLeadSelector={disableLeadSelector} onApply={onApply} />
  )
}

function LShapeForm({ initialValues, disableLeadSelector, onApply }: Omit<Props, 'cabinType'>) {
  const { data: products = [] } = useProducts()

  const form = useForm<LShapeValues>({
    resolver: zodResolver(lShapeSchema),
    mode: 'onBlur',
    defaultValues: {
      leadId:        initialValues.leadId,
      product:       initialValues.product,
      heightMm:      initialValues.heightMm,
      leftWidthMm:   undefined,
      rightWidthMm:  undefined,
      doorWidthMm:   undefined,
      doorSide:      'Left',
      glassColor:    initialValues.glassColor,
      hardwareColor: initialValues.hardwareColor,
      deliveryTjs:   initialValues.deliveryTjs,
      depositTjs:    initialValues.depositTjs,
    },
  })

  const { register, handleSubmit, control, formState: { errors } } = form

  function onSubmit(v: LShapeValues) {
    const setId = crypto.randomUUID()
    const panels: Panel[] = [
      { id: crypto.randomUUID(), widthMm: v.leftWidthMm,  heightMm: v.heightMm, isDoor: false, position: 0, shape: 'LShapeLeft',  setId },
      { id: crypto.randomUUID(), widthMm: v.rightWidthMm, heightMm: v.heightMm, isDoor: false, position: 1, shape: 'LShapeRight', setId },
      { id: crypto.randomUUID(), widthMm: v.doorWidthMm,  heightMm: v.heightMm, isDoor: true,  position: 2, shape: 'Flat',       setId },
    ]
    const totalWidth = panels.reduce((s, p) => s + p.widthMm, 0)
    const measureMm = Math.max(600, Math.min(3000, totalWidth - 40))
    const measurementValues: MeasurementFormValues = {
      leadId:        v.leadId,
      product:       v.product,
      measureMm,
      heightMm:      v.heightMm,
      glassColor:    v.glassColor,
      hardwareColor: v.hardwareColor,
      deliveryTjs:   v.deliveryTjs,
      depositTjs:    v.depositTjs,
    }
    onApply(measurementValues, panels)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <SharedLeadProduct
        control={control}
        register={register}
        errors={errors as Record<string, { message?: string } | undefined>}
        disableLeadSelector={disableLeadSelector}
        products={products}
      />

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium mb-3">Левая стенка</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Ширина (мм)</Label>
              <Input type="number" inputMode="numeric" placeholder="800" {...register('leftWidthMm', { valueAsNumber: true })} />
              {errors.leftWidthMm && <p className="text-xs text-destructive">{errors.leftWidthMm.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Высота (мм)</Label>
              <Input type="number" inputMode="numeric" placeholder="2000" {...register('heightMm', { valueAsNumber: true })} />
              {errors.heightMm && <p className="text-xs text-destructive">{errors.heightMm.message}</p>}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Правая стенка</h3>
          <div className="flex flex-col gap-1.5">
            <Label>Ширина (мм)</Label>
            <Input type="number" inputMode="numeric" placeholder="800" {...register('rightWidthMm', { valueAsNumber: true })} />
            {errors.rightWidthMm && <p className="text-xs text-destructive">{errors.rightWidthMm.message}</p>}
            <p className="text-xs text-muted-foreground">Высота берётся из левой стенки — одинаковая</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Дверь</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Ширина (мм)</Label>
              <Input type="number" inputMode="numeric" placeholder="700" {...register('doorWidthMm', { valueAsNumber: true })} />
              {errors.doorWidthMm && <p className="text-xs text-destructive">{errors.doorWidthMm.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Петли</Label>
              <select {...register('doorSide')} className={SELECT_CLASS}>
                <option value="Left">Слева</option>
                <option value="Right">Справа</option>
              </select>
              {errors.doorSide && <p className="text-xs text-destructive">{errors.doorSide.message}</p>}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Высота всех панелей одинакова. Дверь входит в состав кабины.</p>
      </section>

      <SharedColors
        register={register}
        errors={errors as Record<string, { message?: string } | undefined>}
      />

      <Button type="submit" className="w-full">Применить</Button>
    </form>
  )
}

function CurvedForm({ initialValues, disableLeadSelector, onApply }: Omit<Props, 'cabinType'>) {
  const { data: products = [] } = useProducts()

  const form = useForm<CurvedValues>({
    resolver: zodResolver(curvedSchema),
    mode: 'onBlur',
    defaultValues: {
      leadId:            initialValues.leadId,
      product:           initialValues.product,
      heightMm:          initialValues.heightMm,
      widthMm:           undefined,
      curvatureRadiusMm: undefined,
      hasDoor:           false,
      doorWidthMm:       undefined,
      glassColor:        initialValues.glassColor,
      hardwareColor:     initialValues.hardwareColor,
      deliveryTjs:       initialValues.deliveryTjs,
      depositTjs:        initialValues.depositTjs,
    },
  })

  const { register, handleSubmit, control, watch, formState: { errors } } = form
  const hasDoor = watch('hasDoor')

  function onSubmit(v: CurvedValues) {
    const setId = crypto.randomUUID()
    let position = 0
    const panels: Panel[] = [
      {
        id: crypto.randomUUID(),
        widthMm: v.widthMm,
        heightMm: v.heightMm,
        isDoor: false,
        position: position++,
        shape: 'Curved',
        setId,
        curvatureRadiusMm: v.curvatureRadiusMm,
      },
    ]
    if (v.hasDoor && v.doorWidthMm) {
      panels.push({ id: crypto.randomUUID(), widthMm: v.doorWidthMm, heightMm: v.heightMm, isDoor: true, position: position++, shape: 'Flat', setId })
    }
    const totalWidth = panels.reduce((s, p) => s + p.widthMm, 0)
    const measureMm = Math.max(600, Math.min(3000, totalWidth - 40))
    const measurementValues: MeasurementFormValues = {
      leadId:        v.leadId,
      product:       v.product,
      measureMm,
      heightMm:      v.heightMm,
      glassColor:    v.glassColor,
      hardwareColor: v.hardwareColor,
      deliveryTjs:   v.deliveryTjs,
      depositTjs:    v.depositTjs,
    }
    onApply(measurementValues, panels)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <SharedLeadProduct
        control={control}
        register={register}
        errors={errors as Record<string, { message?: string } | undefined>}
        disableLeadSelector={disableLeadSelector}
        products={products}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Размеры</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Ширина (мм)</Label>
            <Input type="number" inputMode="numeric" placeholder="900" {...register('widthMm', { valueAsNumber: true })} />
            {errors.widthMm && <p className="text-xs text-destructive">{errors.widthMm.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Высота (мм)</Label>
            <Input type="number" inputMode="numeric" placeholder="2000" {...register('heightMm', { valueAsNumber: true })} />
            {errors.heightMm && <p className="text-xs text-destructive">{errors.heightMm.message}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Радиус кривизны (мм)</Label>
          <Input type="number" inputMode="numeric" placeholder="1200" {...register('curvatureRadiusMm', { valueAsNumber: true })} />
          {errors.curvatureRadiusMm && <p className="text-xs text-destructive">{errors.curvatureRadiusMm.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input id="curved-hasDoor" type="checkbox" className="h-4 w-4" {...register('hasDoor')} />
          <Label htmlFor="curved-hasDoor">Добавить дверь</Label>
        </div>

        {hasDoor && (
          <div className="flex flex-col gap-1.5 pl-6">
            <Label>Ширина двери (мм)</Label>
            <Input type="number" inputMode="numeric" placeholder="700" {...register('doorWidthMm', { valueAsNumber: true })} />
            {errors.doorWidthMm && <p className="text-xs text-destructive">{errors.doorWidthMm.message}</p>}
          </div>
        )}
      </section>

      <SharedColors
        register={register}
        errors={errors as Record<string, { message?: string } | undefined>}
      />

      <Button type="submit" className="w-full">Применить</Button>
    </form>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SharedLeadProduct({ control, register, errors, disableLeadSelector, products }: any) {
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Лид</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cs-lead">Клиент *</Label>
          <Controller
            control={control}
            name="leadId"
            render={({ field }: { field: { value: string; onChange: (v: string) => void } }) => (
              <LeadCombobox id="cs-lead" value={field.value} onChange={field.onChange} disabled={disableLeadSelector} />
            )}
          />
          {errors.leadId && <p className="text-xs text-destructive">{errors.leadId.message}</p>}
        </div>
      </section>

      <div className="flex flex-col gap-1.5 my-1">
        <Label htmlFor="cs-product">Продукт *</Label>
        {products.length > 0 ? (
          <select id="cs-product" {...register('product')} className={SELECT_CLASS}>
            <option value="">— Выберите —</option>
            {products.filter((p: { isActive: boolean }) => p.isActive).map((p: { id: string; name: string }) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        ) : (
          <Input id="cs-product" placeholder="Душевая кабина" {...register('product')} />
        )}
        {errors.product && <p className="text-xs text-destructive">{errors.product.message}</p>}
      </div>
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SharedColors({ register, errors }: any) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Параметры</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cs-glassColor">Цвет стекла</Label>
        <select id="cs-glassColor" {...register('glassColor')} className={SELECT_CLASS}>
          {GlassColorValues.map((v) => (
            <option key={v} value={v}>{GLASS_COLOR_LABELS[v]}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cs-hardwareColor">Цвет фурнитуры</Label>
        <select id="cs-hardwareColor" {...register('hardwareColor')} className={SELECT_CLASS}>
          {HardwareColorValues.map((v) => (
            <option key={v} value={v}>{HARDWARE_COLOR_LABELS[v]}</option>
          ))}
        </select>
      </div>
      {errors.glassColor && <p className="text-xs text-destructive">{errors.glassColor.message}</p>}
    </section>
  )
}

// ── Cabin type card icons ─────────────────────────────────────────────────────

export function CabinTypeCards({
  selected,
  onChange,
}: {
  selected: 'flat' | 'lshape' | 'curved'
  onChange: (type: 'flat' | 'lshape' | 'curved') => void
}) {
  const types: Array<{ id: 'flat' | 'lshape' | 'curved'; label: string; icon: React.ReactNode }> = [
    {
      id: 'flat',
      label: 'Плоская',
      icon: (
        <svg viewBox="0 0 48 32" className="h-8 w-12" fill="none">
          <rect x="4" y="4" width="40" height="24" stroke="currentColor" strokeWidth="2" rx="1" />
        </svg>
      ),
    },
    {
      id: 'lshape',
      label: 'Г-образная',
      icon: (
        <svg viewBox="0 0 48 32" className="h-8 w-12" fill="none">
          <rect x="4"  y="4"  width="18" height="24" stroke="currentColor" strokeWidth="2" rx="1" />
          <rect x="26" y="4"  width="18" height="24" stroke="currentColor" strokeWidth="2" rx="1" />
          <line x1="22" y1="28" x2="26" y2="28" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: 'curved',
      label: 'Полукруглая',
      icon: (
        <svg viewBox="0 0 48 32" className="h-8 w-12" fill="none">
          <path d="M8 28 Q24 2 40 28" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="8" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Тип кабины</h2>
      <div className="grid grid-cols-3 gap-2">
        {types.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors',
              selected === id
                ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]'
                : 'border-border text-muted-foreground hover:border-muted-foreground',
            ].join(' ')}
          >
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
