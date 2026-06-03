import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Страница входа (Step 9)</p>
      </div>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: (
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">SHISHA_TJ — authenticated</p>
          </div>
        ),
      },
    ],
  },
])
