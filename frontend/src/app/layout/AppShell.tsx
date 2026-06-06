import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
