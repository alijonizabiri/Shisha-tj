import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

const TABS = [
  { to: '/analytics', label: 'Обзор', end: true },
  { to: '/analytics/finances', label: 'Финансы', end: false },
]

export function AnalyticsLayout() {
  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="border-b border-border px-6 pt-4">
        <nav className="flex gap-1" aria-label="Разделы аналитики">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'px-4 py-2 text-sm font-medium rounded-t-md border border-transparent transition-colors',
                  isActive
                    ? 'border-border border-b-background bg-background -mb-px text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Page content */}
      <Outlet />
    </div>
  )
}
