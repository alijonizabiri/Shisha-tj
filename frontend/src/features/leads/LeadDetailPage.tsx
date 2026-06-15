import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Ruler } from 'lucide-react'
import { useLead } from './api'
import { LeadStatusBadge } from './components/LeadStatusBadge'
import { LeadFinancesPanel } from './components/LeadFinancesPanel'
import { AddHardwareDialog } from './components/AddHardwareDialog'
import { formatDate } from '@/shared/lib/formatDate'

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
  const [hwMeasurementId, setHwMeasurementId] = useState<string | null>(null)

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
      <Link
        to="/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Все лиды
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lead.phone}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — main content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Contact info */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Информация
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow label="Имя" value={lead.name} />
              <InfoRow label="Телефон" value={lead.phone} />
              <InfoRow label="Продукт" value={lead.product} />
              <InfoRow label="Источник" value={lead.source} />
              <InfoRow label="Дата звонка" value={formatDate(lead.callDate)} />
            </div>
            {lead.note && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Заметка</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{lead.note}</p>
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {m.measureMm} × {m.heightMm} мм
                          </p>
                          <LeadStatusBadge status={m.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {CONFIG_LABELS[m.configuration] ?? m.configuration}
                          {' · '}
                          {GLASS_COLOR_LABELS[m.glassColor] ?? m.glassColor}
                          {m.assignedMeasurerName && ` · 👤 ${m.assignedMeasurerName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(m.measuredAt)}
                      </p>
                      <Link
                        to={`/designer?measurementId=${m.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Открыть в дизайнере
                      </Link>
                      <button
                        onClick={() => setHwMeasurementId(m.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        + Фурнитура
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <LeadFinancesPanel
            leadId={lead.id}
            measurements={lead.measurements}
          />
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
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

      {hwMeasurementId && (
        <AddHardwareDialog
          measurementId={hwMeasurementId}
          defaultColor={
            lead.measurements.find((m) => m.id === hwMeasurementId)?.hardwareColor ?? 'BlackMatte'
          }
          leadId={lead.id}
          onClose={() => setHwMeasurementId(null)}
        />
      )}
    </div>
  )
}
