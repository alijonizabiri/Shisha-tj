import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DesignerPage } from './DesignerPage'
import type { Panel } from './lib/types'
import type { MeasurementFormValues } from './schemas'

// ── API mock ──────────────────────────────────────────────────────────────────

vi.mock('./api', () => ({
  useSaveMeasurement: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
  }),
  useDesignerLeads: () => ({
    data: [{ id: 'lead-abc', name: 'Иван', phone: '999123456', status: 'Measurement' }],
    isLoading: false,
    isFetching: false,
  }),
  downloadMeasurementPdf: vi.fn(),
}))

// ── Router mock ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useNavigate: () => mockNavigate,
}))

// ── Sonner mock (must include Toaster or DesignerPage crashes) ────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

// ── DesignerSheet mock: renders apply buttons when open ───────────────────────

vi.mock('./components/DesignerSheet', () => ({
  DesignerSheet: ({
    open,
    onOpenChange,
    onApply,
  }: {
    open: boolean
    onOpenChange: (o: boolean) => void
    onApply: (v: MeasurementFormValues) => void
    values: MeasurementFormValues
    disableLeadSelector?: boolean
  }) => (
    <div data-testid="designer-sheet" data-open={String(open)}>
      {open && (
        <>
          {/* Normal apply: 1560mm */}
          <button
            data-testid="sheet-apply"
            onClick={() => {
              onApply({
                leadId: 'lead-abc',
                measureMm: 1560,
                heightMm: 2000,
                glassColor: 'Transparent',
                hardwareColor: 'BlackMatte',
                deliveryTjs: 100,
                depositTjs: 0,
              })
              onOpenChange(false)
            }}
          >
            Применить
          </button>
          {/* Wide-panel apply: 2500mm → fixedMm=1740 > 1500 → warning */}
          <button
            data-testid="sheet-apply-wide"
            onClick={() => {
              onApply({
                leadId: 'lead-abc',
                measureMm: 2500,
                heightMm: 2000,
                glassColor: 'Transparent',
                hardwareColor: 'BlackMatte',
                deliveryTjs: 100,
                depositTjs: 0,
              })
              onOpenChange(false)
            }}
          >
            Применить-широко
          </button>
        </>
      )}
    </div>
  ),
}))

// ── DrawingCanvas mock: renders glass-rect divs without real SVG ──────────────

vi.mock('./components/DrawingCanvas', () => ({
  DrawingCanvas: ({
    panels,
    onSelectPanel,
  }: {
    panels: Panel[]
    onSelectPanel?: (id: string | null, rect?: unknown) => void
  }) => (
    <div data-testid="drawing-canvas">
      {panels.map((p) => (
        <div
          key={p.id}
          data-testid="glass-rect"
          onClick={() => onSelectPanel?.(p.id, { x: 100, y: 100, w: 200, h: 300 })}
        />
      ))}
    </div>
  ),
}))

// ── GlassContextPopover mock ──────────────────────────────────────────────────

