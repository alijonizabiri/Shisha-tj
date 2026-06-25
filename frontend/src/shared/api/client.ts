import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Module-level token — AuthContext writes here; interceptors read it synchronously
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

// ХАРДКОДИМ ССЫЛКУ НА ТВОЙ БЭКЕНД В ОБЛАКЕ RENDER
export const apiClient = axios.create({
  baseURL: 'https://shisha-tj.onrender.com',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every outgoing request
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`
  }
  return config
})

// ── 401 → refresh → retry ────────────────────────────────────────────────────

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null): void {
  for (const item of failedQueue) {
    if (error) item.reject(error)
    else item.resolve(token!)
  }
  failedQueue = []
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined

    if (error.response?.status !== 401 || !config || config._retry) {
      return Promise.reject(error)
    }

    // Queue concurrent 401s while a refresh is in progress
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        config.headers['Authorization'] = `Bearer ${token}`
        return apiClient(config)
      })
    }

    config._retry = true
    isRefreshing = true

    const storedRefresh = localStorage.getItem('refreshToken')

    if (!storedRefresh) {
      isRefreshing = false
      processQueue(new Error('No refresh token'), null)
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(error)
    }

    try {
      // ТУТ ТОЖЕ ХАРДКОДИМ АДРЕС СЕРВЕРА ДЛЯ ОБНОВЛЕНИЯ ТОКЕНА
      const base = 'https://shisha-tj.onrender.com'
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${base}/api/v1/auth/refresh`,
        { refreshToken: storedRefresh },
      )

      setAccessToken(data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      processQueue(null, data.accessToken)

      config.headers['Authorization'] = `Bearer ${data.accessToken}`
      return apiClient(config)
    } catch (err) {
      processQueue(err, null)
      setAccessToken(null)
      localStorage.removeItem('refreshToken')
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)