import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { glassColorSchema, hardwareColorSchema, GLASS_COLOR_LABELS, HARDWARE_COLOR_LABELS, GlassColorValues, HardwareColorValues } from '../schemas'
import type { MeasurementFormValues } from '../schemas'
import { useEffect } from 'react'
import type { LShapeConfig, DoorMechanism, Panel } from '../lib/types'
import { buildLShapePanels } from '../lib/buildLShapePanels'
import type { LShapeInitValues } from '../lib/glassesToFormValues'
import { LeadCombobox } from './LeadCombobox'
import { useProducts } from '@/features/leads/api'
import { toast } from 'sonner'

const SELECT_CLASS =
  'flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

// ── L-shape schema ────────────────────────────────────────────────────────────

const L_SHAPE_CONFIGS: LShapeConfig[] = [
  'DoorOnA_NearWall',
  'DoorOnA_NearCorner',
  'DoorOnB_NearWall',
  'DoorOnB_NearCorner',
  'DoorsAtCorner',
]

const lShapeSchema = z.object({
  leadId:        z.string().min(1, 'Выберите лид'),
  product:       z.string().min(1, 'Выберите продукт'),
  wallAMm:       z.number().min(900, 'Минимальная ширина стены 900мм').max(3000, 'Макс. 3000'),
  wallBMm:       z.number().min(900, 'Минимальная ширина стены 900мм').max(3000, 'Макс. 3000'),
  heightMm:      z.number().min(1500, 'Мин. 1500').max(2500, 'Макс. 2500'),
  config:        z.enum(['DoorOnA_NearWall', 'DoorOnA_NearCorner', 'DoorOnB_NearWall', 'DoorOnB_NearCorner', 'DoorsAtCorner']),
  mechanism:     z.enum(['Hinge', 'Roller']),
  doorWidthAMm:  z.number().min(600, 'Минимальная ширина двери 600мм').max(800, 'Макс. 800'),
  doorWidthBMm:  z.number().min(500, 'Мин. 500').max(800, 'Макс. 800').optional(),
  doorHinge:     z.enum(['Left', 'Right']),
  glassColor:    glassColorSchema,
  hardwareColor: hardwareColorSchema,
  deliveryTjs:   z.number().min(0),
  depositTjs:    z.number().min(0),
}).superRefine((data, ctx) => {
  // DoorsAtCorner forces Roller; Hinge is physically impossible
  if (data.config === 'DoorsAtCorner' && data.mechanism === 'Hinge') {
    ctx.addIssue({
      code: 'custom',
      path: ['mechanism'],
      message: 'Петли невозможны при двух дверях в углу. Используйте ролик.',
    })
  }

  // Door-fits-in-wall check
  if (data.config === 'DoorOnA_NearWall' || data.config === 'DoorOnA_NearCorner') {
    if (data.doorWidthAMm >= data.wallAMm) {
      ctx.addIssue({ code: 'custom', path: ['doorWidthAMm'], message: 'Дверь шире или равна стене A' })
    }
    if (data.mechanism === 'Roller' && data.doorWidthAMm > data.wallAMm / 2) {
      ctx.addIssue({
        code: 'custom', path: ['doorWidthAMm'],
        message: `При роликовом механизме ширина двери не должна превышать ${Math.floor(data.wallAMm / 2)} мм (половину стены A)`,
      })
    }
  } else if (data.config === 'DoorOnB_NearWall' || data.config === 'DoorOnB_NearCorner') {
    if (data.doorWidthAMm >= data.wallBMm) {
      ctx.addIssue({ code: 'custom', path: ['doorWidthAMm'], message: 'Дверь шире или равна стене B' })
    }
    if (data.mechanism === 'Roller' && data.doorWidthAMm > data.wallBMm / 2) {
      ctx.addIssue({
        code: 'custom', path: ['doorWidthAMm'],
        message: `При роликовом механизме ширина двери не должна превышать ${Math.floor(data.wallBMm / 2)} мм (половину стены B)`,
      })
    }
  } else if (data.config === 'DoorsAtCorner') {
    if (data.doorWidthAMm >= data.wallAMm) {
      ctx.addIssue({ code: 'custom', path: ['doorWidthAMm'], message: 'Дверь A шире или равна стене A' })
    }
    if (data.mechanism === 'Roller' && data.doorWidthAMm > data.wallAMm / 2) {
      ctx.addIssue({
        code: 'custom', path: ['doorWidthAMm'],
        message: `При роликовом механизме ширина двери A не должна превышать ${Math.floor(data.wallAMm / 2)} мм`,
      })
    }
    const doorB = data.doorWidthBMm ?? data.doorWidthAMm
    if (doorB >= data.wallBMm) {
      ctx.addIssue({ code: 'custom', path: ['doorWidthBMm'], message: 'Дверь B шире или равна стене B' })
    }
    if (data.mechanism === 'Roller' && doorB > data.wallBMm / 2) {
      ctx.addIssue({
        code: 'custom', path: ['doorWidthBMm'],
        message: `При роликовом механизме ширина двери B не должна превышать ${Math.floor(data.wallBMm / 2)} мм`,
      })
    }
  }
})

