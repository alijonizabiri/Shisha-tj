import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'

export interface DateRange {
  from?: string
  to?: string
}

type Preset = 'all' | 'month' | 'quarter' | 'year' | 'custom'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return isoDate(new Date())
}

function firstOfMonth(): string {
  const d = new Date()
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1))
}

function firstOfQuarter(): string {
  const d = new Date()
  const q = Math.floor(d.getMonth() / 3)
  return isoDate(new Date(d.getFullYear(), q * 3, 1))
}

function firstOfYear(): string {
  return isoDate(new Date(new Date().getFullYear(), 0, 1))
}

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: 'all', label: 'Всё время' },
  { id: 'month', label: 'Месяц' },
  { id: 'quarter', label: 'Квартал' },
  { id: 'year', label: 'Год' },
  { id: 'custom', label: 'Период' },
]

function rangeForPreset(preset: Preset): DateRange {
  switch (preset) {
    case 'month':   return { from: firstOfMonth(),   to: today() }
    case 'quarter': return { from: firstOfQuarter(), to: today() }
    case 'year':    return { from: firstOfYear(),    to: today() }
    default:        return {}
  }
}

interface Props {
  onChange: (range: DateRange) => void
}

export function DateRangeFilter({ onChange }: Props) {
  const [active, setActive] = useState<Preset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  function selectPreset(preset: Preset) {
    setActive(preset)
    if (preset !== 'custom') {
      onChange(rangeForPreset(preset))
    } else {
      onChange({ from: customFrom || undefined, to: customTo || undefined })
    }
  }

  function applyCustom() {
    onChange({ from: customFrom || undefined, to: customTo || undefined })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.id}
          variant={active === p.id ? 'default' : 'outline'}
          size="sm"
          className={cn('h-8 px-3 text-xs', active === p.id && 'shadow-none')}
          onClick={() => selectPreset(p.id)}
        >
          {p.label}
        </Button>
      ))}

      {active === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo || today()}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={today()}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="sm" className="h-8 px-3 text-xs" onClick={applyCustom}>
            Применить
          </Button>
        </div>
      )}
    </div>
  )
}
