import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface Props {
  leadName?: string
  canSave: boolean
  isSaving: boolean
  onBack: () => void
  onSave: () => void
}

export function DesignerTopBar({ leadName, canSave, isSaving, onBack, onSave }: Props) {
  const title = leadName ? `Замер · ${leadName}` : 'Новый замер'

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm">
      <button
        type="button"
        onClick={onBack}
        aria-label="Назад"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <span className="flex-1 truncate text-sm font-medium">{title}</span>

      <Button
        size="sm"
        disabled={!canSave || isSaving}
        onClick={onSave}
        aria-label="Сохранить замер"
      >
        {isSaving ? 'Сохранение…' : 'Сохранить'}
      </Button>
    </div>
  )
}
