import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import type { Panel, DoorMechanism, LShapeConfig } from '../lib/types'
import type { PanelScreenRect } from './DrawingCanvas'

interface Props {
  panel: Panel
  allPanels: Panel[]
  rect: PanelScreenRect
  lShapeConfig?: LShapeConfig
  onAction: (
    action:
      | 'resizeDoor'
      | 'resizePanel'
      | 'resizeHeight'
      | 'toggleHingeSide'
      | 'toggleMechanism'
      | 'moveDoorSide'
      | 'moveDoorToOtherWall'
      | 'convertToDoor',
    panelId: string,
    payload?: Record<string, unknown>,
  ) => void
  onClose: () => void
}

const GOLD = '#c9a84c'

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  )
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return mobile
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ label, children, dimmed = false }: { label: string; children: React.ReactNode; dimmed?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-2', dimmed && 'opacity-35 pointer-events-none select-none')}>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
        {label}
      </span>
      {children}
    </div>
  )
}

// ── Stepper input ──────────────────────────────────────────────────────────────

function Stepper({
  value,
  onChange,
  step = 50,
  min,
  max,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
}) {
  const atMin = min !== undefined && value <= min
  const atMax = max !== undefined && value >= max

  return (
    <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
      <button
        type="button"
        disabled={atMin}
        onClick={() => onChange(Math.max(min ?? 0, value - step))}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-lg font-light
                   text-white/50 transition hover:bg-white/8 hover:text-white
                   disabled:opacity-25 active:bg-white/12"
      >
        −
      </button>

      <div className="flex flex-1 items-center justify-center gap-1.5 border-x border-white/10 py-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (!Number.isNaN(v)) onChange(v)
          }}
          onBlur={(e) => {
            let v = Number(e.target.value)
            if (min !== undefined) v = Math.max(min, v)
            if (max !== undefined) v = Math.min(max, v)
            onChange(v)
          }}
          className="w-20 bg-transparent text-center font-mono text-base font-semibold
                     text-white outline-none [appearance:textfield]
                     [&::-webkit-inner-spin-button]:appearance-none
                     [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-xs font-medium text-white/30">мм</span>
      </div>

      <button
        type="button"
        disabled={atMax}
        onClick={() => onChange(Math.min(max ?? Infinity, value + step))}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-lg font-light
                   text-white/50 transition hover:bg-white/8 hover:text-white
                   disabled:opacity-25 active:bg-white/12"
      >
        +
      </button>
    </div>
  )
}

