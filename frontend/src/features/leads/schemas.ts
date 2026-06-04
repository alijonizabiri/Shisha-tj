import { z } from 'zod'

export const createLeadSchema = z.object({
  name:     z.string().min(2, 'Мин. 2 символа').max(200),
  phone:    z.string().regex(/^\+?\d{9,15}$/, 'Формат: +992xxxxxxxxx'),
  address:  z.string().max(500).optional(),
  product:  z.string().min(1, 'Выберите продукт'),
  source:   z.string().max(100).optional(),
  note:     z.string().max(2000).optional(),
  callDate: z.string().min(1, 'Укажите дату звонка'),
})

export type CreateLeadFormValues = z.infer<typeof createLeadSchema>

export const refuseLeadSchema = z.object({
  refusalReasonId: z.string().min(1, 'Выберите причину отказа'),
  refusalNote:     z.string().max(2000).optional(),
})

export type RefuseLeadFormValues = z.infer<typeof refuseLeadSchema>
