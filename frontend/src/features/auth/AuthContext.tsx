/* eslint-disable react-refresh/only-export-components */
// Context + Provider live in the same file — standard React pattern for auth.

import { createContext, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { loginRequest, logoutRequest, refreshTokenRequest } from './api'
import { setAccessToken } from '@/shared/api/client'

export interface UserInfo {
  id: string
  email: string
  role: 'Admin' | 'Operator' | 'Measurer'
  tenantId: string
}

interface AuthState {
  user: UserInfo | null
  isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      unknown
    >
  } catch {
    return {}
  }
}

function userFromToken(token: string): UserInfo {
  const p = decodeJwtPayload(token)
  return {
    id: p['sub'] as string,
    email: p['email'] as string,
    role: p['role'] as UserInfo['role'],
    tenantId: p['tenantId'] as string,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: if a refresh token exists, start in loading state
  const [state, setState] = useState<AuthState>(() => ({
    user: null,
    isLoading: !!localStorage.getItem('refreshToken'),
  }))

  // Restore session from persisted refresh token on mount
  useEffect(() => {
    const stored = localStorage.getItem('refreshToken')
    if (!stored) return

    let cancelled = false
    refreshTokenRequest(stored)
      .then((res) => {
        if (cancelled) return
        setAccessToken(res.accessToken)
        localStorage.setItem('refreshToken', res.refreshToken)
        setState({ user: userFromToken(res.accessToken), isLoading: false })
      })
      .catch(() => {
        if (cancelled) return
        localStorage.removeItem('refreshToken')
        setState({ user: null, isLoading: false })
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Interceptor fires this when refresh itself fails (irrecoverable 401)
  useEffect(() => {
    const onForceLogout = () => setState({ user: null, isLoading: false })
    window.addEventListener('auth:logout', onForceLogout)
    return () => window.removeEventListener('auth:logout', onForceLogout)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password)
    setAccessToken(res.accessToken)
    localStorage.setItem('refreshToken', res.refreshToken)
    setState({ user: userFromToken(res.accessToken), isLoading: false })
  }, [])

  const logout = useCallback(async () => {
    const stored = localStorage.getItem('refreshToken')
    if (stored) {
      await logoutRequest(stored).catch(() => {
        // Clear locally even if the server request fails
      })
    }
    setAccessToken(null)
    localStorage.removeItem('refreshToken')
    setState({ user: null, isLoading: false })
  }, [])

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
}
