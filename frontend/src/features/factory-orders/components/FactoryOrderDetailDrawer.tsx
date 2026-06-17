import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useFactoryOrder } from '../api'
import { FactoryOrderStatusBadge } from './FactoryOrderStatusBadge'
import { FactoryOrderPaymentSection } from './FactoryOrderPaymentSection'
import { formatMoney } from '@/shared/lib/formatMoney'
import { formatDate } from '@/shared/lib/formatDate'

interface Props {
  orderId: string
  onClose: () => void
}

export function FactoryOrderDetailDrawer({ orderId, onClose }: Props) {
  const { data: order, isLoading } = useFactoryOrder(orderId)

  const canPay = order && (order.status === 'Received' || order.status === 'Closed')

  const panel = createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[520px] flex-col bg-background border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">
            {isLoading ? 'Загрузка…' : `Заказ ${orderId.slice(0, 8).toUpperCase()}`}
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-md p-1.5 hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {order && (
            <div className="flex flex-col gap-4">
              {/* Status + dates */}
              <section className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FactoryOrderStatusBadge status={order.status} />
                  <span className="text-xs text-muted-foreground">
                    Создан: {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {order.orderedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Отправлен</p>
                      <p className="font-medium">{formatDate(order.orderedAt)}</p>
                    </div>
                  )}
                  {order.receivedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Получен</p>
                      <p className="font-medium">{formatDate(order.receivedAt)}</p>
                    </div>
                  )}
                  {order.factoryTotalTjs != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Сумма заказа</p>
                      <p className="font-medium tabular-nums">{formatMoney(order.factoryTotalTjs)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Позиций</p>
                    <p className="font-medium">{order.items.length}</p>
                  </div>
                </div>
                {order.note && (
                  <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">
                    {order.note}
                  </p>
                )}
              </section>

              {/* Items */}
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Стёкла ({order.items.length})
                </h3>
                <div className="flex flex-col divide-y divide-border">
                  {order.items.map((item) => (
                    <div key={item.id} className="py-2 text-sm flex items-center justify-between">
                      <div>
                        <span className="font-medium">{item.widthMm} × {item.heightMm} мм</span>
                        {item.isDoor && (
                          <span className="ml-2 text-xs text-muted-foreground">(дверь)</span>
                        )}
                        {item.isRework && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                            переделка
                          </span>
                        )}
                      </div>
                      <span className="tabular-nums text-muted-foreground">
                        {item.glassCostTjs != null ? formatMoney(item.glassCostTjs) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Payment section */}
              {canPay && (
                <section className="rounded-lg border border-border bg-card p-4">
                  <FactoryOrderPaymentSection
                    orderId={order.id}
                    factoryTotalTjs={order.factoryTotalTjs}
                    factoryPaidTjs={order.factoryPaidTjs}
                    factoryDebtTjs={order.factoryDebtTjs}
                    payments={order.factoryPayments}
                  />
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )

  return <>{panel}</>
}
