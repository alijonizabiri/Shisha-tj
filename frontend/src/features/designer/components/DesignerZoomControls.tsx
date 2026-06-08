import { Maximize, Minus, Plus } from 'lucide-react'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const STEP = 0.1

interface Props {
  zoom: number
  onChange: (z: number) => void
  onFit: () => void
}

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 10) / 10))
}

export function DesignerZoomControls({ zoom, onChange, onFit }: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-0.5 rounded-xl border border-border bg-white/90 p-1 shadow-md backdrop-blur dark:bg-neutral-900/90">
      <button
        type="button"
        onClick={() => onChange(clampZoom(zoom - STEP))}
        disabled={zoom <= MIN_ZOOM}
        aria-label="Уменьшить"
        className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-40 md:h-9 md:w-9"
      >
        <Minus className="h-4 w-4" />
      </button>

      <span className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-foreground">
        {Math.round(zoom * 100)}%
      </span>

      <button
        type="button"
        onClick={() => onChange(clampZoom(zoom + STEP))}
        disabled={zoom >= MAX_ZOOM}
        aria-label="Увеличить"
        className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-40 md:h-9 md:w-9"
      >
        <Plus className="h-4 w-4" />
      </button>

      <div className="mx-0.5 h-6 w-px bg-border" />

      <button
        type="button"
        onClick={onFit}
        aria-label="По размеру"
        className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-accent md:h-9 md:w-9"
      >
        <Maximize className="h-4 w-4" />
      </button>
    </div>
  )
}
