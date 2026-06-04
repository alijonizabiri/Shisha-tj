import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RefuseLeadDialog } from './RefuseLeadDialog'
import * as api from '../api'

vi.mock('../api')

const mockUseRefusalReasons = vi.mocked(api.useRefusalReasons)
const mockUsePatchLeadStatus = vi.mocked(api.usePatchLeadStatus)

const REASONS = [
  { id: 'r1', label: 'Дорого' },
  { id: 'r2', label: 'Передумал' },
]

const DEFAULT_PATCH = {
  mutateAsync: vi.fn(),
  isError: false,
  isPending: false,
}

function renderDialog(open = true, onClose = vi.fn()) {
  return render(
    <RefuseLeadDialog
      open={open}
      onClose={onClose}
      leadId="lead-123"
      leadName="Иван Иванов"
    />,
  )
}

describe('RefuseLeadDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRefusalReasons.mockReturnValue({
      data: REASONS,
      isLoading: false,
    } as ReturnType<typeof api.useRefusalReasons>)
    mockUsePatchLeadStatus.mockReturnValue(
      DEFAULT_PATCH as unknown as ReturnType<typeof api.usePatchLeadStatus>,
    )
  })

  it('renders nothing when closed', () => {
    renderDialog(false)
    expect(screen.queryByText('Отказ: Иван Иванов')).toBeNull()
  })

  it('renders heading and reason list when open', () => {
    renderDialog()
    expect(screen.getByText('Отказ: Иван Иванов')).toBeTruthy()
    expect(screen.getByText('Дорого')).toBeTruthy()
    expect(screen.getByText('Передумал')).toBeTruthy()
  })

  it('shows loading skeletons while reasons are loading', () => {
    mockUseRefusalReasons.mockReturnValue({
      data: [],
      isLoading: true,
    } as ReturnType<typeof api.useRefusalReasons>)
    renderDialog()
    const pulses = document.querySelectorAll('.animate-pulse')
    expect(pulses.length).toBeGreaterThan(0)
  })

  it('shows validation error when submitting without a reason', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: /отказать/i }))

    await waitFor(() => {
      expect(screen.getByText('Выберите причину отказа')).toBeTruthy()
    })
  })

  it('calls patchStatus with Refused + selected reasonId on submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    mockUsePatchLeadStatus.mockReturnValue({
      ...DEFAULT_PATCH,
      mutateAsync,
    } as unknown as ReturnType<typeof api.usePatchLeadStatus>)

    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByLabelText('Дорого'))
    await user.type(screen.getByPlaceholderText('Необязательно'), 'Слишком дорого')
    await user.click(screen.getByRole('button', { name: /отказать/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 'lead-123',
        body: {
          status: 'Refused',
          refusalReasonId: 'r1',
          refusalNote: 'Слишком дорого',
        },
      })
    })
  })

  it('calls onClose after successful submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    mockUsePatchLeadStatus.mockReturnValue({
      ...DEFAULT_PATCH,
      mutateAsync,
    } as unknown as ReturnType<typeof api.usePatchLeadStatus>)

    const user = userEvent.setup()
    render(
      <RefuseLeadDialog
        open
        onClose={onClose}
        leadId="lead-123"
        leadName="Иван Иванов"
      />,
    )

    await user.click(screen.getByLabelText('Передумал'))
    await user.click(screen.getByRole('button', { name: /отказать/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  it('calls onClose when clicking Cancel', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <RefuseLeadDialog
        open
        onClose={onClose}
        leadId="lead-123"
        leadName="Иван Иванов"
      />,
    )

    await user.click(screen.getByRole('button', { name: /отмена/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows error message when patchStatus fails', () => {
    mockUsePatchLeadStatus.mockReturnValue({
      ...DEFAULT_PATCH,
      isError: true,
    } as unknown as ReturnType<typeof api.usePatchLeadStatus>)
    renderDialog()
    expect(screen.getByText('Ошибка. Попробуйте снова.')).toBeTruthy()
  })

  it('calls onClose when pressing Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <RefuseLeadDialog
        open
        onClose={onClose}
        leadId="lead-123"
        leadName="Иван Иванов"
      />,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
