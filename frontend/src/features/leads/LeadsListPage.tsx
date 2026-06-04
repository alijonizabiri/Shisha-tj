import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useLeads } from './api'
import { LeadStatusBadge } from './components/LeadStatusBadge'
import { LEAD_STATUS_META } from './lib/leadStatuses'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatDate } from '@/shared/lib/formatDate'
import { formatMoney } from '@/shared/lib/formatMoney'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  ...Object.entries(LEAD_STATUS_META).map(([value, { label }]) => ({ value, label })),
]

export function LeadsListPage() {
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const search = useDebounce(searchInput, 300)

  const { data, isLoading, isError } = useLeads({ search, status, page, pageSize: PAGE_SIZE })

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1

  function handleSearchChange(value: string) {
    setSearchInput(value)
    setPage(1)
  }

  function handleStatusChange(value: string) {
    setStatus(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Лиды</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              Всего: {data.totalCount}
            </p>
          )}
        </div>
        {/* New lead button wired in Step 9 */}
        <Button disabled>+ Новый лид</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Поиск по имени или телефону…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Клиент</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Продукт</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата звонка</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Замерщик</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Загрузка…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-destructive">
                  Ошибка загрузки. Попробуйте обновить страницу.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Лиды не найдены
                </td>
              </tr>
            )}
            {data?.items.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/leads/${lead.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {lead.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.product}</td>
                <td className="px-4 py-3">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(lead.callDate)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lead.assignedMeasurerName ?? '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {lead.dealPriceTjs != null ? formatMoney(lead.dealPriceTjs) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
    </div>
  )
}
