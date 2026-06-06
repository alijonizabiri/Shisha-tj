import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddPaymentDialog } from './AddPaymentDialog'
import * as api from '../api'

vi.mock('../api')

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: mockToast }))

const mockUseCreatePayment = vi.mocked(api.useCreatePayment)

const DEFAULT_MUTATION = {
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
  isError: false,
  error: null,
}

function renderDialog(onClose = vi.fn()) {
  return render(<AddPaymentDialog leadId="lead-1" onClose={onClose} />)
}

describe('AddPaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreatePayment.mockReturnValue(
      DEFAULT_MUTATION as unknown as ReturnType<typeof api.useCreatePayment>,
    )
  })

  it('defaults to Deposit', () => {
    renderDialog()
    const select = screen.getByLabelText('Тип платежа') as HTMLSelectElement
    expect(select.value).toBe('Deposit')
  })

  it('all three options are enabled', () => {
    renderDialog()
    const options = screen.getAllByRole('option') as HTMLOptionElement[]
    expect(options).toHaveLength(3)
    options.forEach((opt) => expect(opt.disabled).toBe(false))
  })

  it('submit button is enabled', () => {
    renderDialog()
    const btn = screen.getByRole('button', { name: /Добавить/i })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('Balance is submittable', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(screen.getByLabelText('Тип платежа'), 'Balance')
    await user.type(screen.getByLabelText('Сумма (сом)'), '500')
    await user.click(screen.getByRole('button', { name: /Добавить/i }))

    expect(DEFAULT_MUTATION.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'Balance', amountTjs: 500 }),
    )
  })

  it('on MEASUREMENT_REQUIRED_FOR_PAYMENT error → toast.error + onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const error = {
      response: {
        data: {
          detail: 'Нельзя добавить платёж: у лида нет замера. Создайте замер в Дизайнере.',
          errorCode: 'MEASUREMENT_REQUIRED_FOR_PAYMENT',
        },
      },
    }
    mockUseCreatePayment.mockReturnValue({
      ...DEFAULT_MUTATION,
      mutateAsync: vi.fn().mockRejectedValue(error),
    } as unknown as ReturnType<typeof api.useCreatePayment>)

    renderDialog(onClose)
    await user.type(screen.getByLabelText('Сумма (сом)'), '500')
    await user.click(screen.getByRole('button', { name: /Добавить/i }))

    expect(mockToast.error).toHaveBeenCalledWith(
      'Нельзя добавить платёж: у лида нет замера. Создайте замер в Дизайнере.',
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('on generic error → toast.error, dialog stays open', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockUseCreatePayment.mockReturnValue({
      ...DEFAULT_MUTATION,
      mutateAsync: vi.fn().mockRejectedValue(new Error('network')),
    } as unknown as ReturnType<typeof api.useCreatePayment>)

    renderDialog(onClose)
    await user.type(screen.getByLabelText('Сумма (сом)'), '500')
    await user.click(screen.getByRole('button', { name: /Добавить/i }))

    expect(mockToast.error).toHaveBeenCalledWith('Ошибка создания платежа. Попробуйте снова.')
    expect(onClose).not.toHaveBeenCalled()
  })
})
