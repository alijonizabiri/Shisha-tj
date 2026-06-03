import { z } from 'zod'

export const glassColorSchema = z.enum(['Transparent', 'Matte', 'Iodine', 'Gray', 'EuroBronze'])
export const hardwareColorSchema = z.enum(['BlackMatte', 'Gold', 'Nickel', 'MatteGold', 'WetAsphalt'])

export type GlassColor = z.infer<typeof glassColorSchema>
export type HardwareColor = z.infer<typeof hardwareColorSchema>

export const GlassColorValues: readonly GlassColor[] = ['Transparent', 'Matte', 'Iodine', 'Gray', 'EuroBronze']
export const HardwareColorValues: readonly HardwareColor[] = ['BlackMatte', 'Gold', 'Nickel', 'MatteGold', 'WetAsphalt']

export const measurementFormSchema = z.object({
  measureMm: z.number().min(600, 'Мин. 600 мм').max(3000, 'Макс. 3000 мм'),
  heightMm: z.number().min(1500, 'Мин. 1500 мм').max(2500, 'Макс. 2500 мм'),
  configuration: z.enum(['TwoGlass', 'ThreeGlass']),
  glassColor: glassColorSchema,
  hardwareColor: hardwareColorSchema,
  clientName: z.string().min(2, 'Мин. 2 символа').max(100),
  clientPhone: z.string().regex(/^\+?\d{9,15}$/, 'Формат: +992xxxxxxxxx'),
  clientAddress: z.string().max(200).optional(),
  deliveryTjs: z.number().min(0, 'Мин. 0 сом'),
  depositTjs: z.number().min(0, 'Мин. 0 сом'),
})

export type MeasurementFormValues = z.infer<typeof measurementFormSchema>

export const GLASS_COLOR_LABELS: Record<GlassColor, string> = {
  Transparent: 'Прозрачное',
  Matte: 'Матовое',
  Iodine: 'Йод',
  Gray: 'Серое',
  EuroBronze: 'Евробронза',
}

export const HARDWARE_COLOR_LABELS: Record<HardwareColor, string> = {
  BlackMatte: 'Матовый чёрный',
  Gold: 'Золото',
  Nickel: 'Никель',
  MatteGold: 'Матовое золото',
  WetAsphalt: 'Мокрый асфальт',
}