// ── Toggle group ───────────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition active:scale-[0.97]',
            value === opt.value
              ? 'bg-[#c9a84c] text-black shadow-sm'
              : 'text-white/45 hover:bg-white/8 hover:text-white',
          )}
        >
          {opt.icon && <span className="text-base leading-none">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Ghost action button ────────────────────────────────────────────────────────

function GhostBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-white/8
                 bg-white/[0.03] px-4 py-3 text-sm text-white/60
                 transition hover:border-white/15 hover:bg-white/8 hover:text-white
                 active:scale-[0.98]"
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PanelContextMenu({
  panel,
  allPanels,
  rect,
  lShapeConfig,
  onAction,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const [draftWidth, setDraftWidth]       = useState(panel.widthMm)
  const [draftHeight, setDraftHeight]     = useState(panel.heightMm)
  const [draftHingeSide, setDraftHingeSide] = useState(panel.hingeSide ?? 'Left')
  const [draftMechanism, setDraftMechanism] = useState<DoorMechanism>(panel.mechanism ?? 'Hinge')

  const hasDoor      = allPanels.some((p) => p.isDoor && p.id !== panel.id)
  const isLShape     = !!panel.setId
  const canMoveWall  = isLShape && lShapeConfig && lShapeConfig !== 'DoorsAtCorner'
  const isRoller     = draftMechanism === 'Roller'

  const companion = panel.setId
    ? allPanels.find((p) => p.setId === panel.setId && !p.isDoor && p.shape === panel.shape)
    : allPanels.find((p) => !p.isDoor && !p.setId)

  const wallTotal  = companion ? panel.widthMm + companion.widthMm : panel.widthMm
  // Door can never exceed 800mm or leave companion < 200mm
  const maxDoor    = Math.min(800, companion ? wallTotal - 200 : 800)

  useEffect(() => {
    function handler(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [onClose])

  function applyAll() {
    if (panel.isDoor) {
      if (draftWidth !== panel.widthMm)
        onAction('resizeDoor', panel.id, { widthMm: draftWidth })
      // Only apply hinge side for Hinge mechanism
      if (!isRoller && draftHingeSide !== panel.hingeSide)
        onAction('toggleHingeSide', panel.id)
      if (draftMechanism !== panel.mechanism)
        onAction('toggleMechanism', panel.id, { mechanism: draftMechanism })
    } else {
      if (draftWidth !== panel.widthMm)
        onAction('resizePanel', panel.id, { widthMm: draftWidth })
    }
    if (draftHeight !== panel.heightMm)
      onAction('resizeHeight', panel.id, { heightMm: draftHeight })
    onClose()
  }

  // ── Content ────────────────────────────────────────────────────────────────

  const content = (
    <div className="flex flex-col gap-5 p-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{panel.isDoor ? '🚪' : '🪟'}</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white">
              {panel.isDoor ? 'Дверь' : `Стекло ${panel.position + 1}`}
            </span>
            <span className="text-xs text-white/35">
              {panel.widthMm} × {panel.heightMm} мм
              {panel.isDoor && ` · ${panel.mechanism === 'Roller' ? 'Ролик' : 'Петли'}`}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg
                     text-xs text-white/25 transition hover:bg-white/8 hover:text-white/60"
        >
          ✕
        </button>
      </div>

      <div className="h-px bg-white/8" />

      {/* ── Width ── */}
      <Section label={panel.isDoor ? 'Ширина двери' : 'Ширина панели'}>
        <Stepper
          value={draftWidth}
          onChange={setDraftWidth}
          step={50}
          min={panel.isDoor ? 400 : 200}
          max={panel.isDoor ? maxDoor : 3000}
        />
        {panel.isDoor && (
          <p className="text-[11px] text-white/25">макс. {maxDoor} мм</p>
        )}
      </Section>

      {/* ── Height ── */}
      <Section label="Высота (все панели)">
        <Stepper
          value={draftHeight}
          onChange={setDraftHeight}
          step={50}
          min={1500}
          max={2500}
        />
      </Section>

      {/* ── Door-only ── */}
      {panel.isDoor && (
        <>
          {/* Mechanism */}
          <Section label="Механизм">
            <ToggleGroup<DoorMechanism>
              options={[
                { value: 'Hinge',  label: 'Петли',  icon: '🔩' },
                { value: 'Roller', label: 'Ролик',  icon: '🎿' },
              ]}
              value={draftMechanism}
              onChange={setDraftMechanism}
            />
          </Section>

          {/* Hinge side — hidden/dimmed when Roller selected */}
          <Section label="Сторона петель" dimmed={isRoller}>
            <ToggleGroup
              options={[
                { value: 'Left',  label: 'Слева',  icon: '◀' },
                { value: 'Right', label: 'Справа', icon: '▶' },
              ]}
              value={draftHingeSide}
              onChange={(v) => setDraftHingeSide(v as 'Left' | 'Right')}
            />
            {isRoller && (
              <p className="text-[11px] text-white/30">
                При ролике направление определяется автоматически
              </p>
            )}
          </Section>

          {/* Move door */}
          <Section label="Расположение">
            <GhostBtn
              icon="↔"
              label="К стене / к углу"
              onClick={() => { onAction('moveDoorSide', panel.id); onClose() }}
            />
            {canMoveWall && (
              <GhostBtn
                icon="→"
                label={lShapeConfig?.startsWith('DoorOnA') ? 'Перенести на стену B' : 'Перенести на стену A'}
                onClick={() => { onAction('moveDoorToOtherWall', panel.id); onClose() }}
              />
            )}
          </Section>
        </>
      )}

      {/* ── Fixed → convert to door ── */}
      {!panel.isDoor && !hasDoor && (
        <Section label="Действия">
          <GhostBtn
            icon="🚪"
            label="Сделать дверью"
            onClick={() => { onAction('convertToDoor', panel.id); onClose() }}
          />
        </Section>
      )}

      {/* ── Apply ── */}
      <button
        type="button"
        onClick={applyAll}
        style={{ background: GOLD }}
        className="mt-1 w-full rounded-xl py-3 text-sm font-semibold text-black
                   shadow-lg shadow-[#c9a84c]/20 transition
                   hover:brightness-110 active:scale-[0.98]"
      >
        ✓ Применить
      </button>
    </div>
  )

  // ── Mobile: bottom sheet ─────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50" onPointerDown={onClose} />
        <div
          ref={ref}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto
                     rounded-t-2xl border-t border-white/10 bg-[#0d1117]
                     animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/15" />
          </div>
          {content}
          <div className="h-safe-bottom h-6" />
        </div>
      </>
    )
  }

  // ── Desktop: floating popup ──────────────────────────────────────────────────
  const MENU_W        = 310
  const MENU_H_EST    = 560

  const rawTop = rect.y + 16
  const top    = Math.max(8, Math.min(rawTop, window.innerHeight - MENU_H_EST - 8))
  const rawLeft = rect.x + rect.w / 2 - MENU_W / 2
  const left   = Math.max(8, Math.min(rawLeft, window.innerWidth - MENU_W - 8))

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, width: MENU_W, zIndex: 50 }}
      className="overflow-hidden rounded-2xl border border-white/10
                 bg-[#0d1117]/96 shadow-2xl shadow-black/70 backdrop-blur-xl
                 animate-in fade-in slide-in-from-bottom-1 duration-150"
    >
      {content}
    </div>
  )
}
