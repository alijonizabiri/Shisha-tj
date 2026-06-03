import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import * as useAuthModule from './useAuth'

vi.mock('./useAuth')
const mockUseAuth = vi.mocked(useAuthModule.useAuth)

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows validation error when email is missing', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, login: vi.fn(), logout: vi.fn() })
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: /войти/i }))

    await waitFor(() => {
      expect(screen.queryByText('Введите корректный email')).toBeTruthy()
    })
  })

  it('calls login with correct credentials on submit', async () => {
    const user = userEvent.setup()
    const mockLogin = vi.fn().mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, login: mockLogin, logout: vi.fn() })
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'admin@test.com')
    await user.type(screen.getByLabelText('Пароль'), 'password123')
    await user.click(screen.getByRole('button', { name: /войти/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'password123')
    })
  })

  it('shows server error message when login fails', async () => {
    const user = userEvent.setup()
    const mockLogin = vi.fn().mockRejectedValue(new Error('Unauthorized'))
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, login: mockLogin, logout: vi.fn() })
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'wrong@test.com')
    await user.type(screen.getByLabelText('Пароль'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /войти/i }))

    await waitFor(() => {
      expect(screen.queryByText('Неверный email или пароль')).toBeTruthy()
    })
  })
})
