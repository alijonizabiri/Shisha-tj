import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, ClipboardList, LayoutDashboard, Package2, Ruler, Users, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/useAuth'

interface NavItem {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
  roles?: Array<'Admin' | 'Operator' | 'Measurer'>
}

const NAV: NavItem[] = [
  { label: 'Главная', to: '/', icon: LayoutDashboard },
  { label: 'Лиды', to: '/leads', icon: ClipboardList, roles: ['Admin', 'Operator'] },
  { label: 'Заказы на завод', to: '/factory-orders', icon: Package2, roles: ['Admin', 'Operator'] },
  { label: 'Дизайнер', to: '/designer', icon: Ruler },
  { label: 'Аналитика', to: '/analytics', icon: BarChart3, roles: ['Admin'] },
  { label: 'Пользователи', to: '/users', icon: Users, roles: ['Admin'] },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()

  const visible = NAV.filter(
    (item) => !item.roles || (user !== null && item.roles.includes(user.role)),
  )

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200',
        'md:static md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <span className="font-semibold tracking-tight">SHISHA_TJ</span>
        <button
          onClick={onClose}
          aria-label="Закрыть меню"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav aria-label="Главная навигация" className="flex flex-1 flex-col gap-1 p-2">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <p className="truncate text-xs font-medium text-foreground">{user?.email}</p>
        <p className="text-xs text-muted-foreground">{user?.role}</p>
      </div>
    </aside>
  )
}
