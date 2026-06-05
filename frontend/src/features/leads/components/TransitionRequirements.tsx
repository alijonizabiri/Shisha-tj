import { CheckCircle2, XCircle } from 'lucide-react'
import { formatMoney } from '@/shared/lib/formatMoney'

const MIN_DEPOSIT = 100

interface Props {
  hasMeasurement: boolean
  hasDealPrice: boolean
  totalDepositTjs: number
}

function Req({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
        : <XCircle      className="h-3.5 w-3.5 shrink-0 text-destructive" />}
      <span className={ok ? 'text-muted-foreground' : 'text-destructive'}>{label}</span>
    </div>
  )
}

export function TransitionRequirements({ hasMeasurement, hasDealPrice, totalDepositTjs }: Props) {
  const depositOk = totalDepositTjs >= MIN_DEPOSIT
  const depositLabel = depositOk
    ? `Депозит: ${formatMoney(totalDepositTjs)}`
    : `Депозит: ${formatMoney(totalDepositTjs)} / ${formatMoney(MIN_DEPOSIT)} мин.`

  return (
    <div className="flex flex-col gap-1 pt-1">
      <Req ok={hasMeasurement} label="Есть замер" />
      <Req ok={hasDealPrice}   label="Сумма сделки задана" />
      <Req ok={depositOk}      label={depositLabel} />
    </div>
  )
}