type LShapeValues = z.infer<typeof lShapeSchema>

// SVG top-view diagrams for each config (wall A = horizontal, wall B = vertical on right)
function ConfigIcon({ config, active }: { config: LShapeConfig; active: boolean }) {
  // Walls: always grey contour. Door: always solid gold. Active door gets pulse.
  const w = '#9ca3af'        // wall stroke (grey-400)
  const d = '#c9a84c'        // door fill + stroke (gold)
  const dp = active ? 'animate-pulse' : ''   // pulse only on selected card

  const ay = 4; const ah = 6
  const bx = 34; const bw = 6
  const by = 10; const bh = 22

  // Full walls (no door)
  const aFull   = <rect x="4"  y={ay} width="36" height={ah} fill="none" stroke={w} strokeWidth="1.5" />
  const bFull   = <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke={w} strokeWidth="1.5" />

  // Wall A split: door on left (NearWall) / door on right (NearCorner)
  const aDoorL  = <rect x="4"  y={ay} width="20" height={ah} fill={d} stroke={d} strokeWidth="1.5" className={dp} />
  const aRemR   = <rect x="24" y={ay} width="16" height={ah} fill="none" stroke={w} strokeWidth="1.5" />
  const aRemL   = <rect x="4"  y={ay} width="16" height={ah} fill="none" stroke={w} strokeWidth="1.5" />
  const aDoorR  = <rect x="20" y={ay} width="20" height={ah} fill={d} stroke={d} strokeWidth="1.5" className={dp} />

  // Wall B split: door on top (NearCorner) / door on bottom (NearWall)
  const bDoorT  = <rect x={bx} y={by}    width={bw} height="12" fill={d} stroke={d} strokeWidth="1.5" className={dp} />
  const bRemBo  = <rect x={bx} y={by+12} width={bw} height="10" fill="none" stroke={w} strokeWidth="1.5" />
  const bRemTo  = <rect x={bx} y={by}    width={bw} height="10" fill="none" stroke={w} strokeWidth="1.5" />
  const bDoorBo = <rect x={bx} y={by+10} width={bw} height="12" fill={d} stroke={d} strokeWidth="1.5" className={dp} />

  switch (config) {
    case 'DoorOnA_NearWall':   return <svg viewBox="0 0 44 36" className="h-8 w-12" fill="none">{aDoorL}{aRemR}{bFull}</svg>
    case 'DoorOnA_NearCorner': return <svg viewBox="0 0 44 36" className="h-8 w-12" fill="none">{aRemL}{aDoorR}{bFull}</svg>
    case 'DoorOnB_NearWall':   return <svg viewBox="0 0 44 36" className="h-8 w-12" fill="none">{aFull}{bRemTo}{bDoorBo}</svg>
    case 'DoorOnB_NearCorner': return <svg viewBox="0 0 44 36" className="h-8 w-12" fill="none">{aFull}{bDoorT}{bRemBo}</svg>
    case 'DoorsAtCorner':      return <svg viewBox="0 0 44 36" className="h-8 w-12" fill="none">{aRemL}{aDoorR}{bDoorT}{bRemBo}</svg>
  }
}

const CONFIG_LABELS: Record<LShapeConfig, string> = {
  DoorOnA_NearWall:   'Дверь A у стены',
  DoorOnA_NearCorner: 'Дверь A у угла',
  DoorOnB_NearWall:   'Дверь B у стены',
  DoorOnB_NearCorner: 'Дверь B у угла',
  DoorsAtCorner:      'Две двери в углу',
}

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
  storageKey?: string
  lshapeInit?: LShapeInitValues
  onApply: (values: MeasurementFormValues, panels: Panel[]) => void
}

// ── CabinSetForm ──────────────────────────────────────────────────────────────

