import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatMoney } from '@/shared/lib/formatMoney'
import { useAuth } from '@/features/auth/useAuth'
import { useAddFactoryPayment, useDeleteFactoryPayment } from '../api'
import type { FactoryPaymentDto } from '../api'

interface Props {
  orderId: string
  factoryTotalTjs: number | null
  factoryPaidTjs: number
  factoryDebtTjs: number | null
  payments: FactoryPaymentDto[]
}

export function FactoryOrderPaymentSection({
  orderId,
  factoryTotalTjs,
  factoryPaidTjs,
  factoryDebtTjs,
  payments,
}: Props) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  const addMutation = useAddFactoryPayment(orderId)
  const deleteMutation = useDeleteFactoryPayment(orderId)

  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [warning, setWarning] = useState<string | null>(null)

  async function handleAdd() {
    if (!amount) return
    const result = await addMutation.mutateAsync({
      amountTjs: Number(amount),
      paidAt,
      note: note.trim() || null,
    })
    if (result.warning) setWarning(result.warning)
    setShowForm(false)
    setAmount('')
    setNote('')
  }

  function handleCancel() {
    setShowForm(false)
    setAmount('')
    setNote('')
  }

  const isFullyPaid = factoryTotalTjs != null && factoryPaidTjs >= factoryTotalTjs

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Оплата заводу
      </p>

      {/* Totals */}
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Сумма заказа</span>
          <span className="tabular-nums">
            {factoryTotalTjs != null ? formatMoney(factoryTotalTjs) : '—'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Оплачено</span>
          <span className="tabular-nums font-medium">{formatMoney(factoryPaidTjs)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Долг</span>
          <span
            className={
              factoryDebtTjs != null && factoryDebtTjs > 0
                ? 'tabular-nums font-semibold text-destructive'
                : 'tabular-nums font-semibold text-green-600 dark:text-green-400'
            }
          >
            {factoryDebtTjs != null ? formatMoney(factoryDebtTjs) : '—'}
          </span>
        </div>
      </div>

      {isFullyPaid && (
        <span className="inline-block text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full mb-3">
          Полностью оплачено
        </span>
      )}

      {warning && (
        <p className="mb-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1.5 rounded-md">
          ⚠ {warning}
        </p>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-muted-foreground">История платежей</p>
          <div className="flex flex-col divide-y divide-border border border-border rounded-md overflow-hidden">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="tabular-nums font-medium">{formatMoney(p.amountTjs)}</span>
                  <span className="ml-2 text-muted-foreground text-xs">{p.paidAt}</span>
                  {p.note && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{p.note}</p>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    disabled={deleteMutation.isPending}
                    aria-label="Удалить платёж"
                    className="ml-2 shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {!showForm ? (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          Добавить платёж
        </Button>
      ) : (
        <div className="flex flex-col gap-2 border border-border rounded-md p-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Сумма (TJS)"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Комментарий (необязательно)"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!amount || addMutation.isPending}
            >
              {addMutation.isPending ? 'Сохранение…' : 'Добавить'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Отмена
            </Button>
          </div>
          {addMutation.isError && (
            <p className="text-xs text-destructive">Ошибка сохранения платежа.</p>
          )}
        </div>
      )}
    </div>
  )
}
