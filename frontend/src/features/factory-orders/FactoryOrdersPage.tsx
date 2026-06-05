import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useFactoryOrders, downloadOrderPdf } from './api'
import { FactoryOrderStatusBadge } from './components/FactoryOrderStatusBadge'
import { CreateBatchDialog } from './components/CreateBatchDialog'
import { Button } from '@/shared/ui/button'
import { formatDate } from '@/shared/lib/formatDate'
import { formatMoney } from '@/shared/lib/formatMoney'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '',         label: 'Все статусы' },
  { value: 'Draft',    label: 'Черновик' },
  { value: 'Sent',     label: 'Отправлен' },
  { value: 'Received', label: 'Получен' },
  { value: 'Closed',   label: 'Закрыт' },
]

export function FactoryOrdersPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useFactoryOrders({ status, page, pageSize: PAGE_SIZE })

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1

  function handleStatusChange(value: string) {
    setStatus(value)
    setPage(1)
  }

  async function handleDownload(id: string) {
    setDownloadingId(id)
    try {
      await downloadOrderPdf(id)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Заказы на завод</h1>
          {data && (
            <p className="text-sm text-muted-foreground">Всего: {data.totalCount}</p>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Создать партию</Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Код</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Стёкол</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Создан</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Отправлен</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Итого</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Загрузка…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-destructive">
                  Ошибка загрузки. Попробуйте обновить страницу.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Заказы не найдены
                </td>
              </tr>
            )}
            {data?.items.map((order) => (
              <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</span>
                </td>
                <td className="px-4 py-3">
                  <FactoryOrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 tabular-nums">{order.itemCount}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.orderedAt ? formatDate(order.orderedAt) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {order.factoryTotalTjs != null ? formatMoney(order.factoryTotalTjs) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleDownload(order.id)}
                    disabled={downloadingId === order.id}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                    title="Скачать PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
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

      {createOpen && <CreateBatchDialog onClose={() => setCreateOpen(false)} />}
    </div>
  )
}
