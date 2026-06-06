import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddPaymentDialog } from './AddPaymentDialog'
import * as api from '../api'

vi.mock('../api')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockUseCreatePayment = vi.mocked(api.useCreatePayment)

const DEFAULT_MUTATION = {
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
  isError: false,
  error: null,
}

function renderDialog(hasMeasurements: boolean, onClose = vi.fn()) {
  return render(
    <AddPaymentDialog leadId="lead-1" hasMeasurements={hasMeasurements} onClose={onClose} />,
  )
}

describe('AddPaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreatePayment.mockReturnValue(
      DEFAULT_MUTATION as unknown as ReturnType<typeof api.useCreatePayment>,
    )
  })

  describe('without measurements (hasMeasurements=false)', () => {
    it('defaults to Balance, not Deposit', () => {
      renderDialog(false)
      const select = screen.getByLabelText('Тип платежа') as HTMLSelectElement
      expect(select.value).toBe('Balance')
    })

    it('Deposit option is disabled', () => {
      renderDialog(false)
      const depositOption = screen.getByRole('option', { name: 'Аванс' }) as HTMLOptionElement
      expect(depositOption.disabled).toBe(true)
    })

    it('Deposit option has a title hint', () => {
      renderDialog(false)
      const depositOption = screen.getByRole('option', { name: 'Аванс' }) as HTMLOptionElement
      expect(depositOption.title).toBe('Сначала создайте замер')
    })

    it('submit button is enabled by default (Balance selected)', () => {
      renderDialog(false)
      const btn = screen.getByRole('button', { name: /Добавить/i })
      expect((btn as HTMLButtonElement).disabled).toBe(false)
    })

    it('Balance option is enabled and submittable', async () => {
      const user = userEvent.setup()
      renderDialog(false)

      await user.type(screen.getByLabelText('Сумма (сом)'), '500')
      await user.click(screen.getByRole('button', { name: /Добавить/i }))

      expect(DEFAULT_MUTATION.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'Balance', amountTjs: 500 }),
      )
    })

    it('Refund option is enabled and submittable', async () => {
      const user = userEvent.setup()
      renderDialog(false)

      await user.selectOptions(screen.getByLabelText('Тип платежа'), 'Refund')
      await user.type(screen.getByLabelText('Сумма (сом)'), '200')
      await user.click(screen.getByRole('button', { name: /Добавить/i }))

      expect(DEFAULT_MUTATION.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'Refund', amountTjs: -200 }),
      )
    })
  })

  describe('with measurements (hasMeasurements=true)', () => {
    it('defaults to Deposit', () => {
      renderDialog(true)
      const select = screen.getByLabelText('Тип платежа') as HTMLSelectElement
      expect(select.value).toBe('Deposit')
    })

    it('all three options are enabled', () => {
      renderDialog(true)
      const options = screen.getAllByRole('option') as HTMLOptionElement[]
      options.forEach((opt) => expect(opt.disabled).toBe(false))
    })

    it('Deposit is submittable', async () => {
      const user = userEvent.setup()
      renderDialog(true)

      await user.type(screen.getByLabelText('Сумма (сом)'), '1000')
      await user.click(screen.getByRole('button', { name: /Добавить/i }))

      expect(DEFAULT_MUTATION.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'Deposit', amountTjs: 1000 }),
      )
    })
  })
})
