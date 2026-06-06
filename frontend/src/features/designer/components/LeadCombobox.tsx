import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useDesignerLeads } from '../api'
import type { DesignerLeadOption } from '../api'

const STATUS_LABELS: Record<string, string> = {
  Measurement:      'Замер',
  Buying:           'Покупает',
  OrderedAtFactory: 'Заказ на завод',
  GlassArrived:     'Стекло пришло',
}

const STATUS_COLORS: Record<string, string> = {
  Measurement:      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Buying:           'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  OrderedAtFactory: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  GlassArrived:     'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

interface LeadComboboxProps {
  id?: string
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}

export function LeadCombobox({ id, value, onChange, disabled = false }: LeadComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const debouncedQuery = useDebounce(query, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  // Always fetch all leads (no search) to determine count and initial list
  const { data: allLeads = [], isLoading } = useDesignerLeads()
  const serverSearch = allLeads.length > 100

  // One query: when > 100 leads, uses debouncedQuery on server; otherwise same
  // queryKey as allLeads → TanStack Query deduplicates, no extra request
  const serverQuery = serverSearch && debouncedQuery ? debouncedQuery : undefined
  const { data: serverResults = [], isFetching: isServerFetching } = useDesignerLeads(serverQuery)

  const options: DesignerLeadOption[] = serverSearch
    ? serverResults
    : allLeads.filter((l) =>
        `${l.name} ${l.phone}`.toLowerCase().includes(query.toLowerCase()),
      )

  const selected = allLeads.find((l) => l.id === value) ?? null
  const showSpinner = isLoading || (serverSearch && isServerFetching)

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Reset active index when options list changes
  useEffect(() => {
    setActiveIndex(0)
  }, [options.length, query])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleSelect(lead: DesignerLeadOption) {
    onChange(lead.id)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        setOpen(false)
        e.preventDefault()
        break
      case 'ArrowDown':
        setActiveIndex((i) => Math.min(i + 1, options.length - 1))
        e.preventDefault()
        break
      case 'ArrowUp':
        setActiveIndex((i) => Math.max(i - 1, 0))
        e.preventDefault()
        break
      case 'Enter':
        if (options[activeIndex]) handleSelect(options[activeIndex])
        e.preventDefault()
        break
    }
  }

  // Displayed text in the input when closed
  const closedText = selected ? `${selected.name} · ${selected.phone}` : ''
  // When disabled + value set + lead not in eligible list → show warning
  const ineligibleText = disabled && value && !selected ? 'Лид недоступен для замера' : ''

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={
            open && options[activeIndex] ? `opt-${options[activeIndex].id}` : undefined
          }
          aria-autocomplete="list"
          placeholder={isLoading ? 'Загрузка...' : 'Поиск по имени или телефону'}
          value={open ? query : ineligibleText || closedText}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-8 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            ineligibleText && 'text-destructive',
          )}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
        {showSpinner && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Список лидов"
          className={cn(
            'absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border',
            'bg-card py-1 text-sm shadow-md',
          )}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-center text-muted-foreground">
              {isLoading ? 'Загрузка...' : 'Ничего не найдено'}
            </li>
          ) : (
            options.map((lead, i) => (
              <li
                key={lead.id}
                id={`opt-${lead.id}`}
                role="option"
                aria-selected={lead.id === value}
                className={cn(
                  'flex cursor-pointer select-none items-center gap-2 px-3 py-2',
                  i === activeIndex && 'bg-accent text-accent-foreground',
                  lead.id === value && 'font-medium',
                )}
                // onMouseDown prevents input blur before onChange fires
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(lead)
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="flex-1 truncate">{lead.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{lead.phone}</span>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium',
                    STATUS_COLORS[lead.status] ?? 'bg-muted text-muted-foreground',
                  )}
                >
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
