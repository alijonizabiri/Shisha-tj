import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Kanban, Search } from 'lucide-react'
import { useLeads } from './api'
import { LeadDetailDrawer } from './components/LeadDetailDrawer'
import { NewLeadDialog } from './components/NewLeadDialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatDate } from '@/shared/lib/formatDate'

const PAGE_SIZE = 20

export function LeadsListPage() {
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const search = useDebounce(searchInput, 300)

  const { data, isLoading, isError } = useLeads({ search, page, pageSize: PAGE_SIZE })

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1

  function handleSearchChange(value: string) {
    setSearchInput(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Лиды</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              Всего: {data.totalCount}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/leads/kanban"
            className="inline-flex items-center h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Kanban className="mr-1 h-4 w-4" />
            Канбан
          </Link>
          <Button onClick={() => setNewLeadOpen(true)}>+ Новый лид</Button>
        </div>
      </div>

      <div className="relative flex-1 min-w-48 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Поиск по имени или телефону…"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Клиент</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Продукт</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Источник</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата звонка</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Загрузка…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-destructive">
                  Ошибка загрузки. Попробуйте обновить страницу.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Лиды не найдены
                </td>
              </tr>
            )}
            {data?.items.map((lead) => (
              <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="font-medium text-foreground hover:underline text-left"
                  >
                    {lead.name}
                  </button>
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.product}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.source ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(lead.callDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Страница {page} из {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Вперёд
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <NewLeadDialog open={newLeadOpen} onClose={() => setNewLeadOpen(false)} />

      <LeadDetailDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  )
}
