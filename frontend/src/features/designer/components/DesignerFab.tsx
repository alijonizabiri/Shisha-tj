import { Settings2 } from 'lucide-react'

interface Props {
  onClick: () => void
}

export function DesignerFab({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Открыть параметры замера"
      className="absolute bottom-4 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:h-12 md:w-12"
    >
      <Settings2 className="h-6 w-6 md:h-5 md:w-5" />
    </button>
  )
}
