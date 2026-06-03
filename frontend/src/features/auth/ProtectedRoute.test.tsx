import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import * as useAuthModule from './useAuth'

vi.mock('./useAuth')
const mockUseAuth = vi.mocked(useAuthModule.useAuth)

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, login: vi.fn(), logout: vi.fn() })
    renderWithRoutes()
    expect(screen.queryByText('Загрузка...')).toBeTruthy()
  })

  it('redirects to /login when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, login: vi.fn(), logout: vi.fn() })
    renderWithRoutes()
    expect(screen.queryByText('Login Page')).toBeTruthy()
    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('renders protected content when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'a@b.com', role: 'Admin' as const, tenantId: 't1' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderWithRoutes()
    expect(screen.queryByText('Protected Content')).toBeTruthy()
    expect(screen.queryByText('Login Page')).toBeNull()
  })
})
