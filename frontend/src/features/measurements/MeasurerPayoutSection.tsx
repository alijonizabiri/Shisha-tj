import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { formatMoney } from '@/shared/lib/formatMoney'
import { formatDate } from '@/shared/lib/formatDate'
import {
  useMeasurerPayout,
  useCreateMeasurerPayout,
  useMarkPayoutPaid,
  useMeasurers,
} from './api'

interface Props {
  measurementId: string
}

export function MeasurerPayoutSection({ measurementId }: Props) {
  const { data: payout, isLoading } = useMeasurerPayout(measurementId)
  const { data: measurers = [] } = useMeasurers()

  const createPayout = useCreateMeasurerPayout(measurementId)
  const markPaid = useMarkPayoutPaid(measurementId)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showMarkPaidForm, setShowMarkPaidForm] = useState(false)

  const [selectedMeasurerId, setSelectedMeasurerId] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])

  const selectedMeasurer = measurers.find((m) => m.id === selectedMeasurerId)

  function handleSelectMeasurer(id: string) {
    setSelectedMeasurerId(id)
    const m = measurers.find((x) => x.id === id)
    if (m?.measurerFixedFeeTjs != null) {
      setActualAmount(String(m.measurerFixedFeeTjs))
    } else {
      setActualAmount('')
    }
  }

  async function handleCreate() {
    if (!selectedMeasurerId) return
    await createPayout.mutateAsync({
      measurementId,
      measurerId: selectedMeasurerId,
      actualAmountTjs: actualAmount ? Number(actualAmount) : undefined,
    })
    setShowCreateForm(false)
    setSelectedMeasurerId('')
    setActualAmount('')
  }

  async function handleMarkPaid() {
    if (!payout) return
    await markPaid.mutateAsync({ payoutId: payout.id, paidAt })
    setShowMarkPaidForm(false)
  }

  if (isLoading) return null

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Выплата замерщику
      </p>

      {!payout && !showCreateForm && (
        <Button size="sm" variant="outline" onClick={() => setShowCreateForm(true)}>
          + Создать выплату
        </Button>
      )}

      {!payout && showCreateForm && (
        <div className="flex flex-col gap-2">
          <select
            value={selectedMeasurerId}
            onChange={(e) => handleSelectMeasurer(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Выберите замерщика…</option>
            {measurers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
                {m.measurerFixedFeeTjs != null ? ` (ставка: ${formatMoney(m.measurerFixedFeeTjs)})` : ' (ставка не задана)'}
              </option>
            ))}
          </select>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              placeholder="Сумма выплаты (TJS)"
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {selectedMeasurer && selectedMeasurer.measurerFixedFeeTjs == null && (
            <p className="text-xs text-destructive">
              У замерщика не задана ставка. Введите сумму вручную или задайте ставку в профиле.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!selectedMeasurerId || !actualAmount || createPayout.isPending}
            >
              {createPayout.isPending ? 'Создание…' : 'Создать'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowCreateForm(false); setSelectedMeasurerId(''); setActualAmount('') }}
            >
              Отмена
            </Button>
          </div>

          {createPayout.isError && (
            <p className="text-xs text-destructive">Ошибка создания выплаты.</p>
          )}
        </div>
      )}

      {payout && !payout.isPaid && !showMarkPaidForm && (
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">{payout.measurerName}: </span>
            <span className="font-medium tabular-nums">{formatMoney(payout.actualAmountTjs)}</span>
            <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
              Не выплачено
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowMarkPaidForm(true)}>
            Отметить выплаченным
          </Button>
        </div>
      )}

      {payout && !payout.isPaid && showMarkPaidForm && (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">
            Сумма: <span className="font-medium text-foreground">{formatMoney(payout.actualAmountTjs)}</span>
          </div>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleMarkPaid}
              disabled={markPaid.isPending}
            >
              {markPaid.isPending ? 'Сохранение…' : 'Подтвердить'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowMarkPaidForm(false)}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {payout && payout.isPaid && (
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">{payout.measurerName}: </span>
            <span className="font-medium tabular-nums">{formatMoney(payout.actualAmountTjs)}</span>
          </div>
          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full">
            Выплачено {payout.paidAt ? formatDate(payout.paidAt) : ''}
          </span>
        </div>
      )}
    </div>
  )
}
