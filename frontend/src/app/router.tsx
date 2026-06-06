import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DesignerPage } from '@/features/designer/DesignerPage'
import { LeadsListPage } from '@/features/leads/LeadsListPage'
import { LeadsKanbanPage } from '@/features/leads/LeadsKanbanPage'
import { LeadDetailPage } from '@/features/leads/LeadDetailPage'
import { FactoryOrdersPage } from '@/features/factory-orders/FactoryOrdersPage'
import { AnalyticsDashboardPage } from '@/features/analytics/AnalyticsDashboardPage'
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
            element: <AnalyticsDashboardPage />,
          },
          {
            path: '/analytics',
            element: <AnalyticsDashboardPage />,
          },
          {
            path: '/leads',
            element: <LeadsListPage />,
          },
          {
            path: '/leads/kanban',
            element: <LeadsKanbanPage />,
          },
          {
            path: '/leads/:id',
            element: <LeadDetailPage />,
          },
          {
            path: '/factory-orders',
            element: <FactoryOrdersPage />,
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
