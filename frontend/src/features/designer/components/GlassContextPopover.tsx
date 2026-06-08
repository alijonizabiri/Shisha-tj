import { useEffect, useRef } from 'react'
import { DoorOpen, Scissors, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { Panel } from '../lib/types'
import type { PanelScreenRect } from './DrawingCanvas'

const MAX_PANELS = 6

interface Props {
  panel: Panel
  allPanels: Panel[]
  rect: PanelScreenRect
  onToggleDoor: () => void
  onSplit: () => void
  onDelete: () => void
  onClose: () => void
}

export function GlassContextPopover({
  panel,
  allPanels,
  rect,
  onToggleDoor,
  onSplit,
  onDelete,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click / touch
  useEffect(() => {
    function handler(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (!ref.current?.contains(target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [onClose])

  // Popover height estimate — position above glass if there's room
  const POPOVER_H = 96
  const POPOVER_W = 220
  const spaceAbove = rect.y
  const top = spaceAbove >= POPOVER_H + 8
    ? rect.y - POPOVER_H - 8
    : rect.y + rect.h + 8

  // Centre horizontally over the glass, clamp to viewport
  const rawLeft = rect.x + rect.w / 2 - POPOVER_W / 2
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - POPOVER_W - 8))

  const hasDoor = allPanels.some((p) => p.isDoor)
  const canMakeDoor = !panel.isDoor && !hasDoor
  const canSplit = !panel.isDoor && panel.widthMm >= 400 && allPanels.length < MAX_PANELS
  const canDelete = allPanels.length > 1

  const label = `Стекло ${panel.position + 1} · ${panel.widthMm}мм · ${panel.isDoor ? 'Дверь' : 'Глухое'}`

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, width: POPOVER_W, zIndex: 50 }}
      className="rounded-xl border border-border bg-white shadow-xl backdrop-blur dark:bg-neutral-900"
    >
      {/* Header */}
      <div className="truncate border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
        {label}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 p-2">
        {/* Door / Fixed toggle */}
        <button
          type="button"
          onClick={() => { onToggleDoor(); onClose() }}
          disabled={!panel.isDoor && !canMakeDoor}
          aria-label={panel.isDoor ? 'Сделать глухим' : 'Сделать дверью'}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-xs transition-colors',
            'hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <DoorOpen className="h-5 w-5" />
          <span>{panel.isDoor ? 'Глухое' : 'Дверь'}</span>
        </button>

        {/* Split */}
        <button
          type="button"
          onClick={() => { onSplit(); onClose() }}
          disabled={!canSplit}
          aria-label="Разделить"
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-xs transition-colors',
            'hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <Scissors className="h-5 w-5" />
          <span>Разделить</span>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => { onDelete(); onClose() }}
          disabled={!canDelete}
          aria-label="Удалить стекло"
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-xs text-destructive transition-colors',
            'hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <Trash2 className="h-5 w-5" />
          <span>Удалить</span>
        </button>
      </div>
    </div>
  )
}
