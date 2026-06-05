import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, Pencil, Ruler, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLead } from '../api'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LeadFinancesPanel } from './LeadFinancesPanel'
import { EditLeadDialog } from './EditLeadDialog'
import { formatDate } from '@/shared/lib/formatDate'
import { formatMoney } from '@/shared/lib/formatMoney'

interface Props {
  leadId: string | null
  onClose: () => void
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  )
}

const GLASS_COLOR_LABELS: Record<string, string> = {
  Transparent: 'Прозрачное',
  Matte:       'Матовое',
  Iodine:      'Йод',
  Gray:        'Серое',
  EuroBronze:  'Евробронза',
}

const CONFIG_LABELS: Record<string, string> = {
  TwoGlass:   '2 стекла',
  ThreeGlass: '3 стекла',
}

export function LeadDetailDrawer({ leadId, onClose }: Props) {
  const { data: lead, isLoading } = useLead(leadId ?? '')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (!leadId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editOpen) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [leadId, onClose, editOpen])

  if (!leadId) return null

  const panel = createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full max-w-[640px] flex-col bg-background border-l border-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          {isLoading || !lead ? (
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-lg font-semibold truncate">{lead.name}</h2>
              <LeadStatusBadge status={lead.status} />
            </div>
          )}
          <div className="flex items-center gap-1 ml-3 shrink-0">
            {lead && (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  title="Редактировать лид"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <Link
                  to={`/leads/${lead.id}`}
                  title="Открыть страницу лида"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </>
            )}
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="rounded-md p-1.5 hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && !lead && (
            <p className="text-sm text-destructive">Лид не найден.</p>
          )}

          {lead && (
            <div className="flex flex-col gap-5">
              {/* Contact & deal info */}
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Информация
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Телефон" value={lead.phone} />
                  <InfoRow label="Продукт" value={lead.product} />
                  <InfoRow label="Источник" value={lead.source} />
                  <InfoRow label="Дата звонка" value={formatDate(lead.callDate)} />
                  <InfoRow label="Адрес" value={lead.address} />
                  <InfoRow label="Замерщик" value={lead.assignedMeasurerName} />
                  {lead.dealPriceTjs != null && (
                    <InfoRow label="Сумма сделки" value={formatMoney(lead.dealPriceTjs)} />
                  )}
                  {lead.promisedInstallDate && (
                    <InfoRow label="Дата установки" value={formatDate(lead.promisedInstallDate)} />
                  )}
                  {lead.warrantyUntil && (
                    <InfoRow label="Гарантия до" value={formatDate(lead.warrantyUntil)} />
                  )}
                </div>
                {lead.note && (
                  <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {lead.note}
                  </p>
                )}
                {lead.refusalNote && (
                  <p className="mt-3 border-t border-border pt-3 text-sm text-destructive">
                    Причина отказа: {lead.refusalNote}
                  </p>
                )}
              </section>

              {/* Measurements */}
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Замеры ({lead.measurements.length})
                </h3>
                {lead.measurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Замеров нет</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {lead.measurements.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <Ruler className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {m.measureMm} × {m.heightMm} мм
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {CONFIG_LABELS[m.configuration] ?? m.configuration}
                              {' · '}
                              {GLASS_COLOR_LABELS[m.glassColor] ?? m.glassColor}
                              {' · '}
                              {formatDate(m.measuredAt)}
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/designer?measurementId=${m.id}`}
                          className="shrink-0 ml-3 text-xs text-primary hover:underline"
                        >
                          Открыть в Дизайнере →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Finances */}
              <LeadFinancesPanel leadId={lead.id} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )

  return (
    <>
      {panel}
      {lead && editOpen && (
        <EditLeadDialog lead={lead} onClose={() => setEditOpen(false)} />
      )}
    </>
  )
}
