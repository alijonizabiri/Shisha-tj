import { UserPlus } from 'lucide-react'
import { useUsers } from './api'
import { Button } from '@/shared/ui/button'

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Администратор',
  Operator: 'Оператор',
  Measurer: 'Замерщик',
}

export function UsersPage() {
  const { data: users, isLoading, isError } = useUsers()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Пользователи</h1>
          {users && (
            <p className="text-sm text-muted-foreground">{users.length} пользователей</p>
          )}
        </div>
        <Button disabled>
          <UserPlus className="mr-2 h-4 w-4" />
          Новый пользователь
        </Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Не удалось загрузить пользователей.
        </div>
      )}

      <div className="rounded-md border border-border bg-card">
        <table className="w-full text-sm">
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
                  {user.measurerFixedFeeTjs != null
                    ? `${user.measurerFixedFeeTjs.toLocaleString('ru-RU')} сомони`
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-muted-foreground text-xs">—</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
