import { useState } from 'react'
import { UserPlus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { useUsers, useCreateUser, useUpdateMeasurerFee, useDeleteUser } from './api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Администратор',
  Operator: 'Оператор',
  Measurer: 'Замерщик',
}

const createUserSchema = z
  .object({
    fullName: z.string().min(2, 'Минимум 2 символа'),
    email: z.string().email('Некорректный email'),
    password: z.string().min(6, 'Минимум 6 символов'),
    role: z.enum(['Admin', 'Operator', 'Measurer']),
    measurerFixedFeeTjs: z.number().min(0, 'Мин. 0').nullable().optional(),
  })
  .refine(
    (v) => v.role !== 'Measurer' || (v.measurerFixedFeeTjs != null && v.measurerFixedFeeTjs > 0),
    { message: 'Для замерщика необходимо указать ставку', path: ['measurerFixedFeeTjs'] },
  )

type CreateUserFormValues = z.infer<typeof createUserSchema>

const SELECT_CLASS =
  'flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function NewUserDialog({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'Operator' },
  })

  const role = watch('role')

  async function onSubmit(values: CreateUserFormValues) {
    try {
      await createUser.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role,
        measurerFixedFeeTjs: values.role === 'Measurer' ? (values.measurerFixedFeeTjs ?? null) : null,
      })
      toast.success('Пользователь создан')
      onClose()
    } catch {
      toast.error('Ошибка создания пользователя')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Новый пользователь</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Имя *</Label>
            <Input id="fullName" {...register('fullName')} placeholder="Иван Иванов" />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register('email')} placeholder="user@example.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Пароль *</Label>
            <Input id="password" type="password" {...register('password')} placeholder="Минимум 6 символов" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Роль *</Label>
            <select id="role" {...register('role')} className={SELECT_CLASS}>
              <option value="Admin">Администратор</option>
              <option value="Operator">Оператор</option>
              <option value="Measurer">Замерщик</option>
            </select>
          </div>

          {role === 'Measurer' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="measurerFixedFeeTjs">Ставка замерщика (сомони) *</Label>
              <Input
                id="measurerFixedFeeTjs"
                type="number"
                inputMode="numeric"
                min={0}
                {...register('measurerFixedFeeTjs', { valueAsNumber: true })}
                placeholder="например, 200"
              />
              {errors.measurerFixedFeeTjs && (
                <p className="text-xs text-destructive">{errors.measurerFixedFeeTjs.message}</p>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Создание…' : 'Создать'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditFeeCell({ userId, current }: { userId: string; current: number | null }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(current ?? ''))
  const updateFee = useUpdateMeasurerFee()

  async function save() {
    const fee = value === '' ? null : Number(value)
    try {
      await updateFee.mutateAsync({ userId, feeTjs: fee })
      toast.success('Ставка обновлена')
      setEditing(false)
    } catch {
      toast.error('Ошибка обновления ставки')
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-24 text-xs"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
        />
        <button onClick={() => void save()} className="text-green-600 hover:text-green-700">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-sm hover:text-primary"
      title="Изменить ставку"
    >
      <span>{current != null ? `${current.toLocaleString('ru-RU')} сом` : <span className="text-muted-foreground">—</span>}</span>
      <Pencil className="h-3 w-3 text-muted-foreground" />
    </button>
  )
}

export function UsersPage() {
  const { data: users, isLoading, isError } = useUsers()
  const deleteUser = useDeleteUser()
  const [newUserOpen, setNewUserOpen] = useState(false)

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`Удалить пользователя "${name}"?`)) return
    try {
      await deleteUser.mutateAsync(userId)
      toast.success('Пользователь удалён')
    } catch {
      toast.error('Ошибка удаления')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Toaster richColors position="top-right" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Пользователи</h1>
          {users && (
            <p className="text-sm text-muted-foreground">{users.length} пользователей</p>
          )}
        </div>
        <Button onClick={() => setNewUserOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Новый пользователь</span>
          <span className="sm:hidden">Добавить</span>
        </Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось загрузить пользователей.
        </div>
      )}

      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Имя</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Ставка замерщика</th>
              <th className="px-4 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Загрузка...
                </td>
              </tr>
            )}
            {!isLoading && users?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Пользователей нет.
                </td>
              </tr>
            )}
            {users?.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                <td className="px-4 py-3 font-medium">{user.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.role === 'Measurer' ? (
                    <EditFeeCell userId={user.id} current={user.measurerFixedFeeTjs} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => void handleDelete(user.id, user.fullName)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {newUserOpen && <NewUserDialog onClose={() => setNewUserOpen(false)} />}
    </div>
  )
}
