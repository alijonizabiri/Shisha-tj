import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LeadDetailDrawer } from './LeadDetailDrawer'
import * as api from '../api'

vi.mock('../api')
vi.mock('./LeadFinancesPanel', () => ({ LeadFinancesPanel: () => null }))
vi.mock('./EditLeadDialog', () => ({ EditLeadDialog: () => null }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
}))

const mockUseLead = vi.mocked(api.useLead)

const LEAD_NO_MEASUREMENTS = {
  id: 'lead-123',
  name: 'Тест Лид',
  phone: '+992900000001',
  product: 'Душевая кабина',
  source: null,
  callDate: '2026-06-06',
  note: null,
  measurements: [],
}

const LEAD_WITH_MEASUREMENTS = {
  ...LEAD_NO_MEASUREMENTS,
  measurements: [
    {
      id: 'm-1',
      measureMm: 1560,
      heightMm: 2000,
      configuration: 'TwoGlass',
      glassColor: 'Transparent',
      hardwareColor: 'BlackMatte',
      status: 'New',
      assignedMeasurerName: null,
      measuredAt: '2026-06-06',
      createdAt: '2026-06-06T10:00:00Z',
    },
  ],
}

describe('LeadDetailDrawer — measurements section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "+ Создать замер" button when measurements list is empty', () => {
    mockUseLead.mockReturnValue({
      data: LEAD_NO_MEASUREMENTS,
      isLoading: false,
    } as ReturnType<typeof api.useLead>)

    render(<LeadDetailDrawer leadId="lead-123" onClose={vi.fn()} />)

    expect(screen.getByText('Замеров нет')).toBeTruthy()
    expect(screen.getByText(/Создать замер/i)).toBeTruthy()
  })

  it('clicking "+ Создать замер" navigates to /designer?leadId=<id>', async () => {
    mockUseLead.mockReturnValue({
      data: LEAD_NO_MEASUREMENTS,
      isLoading: false,
    } as ReturnType<typeof api.useLead>)

    const user = userEvent.setup()
    render(<LeadDetailDrawer leadId="lead-123" onClose={vi.fn()} />)

    await user.click(screen.getByText(/Создать замер/i))

    expect(mockNavigate).toHaveBeenCalledWith('/designer?leadId=lead-123')
  })

  it('shows "+ Добавить замер" button (secondary) when measurements exist', () => {
    mockUseLead.mockReturnValue({
      data: LEAD_WITH_MEASUREMENTS,
      isLoading: false,
    } as ReturnType<typeof api.useLead>)

    render(<LeadDetailDrawer leadId="lead-123" onClose={vi.fn()} />)

    expect(screen.getByText(/Добавить замер/i)).toBeTruthy()
  })
})
