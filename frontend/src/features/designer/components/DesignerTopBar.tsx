import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type ViewMode = '2d' | '3d'

interface Props {
  leadName?: string
  canSave: boolean
  isSaving: boolean
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onBack: () => void
  onSave: () => void
}

export function DesignerTopBar({ leadName, canSave, isSaving, viewMode, onViewModeChange, onBack, onSave }: Props) {
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

      {/* 2D / 3D toggle */}
      <div className="flex overflow-hidden rounded-md border border-white/10">
        <button
          type="button"
          onClick={() => onViewModeChange('2d')}
          className={
            viewMode === '2d'
              ? 'px-4 py-1.5 text-sm font-medium bg-[#c9a84c] text-black'
              : 'px-4 py-1.5 text-sm font-medium bg-white/5 text-white/60 hover:bg-white/10'
          }
        >
          2D
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('3d')}
          className={
            viewMode === '3d'
              ? 'px-4 py-1.5 text-sm font-medium bg-[#c9a84c] text-black'
              : 'px-4 py-1.5 text-sm font-medium bg-white/5 text-white/60 hover:bg-white/10'
          }
        >
          3D
        </button>
      </div>

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
