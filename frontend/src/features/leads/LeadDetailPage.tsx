import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Ruler } from 'lucide-react'
import { useLead } from './api'
import { LeadStatusBadge } from './components/LeadStatusBadge'
import { LeadFinancesPanel } from './components/LeadFinancesPanel'
import { RefuseLeadDialog } from './components/RefuseLeadDialog'
import { formatDate } from '@/shared/lib/formatDate'
import { formatMoney } from '@/shared/lib/formatMoney'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value ?? '—'}</p>
    </div>
  )
}

const GLASS_COLOR_LABELS: Record<string, string> = {
  Transparent: 'Прозрачное',
  Matte:       'Матовое',
  Tinted:      'Тонированное',
  Bronze:      'Бронза',
}

const CONFIG_LABELS: Record<string, string> = {
  TwoGlass:   '2 стекла',
  ThreeGlass: '3 стекла',
  FourGlass:  '4 стекла',
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: lead, isLoading, isError } = useLead(id ?? '')
  const [refuseOpen, setRefuseOpen] = useState(false)

  const canRefuse = ['New', 'Measurement', 'Thinking'].includes(lead?.status ?? '')

  if (isLoading) {
    return <div className="py-16 text-center text-muted-foreground">Загрузка…</div>
  }

  if (isError || !lead) {
    return (
      <div className="py-16 text-center">
        <p className="text-destructive">Лид не найден или недоступен.</p>
        <Link to="/leads" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Назад к списку
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        to="/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Все лиды
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{lead.name}</h1>
            <LeadStatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{lead.phone}</p>
        </div>
        <div className="flex gap-2">
          <button
            disabled
            className="h-9 rounded-md border border-input bg-background px-3 text-sm opacity-50 cursor-not-allowed"
          >
            Редактировать
          </button>
          {canRefuse && (
            <button
              onClick={() => setRefuseOpen(true)}
              className="h-9 rounded-md border border-destructive/50 bg-background px-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Отказать
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — main content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Contact & product info */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Информация
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Имя" value={lead.name} />
              <InfoRow label="Телефон" value={lead.phone} />
              <InfoRow label="Адрес" value={lead.address} />
              <InfoRow label="Продукт" value={lead.product} />
              <InfoRow label="Источник" value={lead.source} />
              <InfoRow label="Дата звонка" value={formatDate(lead.callDate)} />
              {lead.promisedInstallDate && (
                <InfoRow label="Дата установки" value={formatDate(lead.promisedInstallDate)} />
              )}
              {lead.warrantyUntil && (
                <InfoRow label="Гарантия до" value={formatDate(lead.warrantyUntil)} />
              )}
            </div>
            {lead.note && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Заметка</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{lead.note}</p>
              </div>
            )}
            {lead.refusalNote && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Причина отказа</p>
                <p className="mt-1 text-sm text-destructive">{lead.refusalNote}</p>
              </div>
            )}
          </div>

          {/* Measurements */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Замеры ({lead.measurements.length})
            </h2>
            {lead.measurements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Замеров нет</p>
            ) : (
              <div className="flex flex-col gap-3">
                {lead.measurements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Ruler className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {m.measureMm} × {m.heightMm} мм
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {CONFIG_LABELS[m.configuration] ?? m.configuration}
                          {' · '}
                          {GLASS_COLOR_LABELS[m.glassColor] ?? m.glassColor}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(m.measuredAt)}
                      </p>
                      <Link
                        to={`/designer?measurementId=${m.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Открыть в дизайнере
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Finances panel */}
          <LeadFinancesPanel leadId={lead.id} />
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Status & finances */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Сделка
            </h3>
            <div className="flex flex-col gap-3">
              <InfoRow label="Статус" value={<LeadStatusBadge status={lead.status} />} />
              {lead.dealPriceTjs != null && (
                <InfoRow label="Сумма сделки" value={formatMoney(lead.dealPriceTjs)} />
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Хронология
            </h3>
            <div className="flex flex-col gap-3">
              <InfoRow label="Создан" value={formatDate(lead.createdAt)} />
              <InfoRow label="Обновлён" value={formatDate(lead.updatedAt)} />
            </div>
          </div>
        </div>
      </div>

      <RefuseLeadDialog
        open={refuseOpen}
        onClose={() => setRefuseOpen(false)}
        leadId={lead.id}
        leadName={lead.name}
      />
    </div>
  )
}
