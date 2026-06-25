import { Menu, Moon, Sun } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useTheme } from '@/shared/hooks/useTheme'
import { useAuth } from '@/features/auth/useAuth'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggle } = useTheme()
  const { logout } = useAuth()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:justify-end">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        aria-label="Открыть меню"
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Переключить тему">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { void logout() }}>
          Выйти
        </Button>
      </div>
    </header>
  )
}
