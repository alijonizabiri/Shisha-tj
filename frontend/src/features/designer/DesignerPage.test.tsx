import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DesignerPage } from './DesignerPage'

// ── Mock the API module so tests don't need QueryClientProvider or a server ───

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
    data: [{ id: 'lead-abc', name: 'Иван', status: 'Measurement' }],
    isLoading: false,
  }),
  downloadMeasurementPdf: vi.fn(),
}))

// ── Mock react-router-dom so tests don't need a Router context ───────────────

const mockNavigate = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useNavigate: () => mockNavigate,
}))

// ── Mock sonner so toast calls are silent in tests ────────────────────────────

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('DesignerPage', () => {
  it('renders all form fields', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.getByLabelText('Клиент *')).toBeTruthy()
    expect(screen.getByLabelText('Ширина проёма (мм)')).toBeTruthy()
    expect(screen.getByLabelText('Высота (мм)')).toBeTruthy()
    expect(screen.getByLabelText('Цвет стекла')).toBeTruthy()
    expect(screen.getByLabelText('Цвет фурнитуры')).toBeTruthy()
  })

  it('hides canvas when measure is empty', () => {
    mockSearchParams = new URLSearchParams()
    const { container } = render(<DesignerPage />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows canvas after entering a valid measureMm', () => {
    mockSearchParams = new URLSearchParams()
    const { container } = render(<DesignerPage />)
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '1560' },
    })
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('warns when TwoGlass fixed panel exceeds 1500 mm', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    // measureMm=2500 → totalWidth=2540 → fixedMm=1740 > 1500
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '2500' },
    })
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/очень широкая/i)).toBeTruthy()
  })

  it('shows no warning for normal TwoGlass width', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '1560' },
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows placeholder dashes before dimensions are entered', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows area after entering valid dimensions', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '1560' },
    })
    // totalWidth=1600, areaSqM=(1600/1000)*(2000/1000)=3.20
    expect(screen.getByText('3.20 м²')).toBeTruthy()
  })

  it('delivery defaults to 100', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    const deliveryInput = screen.getByLabelText('Доставка') as HTMLInputElement
    expect(Number(deliveryInput.value)).toBe(100)
  })

  it('balance = masterFee + delivery − deposit', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '1560' },
    })
    // masterFee=384, delivery=100(default), deposit=0 → balance=484
    // Change deposit to 200 → balance = 384+100−200 = 284
    fireEvent.change(screen.getByLabelText('Депозит'), { target: { value: '200' } })
    const balanceRow = screen.getByText('Остаток').closest('div')!
    expect(balanceRow.textContent).toMatch(/284/)
  })

  it('renders 3 rects after switching to ThreeGlass', async () => {
    mockSearchParams = new URLSearchParams()
    const user = userEvent.setup()
    const { container } = render(<DesignerPage />)
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '1800' },
    })
    // userEvent.click on the label span properly triggers the radio change
    await user.click(screen.getByText('3 стекла'))
    // 1800+40=1840 → sides=520, door=800 → 3 panels
    expect(container.querySelectorAll('rect').length).toBe(3)
  })

  it('save button is present and enabled by default', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    const btn = screen.getByRole('button', { name: /сохранить/i })
    expect(btn).toBeTruthy()
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('PDF buttons are not shown before save', () => {
    mockSearchParams = new URLSearchParams()
    render(<DesignerPage />)
    expect(screen.queryByText(/Скачать PDF/i)).toBeNull()
  })

  // ── ?leadId=… behaviour ──────────────────────────────────────────────────────

  it('lead selector is disabled when ?leadId is in URL', () => {
    mockSearchParams = new URLSearchParams('leadId=lead-abc')
    render(<DesignerPage />)
    const select = screen.getByLabelText('Клиент *') as HTMLSelectElement
    expect(select.disabled).toBe(true)
  })

  it('lead selector is pre-selected when ?leadId matches an eligible lead', () => {
    mockSearchParams = new URLSearchParams('leadId=lead-abc')
    render(<DesignerPage />)
    const select = screen.getByLabelText('Клиент *') as HTMLSelectElement
    expect(select.value).toBe('lead-abc')
  })

  it('shows ineligible banner when ?leadId is not in eligible list', () => {
    mockSearchParams = new URLSearchParams('leadId=unknown-lead')
    render(<DesignerPage />)
    expect(screen.getByText(/Лид не в подходящем статусе/i)).toBeTruthy()
  })
})