export function CabinSetForm({ cabinType, initialValues, disableLeadSelector, storageKey, lshapeInit, onApply }: Props) {
  if (cabinType === 'lshape') {
    return (
      <LShapeForm
        initialValues={initialValues}
        disableLeadSelector={disableLeadSelector}
        storageKey={storageKey}
        lshapeInit={lshapeInit}
        onApply={onApply}
      />
    )
  }
  return (
    <CurvedForm initialValues={initialValues} disableLeadSelector={disableLeadSelector} onApply={onApply} />
  )
}

function LShapeForm({ initialValues, disableLeadSelector, storageKey, lshapeInit, onApply }: Omit<Props, 'cabinType'>) {
  const { data: products = [] } = useProducts()

  // Priority: lshapeInit (from backend) > localStorage > blank defaults
  const savedJson = storageKey ? localStorage.getItem(`${storageKey}_lshape`) : null
  const saved = savedJson ? (() => { try { return JSON.parse(savedJson) as Partial<LShapeValues> } catch { return null } })() : null
  const src = lshapeInit
    ? { wallAMm: lshapeInit.wallAMm, wallBMm: lshapeInit.wallBMm, heightMm: lshapeInit.heightMm,
        config: lshapeInit.config, mechanism: lshapeInit.mechanism,
        doorWidthAMm: lshapeInit.doorWidthAMm, doorWidthBMm: lshapeInit.doorWidthBMm,
        doorHinge: lshapeInit.doorHinge }
    : saved ?? {}
  const wasRestored = !lshapeInit && !!saved

  const form = useForm<LShapeValues>({
    resolver: zodResolver(lShapeSchema),
    mode: 'onBlur',
    defaultValues: {
      leadId:        initialValues.leadId,
      product:       initialValues.product,
      wallAMm:       (src.wallAMm as number | undefined) ?? undefined,
      wallBMm:       (src.wallBMm as number | undefined) ?? undefined,
      heightMm:      (src.heightMm as number | undefined) ?? initialValues.heightMm,
      config:        (src.config as LShapeConfig | undefined) ?? 'DoorOnA_NearWall',
      mechanism:     (src.mechanism as DoorMechanism | undefined) ?? 'Hinge',
      doorWidthAMm:  (src.doorWidthAMm as number | undefined) ?? undefined,
      doorWidthBMm:  (src.doorWidthBMm as number | undefined) ?? undefined,
      doorHinge:     (src.doorHinge as 'Left' | 'Right' | undefined) ?? 'Left',
      glassColor:    initialValues.glassColor,
      hardwareColor: initialValues.hardwareColor,
      deliveryTjs:   initialValues.deliveryTjs,
      depositTjs:    initialValues.depositTjs,
    },
  })

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = form
  const config = watch('config')
  const mechanism = watch('mechanism') as DoorMechanism
  const isDoorsAtCorner = config === 'DoorsAtCorner'
  const mechanismLocked = isDoorsAtCorner

  // Show toast once when data is restored from localStorage
  useEffect(() => {
    if (wasRestored) {
      toast.info('Восстановлены данные прошлой сессии', {
        action: {
          label: 'Очистить',
          onClick: () => {
            if (storageKey) localStorage.removeItem(`${storageKey}_lshape`)
            form.reset({
              leadId: initialValues.leadId, product: initialValues.product,
              heightMm: initialValues.heightMm, config: 'DoorOnA_NearWall',
              mechanism: 'Hinge', doorHinge: 'Left',
              glassColor: initialValues.glassColor, hardwareColor: initialValues.hardwareColor,
              deliveryTjs: initialValues.deliveryTjs, depositTjs: initialValues.depositTjs,
              wallAMm: undefined as unknown as number, wallBMm: undefined as unknown as number,
              doorWidthAMm: undefined as unknown as number,
            })
          },
        },
        duration: 6000,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist to localStorage on every change
  useEffect(() => {
    if (!storageKey) return
    const sub = form.watch((values) => {
      localStorage.setItem(`${storageKey}_lshape`, JSON.stringify(values))
    })
    return () => sub.unsubscribe()
  }, [form, storageKey])

  function handleConfigChange(cfg: LShapeConfig) {
    setValue('config', cfg, { shouldValidate: true })
    if (cfg === 'DoorsAtCorner') {
      setValue('mechanism', 'Roller', { shouldValidate: true })
    }
  }

  function onSubmit(v: LShapeValues) {
    const panels = buildLShapePanels({
      config: v.config,
      wallAMm: v.wallAMm,
      wallBMm: v.wallBMm,
      heightMm: v.heightMm,
      doorWidthAMm: v.doorWidthAMm,
      doorWidthBMm: v.doorWidthBMm,
      mechanism: v.mechanism as DoorMechanism,
      hingeSide: v.doorHinge,
    })
    const totalWidth = v.wallAMm + v.wallBMm
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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Размеры</h2>

        {/* Wall A */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Стена A (горизонтальная)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Общая ширина (мм)</Label>
              <Input type="number" inputMode="numeric" placeholder="1300" {...register('wallAMm', { valueAsNumber: true })} />
              {errors.wallAMm && <p className="text-xs text-destructive">{errors.wallAMm.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Высота (мм)</Label>
              <Input type="number" inputMode="numeric" placeholder="2000" {...register('heightMm', { valueAsNumber: true })} />
              {errors.heightMm && <p className="text-xs text-destructive">{errors.heightMm.message}</p>}
            </div>
          </div>
        </div>

        {/* Wall B */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Стена B (вертикальная)</h3>
          <div className="flex flex-col gap-1.5">
            <Label>Общая ширина (мм)</Label>
            <Input type="number" inputMode="numeric" placeholder="1300" {...register('wallBMm', { valueAsNumber: true })} />
            {errors.wallBMm && <p className="text-xs text-destructive">{errors.wallBMm.message}</p>}
            <p className="text-xs text-muted-foreground">Высота та же, что у стены A</p>
          </div>
        </div>

        {/* Door width(s) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{isDoorsAtCorner ? 'Ширина двери A (мм)' : 'Ширина двери (мм)'}</Label>
            <Input type="number" inputMode="numeric" placeholder="700" {...register('doorWidthAMm', { valueAsNumber: true })} />
            {errors.doorWidthAMm && <p className="text-xs text-destructive">{errors.doorWidthAMm.message}</p>}
          </div>
          {isDoorsAtCorner && (
            <div className="flex flex-col gap-1.5">
              <Label>Ширина двери B (мм)</Label>
              <Input type="number" inputMode="numeric" placeholder="700" {...register('doorWidthBMm', { valueAsNumber: true })} />
              {errors.doorWidthBMm && <p className="text-xs text-destructive">{errors.doorWidthBMm.message}</p>}
            </div>
          )}
          {mechanism === 'Hinge' && (
            <div className="flex flex-col gap-1.5">
              <Label>Сторона петель</Label>
              <select {...register('doorHinge')} className={SELECT_CLASS}>
                <option value="Left">Слева</option>
                <option value="Right">Справа</option>
              </select>
            </div>
          )}
        </div>

        {/* Mechanism picker */}
        <div className="flex flex-col gap-2">
          <Label>Тип крепления двери</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['Hinge', 'Roller'] as const).map((m) => {
              const isActive = mechanism === m
              const disabled = mechanismLocked && m === 'Hinge'
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setValue('mechanism', m, { shouldValidate: true })}
                  className={[
                    'flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors',
                    disabled
                      ? 'cursor-not-allowed border-border opacity-40'
                      : isActive
                        ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]'
                        : 'border-border text-muted-foreground hover:border-muted-foreground',
                  ].join(' ')}
                >
                  <span className="text-xl">{m === 'Hinge' ? '🔩' : '🎿'}</span>
                  <span className="text-xs font-medium">{m === 'Hinge' ? 'Петли' : 'Ролик'}</span>
                </button>
              )
            })}
          </div>
          {mechanismLocked && (
            <p className="text-xs text-muted-foreground">
              Для двух дверей в углу возможен только роликовый механизм
            </p>
          )}
          {errors.mechanism && <p className="text-xs text-destructive">{errors.mechanism.message}</p>}
        </div>

        {/* Config selector */}
        <div className="flex flex-col gap-2">
          <Label>Расположение двери</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {L_SHAPE_CONFIGS.map((cfg) => (
              <button
                key={cfg}
                type="button"
                onClick={() => handleConfigChange(cfg)}
                className={[
                  'flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors text-center',
                  config === cfg
                    ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]'
                    : 'border-border text-muted-foreground hover:border-muted-foreground',
                ].join(' ')}
              >
                <ConfigIcon config={cfg} active={config === cfg} />
                <span className="text-[10px] leading-tight font-medium">{CONFIG_LABELS[cfg]}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Остаток стены крепится к бетонной стене или углу</p>
          {errors.config && <p className="text-xs text-destructive">{errors.config.message}</p>}
        </div>
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