vi.mock('./components/GlassContextPopover', () => ({
  GlassContextPopover: ({
    onToggleDoor,
    onSplit,
    onDelete,
    onClose,
  }: {
    onToggleDoor: () => void
    onSplit: () => void
    onDelete: () => void
    onClose: () => void
  }) => (
    <div data-testid="glass-popover">
      <button onClick={() => { onToggleDoor(); onClose() }}>toggle-door</button>
      <button onClick={() => { onSplit(); onClose() }}>split</button>
      <button onClick={() => { onDelete(); onClose() }}>delete</button>
      <button onClick={onClose}>close-popover</button>
    </div>
  ),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function openSheet() {
  fireEvent.click(screen.getByRole('button', { name: 'Открыть параметры замера' }))
}

function applyValues() {
  openSheet()
  fireEvent.click(screen.getByTestId('sheet-apply'))
}

function applyWideValues() {
  openSheet()
  fireEvent.click(screen.getByTestId('sheet-apply-wide'))
}

function expandInfoCard() {
  fireEvent.click(screen.getByRole('button', { name: 'Развернуть расчёт' }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DesignerPage', () => {
  it('renders canvas area', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.getByTestId('canvas-area')).toBeTruthy()
  })

  it('shows prompt before apply', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.getByText(/Введите параметры замера/)).toBeTruthy()
  })

  it('FAB button is present', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.getByRole('button', { name: 'Открыть параметры замера' })).toBeTruthy()
  })

  it('clicking FAB opens sheet', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    const sheet = screen.getByTestId('designer-sheet')
    expect(sheet.getAttribute('data-open')).toBe('false')
    openSheet()
    expect(sheet.getAttribute('data-open')).toBe('true')
  })

  it('hides canvas before apply', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.queryByTestId('drawing-canvas')).toBeNull()
  })

  it('shows 2 glass rects after apply with 1560mm', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues()
    // computeInitialPanels(1560, 2000) → [800 fixed, 800 door] = 2 panels
    expect(screen.getAllByTestId('glass-rect').length).toBe(2)
  })

  it('shows area in info card after apply', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues()
    // computeMetrics(1560, 2000) → totalWidthMm=1600, areaSqM=3.20
    expect(screen.getByText('3.20 м²')).toBeTruthy()
  })

  it('shows placeholder dashes before apply', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    // InfoCard shows "—" for both area and masterFee before apply
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('back button calls navigate(-1)', () => {
    mockSearchParams = new URLSearchParams()
    mockNavigate.mockClear()
    render(<DesignerPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('save button disabled without panels', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    const btn = screen.getByRole('button', { name: 'Сохранить замер' })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('save button enabled after apply with lead and valid dimensions', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues()
    const btn = screen.getByRole('button', { name: 'Сохранить замер' })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('PDF buttons not shown before save', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.queryByText(/Скачать PDF/i)).toBeNull()
  })

  it('shows ineligible banner when ?leadId is unknown', () => {
    mockSearchParams = new URLSearchParams('leadId=unknown-lead')
    render(<DesignerPage />)
    expect(screen.getByText(/Лид не в подходящем статусе/i)).toBeTruthy()
  })

  it('TopBar shows "Новый замер" when no lead applied', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.getByText('Новый замер')).toBeTruthy()
  })

  it('TopBar shows lead name after apply', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues()
    // lead-abc → name 'Иван' → title "Замер · Иван"
    expect(screen.getByText(/Замер.*Иван/)).toBeTruthy()
  })

  it('clicking glass rect opens popover', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues()
    fireEvent.click(screen.getAllByTestId('glass-rect')[0])
    expect(screen.getByTestId('glass-popover')).toBeTruthy()
  })

  it('close-popover button dismisses popover', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues()
    fireEvent.click(screen.getAllByTestId('glass-rect')[0])
    fireEvent.click(screen.getByText('close-popover'))
    expect(screen.queryByTestId('glass-popover')).toBeNull()
  })

  it('toggle-door action closes popover', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues()
    fireEvent.click(screen.getAllByTestId('glass-rect')[0])
    fireEvent.click(screen.getByText('toggle-door'))
    expect(screen.queryByTestId('glass-popover')).toBeNull()
  })

  it('warns when fixed panel exceeds 1500 mm', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyWideValues()
    expandInfoCard()
    // computeInitialPanels(2500, 2000) → fixedMm=1740 → "Панель 1740 мм — очень широкая"
    expect(screen.getByText(/очень широкая/i)).toBeTruthy()
  })

  it('shows no warning for normal panel width', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues() // 1560mm → fixedMm=800 (ok)
    expect(screen.queryByText(/очень широкая/i)).toBeNull()
    expect(screen.queryByText(/слишком узкая/i)).toBeNull()
  })

  it('delivery defaults to 100', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expandInfoCard()
    const input = screen.getByLabelText('Доставка') as HTMLInputElement
    expect(Number(input.value)).toBe(100)
  })

  it('balance updates when deposit changes', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    applyValues() // masterFee=384, delivery=100
    expandInfoCard()
    fireEvent.change(screen.getByLabelText('Депозит'), { target: { value: '200' } })
    // balance = 384 + 100 - 200 = 284
    const balanceRow = screen.getByText('Остаток').closest('div')!
    expect(balanceRow.textContent).toMatch(/284/)
  })
})
