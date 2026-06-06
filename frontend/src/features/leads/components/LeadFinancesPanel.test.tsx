import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LeadFinancesPanel } from './LeadFinancesPanel'
import * as api from '../api'

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

describe('LeadFinancesPanel — Добавить платёж button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLeadFinances.mockReturnValue({
      data: FINANCES_DATA,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof api.useLeadFinances>)
  })

  it('button is disabled and hint is shown when hasMeasurements=false', () => {
    render(<LeadFinancesPanel leadId="lead-1" hasMeasurements={false} />)
    const btn = screen.getByRole('button', { name: /Добавить платёж/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Сначала создайте замер')).toBeTruthy()
  })

  it('button is enabled when hasMeasurements=true', () => {
    render(<LeadFinancesPanel leadId="lead-1" hasMeasurements={true} />)
    const btn = screen.getByRole('button', { name: /Добавить платёж/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('hint is not shown when hasMeasurements=true', () => {
    render(<LeadFinancesPanel leadId="lead-1" hasMeasurements={true} />)
    expect(screen.queryByText('Сначала создайте замер')).toBeNull()
  })

  it('clicking button opens AddPaymentDialog when hasMeasurements=true', async () => {
    const user = userEvent.setup()
    render(<LeadFinancesPanel leadId="lead-1" hasMeasurements={true} />)

    await user.click(screen.getByRole('button', { name: /Добавить платёж/i }))

    expect(screen.getByTestId('add-payment-dialog')).toBeTruthy()
  })
})
