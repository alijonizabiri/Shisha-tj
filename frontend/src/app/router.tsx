import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DesignerPage } from '@/features/designer/DesignerPage'
import { AppShell } from './layout/AppShell'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: (
              <div>
                <h1 className="text-2xl font-bold">Добро пожаловать</h1>
                <p className="mt-2 text-muted-foreground">
                  Дашборд появится в Phase 4.
                </p>
              </div>
            ),
          },
          {
            path: '/designer',
            element: <DesignerPage />,
          },
        ],
      },
    ],
  },
])
