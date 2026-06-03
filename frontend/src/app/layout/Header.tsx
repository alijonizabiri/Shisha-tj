import { Moon, Sun } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useTheme } from '@/shared/hooks/useTheme'
import { useAuth } from '@/features/auth/useAuth'

export function Header() {
  const { theme, toggle } = useTheme()
  const { logout } = useAuth()

  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border bg-card px-4">
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Переключить тему">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => { void logout() }}>
        Выйти
      </Button>
    </header>
  )
}
