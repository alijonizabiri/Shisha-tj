/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { AppShell } from './layout/AppShell'

// Route-level code splitting — each page loads its own chunk on first visit
const DesignerPage = lazy(() =>
  import('@/features/designer/DesignerPage').then((m) => ({ default: m.DesignerPage })),
)
const LeadsListPage = lazy(() =>
  import('@/features/leads/LeadsListPage').then((m) => ({ default: m.LeadsListPage })),
)
const LeadsKanbanPage = lazy(() =>
  import('@/features/leads/LeadsKanbanPage').then((m) => ({ default: m.LeadsKanbanPage })),
)
const LeadDetailPage = lazy(() =>
  import('@/features/leads/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })),
)
const FactoryOrdersPage = lazy(() =>
  import('@/features/factory-orders/FactoryOrdersPage').then((m) => ({
    default: m.FactoryOrdersPage,
  })),
)
const AnalyticsDashboardPage = lazy(() =>
  import('@/features/analytics/AnalyticsDashboardPage').then((m) => ({
    default: m.AnalyticsDashboardPage,
  })),
)
const AnalyticsFinancesPage = lazy(() =>
  import('@/features/analytics/AnalyticsFinancesPage').then((m) => ({
    default: m.AnalyticsFinancesPage,
  })),
)
const AnalyticsLayout = lazy(() =>
  import('@/features/analytics/AnalyticsLayout').then((m) => ({
    default: m.AnalyticsLayout,
  })),
)
const UsersPage = lazy(() =>
  import('@/features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
)

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        // Designer runs fullscreen — no AppShell sidebar/header
        path: '/designer',
        element: <Lazy><DesignerPage /></Lazy>,
      },
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: <Lazy><AnalyticsDashboardPage /></Lazy>,
          },
          {
            path: '/analytics',
            element: <Lazy><AnalyticsLayout /></Lazy>,
            children: [
              {
                index: true,
                element: <Lazy><AnalyticsDashboardPage /></Lazy>,
              },
              {
                path: 'finances',
                element: <Lazy><AnalyticsFinancesPage /></Lazy>,
              },
            ],
          },
          {
            path: '/leads',
            element: <Lazy><LeadsListPage /></Lazy>,
          },
          {
            path: '/leads/kanban',
            element: <Lazy><LeadsKanbanPage /></Lazy>,
          },
          {
            path: '/leads/:id',
            element: <Lazy><LeadDetailPage /></Lazy>,
          },
          {
            path: '/factory-orders',
            element: <Lazy><FactoryOrdersPage /></Lazy>,
          },
          {
            path: '/users',
            element: <Lazy><UsersPage /></Lazy>,
          },
        ],
      },
    ],
  },
])
