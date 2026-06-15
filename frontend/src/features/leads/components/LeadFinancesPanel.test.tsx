import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LeadFinancesPanel } from './LeadFinancesPanel'
import * as api from '../api'
import type { LeadMeasurement } from '../api'

vi.mock('../api')
vi.mock('./AddPaymentDialog', () => ({
  AddPaymentDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="add-payment-dialog">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

const mockUseLeadFinances = vi.mocked(api.useLeadFinances)

const FINANCES_DATA = {
  leadId: 'lead-1',
  dealPriceTjs: null,
  glassCostTjs: 0,
  reworkCostTjs: 0,
  hardwareCostTjs: 0,
  masterFeeTjs: 0,
  deliveryCostTjs: 0,
  otherCostsTjs: 0,
  totalCostTjs: 0,
  profitTjs: null,
  totalPaidTjs: 0,
  totalDepositTjs: 0,
  balanceDueTjs: null,
}

const MEASUREMENT: LeadMeasurement = {
  id: 'm-1',
  address: 'Test',
  status: 'Thinking',
  glassColor: 'Transparent',
  hardwareColor: 'BlackMatte',
  measureMm: 1000,
  heightMm: 2000,
  dealPriceTjs: null,
  deliveryCostTjs: null,
  installationDate: null,
  warrantyUntil: null,
  totalPaidTjs: 0,
  balanceDueTjs: null,
  assignedMeasurerName: null,
  measuredAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
}

describe('LeadFinancesPanel — Добавить платёж button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLeadFinances.mockReturnValue({
      data: FINANCES_DATA,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof api.useLeadFinances>)
  })

  it('button is disabled and hint is shown when measurements is empty', () => {
    render(<LeadFinancesPanel leadId="lead-1" measurements={[]} />)
    const btn = screen.getByRole('button', { name: /Добавить платёж/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Сначала создайте замер')).toBeTruthy()
  })

  it('button is enabled when measurements has one entry', () => {
    render(<LeadFinancesPanel leadId="lead-1" measurements={[MEASUREMENT]} />)
    const btn = screen.getByRole('button', { name: /Добавить платёж/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('hint is not shown when measurements is non-empty', () => {
    render(<LeadFinancesPanel leadId="lead-1" measurements={[MEASUREMENT]} />)
    expect(screen.queryByText('Сначала создайте замер')).toBeNull()
  })

  it('clicking button opens AddPaymentDialog when measurements is non-empty', async () => {
    const user = userEvent.setup()
    render(<LeadFinancesPanel leadId="lead-1" measurements={[MEASUREMENT]} />)

    await user.click(screen.getByRole('button', { name: /Добавить платёж/i }))

    expect(screen.getByTestId('add-payment-dialog')).toBeTruthy()
  })

  it('shows measurement selector when there are multiple measurements', () => {
    const m2: LeadMeasurement = { ...MEASUREMENT, id: 'm-2', measureMm: 1200, heightMm: 2200 }
    render(<LeadFinancesPanel leadId="lead-1" measurements={[MEASUREMENT, m2]} />)
    expect(screen.getByRole('combobox', { name: /Замер для платежа/i })).toBeTruthy()
  })

  it('does not show measurement selector for a single measurement', () => {
    render(<LeadFinancesPanel leadId="lead-1" measurements={[MEASUREMENT]} />)
    expect(screen.queryByRole('combobox', { name: /Замер для платежа/i })).toBeNull()
  })
})
