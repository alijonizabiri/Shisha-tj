import axios from 'axios'
import { apiClient } from '@/shared/api/client'

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

const base = (): string => import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// Raw axios — no auth header needed for login or refresh
export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(`${base()}/api/v1/auth/login`, {
    email,
    password,
  })
  return data
}

export async function refreshTokenRequest(refreshToken: string): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(`${base()}/api/v1/auth/refresh`, {
    refreshToken,
  })
  return data
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await apiClient.post('/api/v1/auth/logout', { refreshToken })
}
