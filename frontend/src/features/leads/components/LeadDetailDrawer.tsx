import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, Pencil, Plus, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLead } from '../api'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LeadFinancesPanel } from './LeadFinancesPanel'
import { EditLeadDialog } from './EditLeadDialog'
import { formatDate } from '@/shared/lib/formatDate'

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

export function LeadDetailDrawer({ leadId, onClose }: Props) {
  const { data: lead, isLoading } = useLead(leadId ?? '')
  const [editOpen, setEditOpen] = useState(false)
  const navigate = useNavigate()

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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 flex h-full w-full max-w-[640px] flex-col bg-background border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          {isLoading || !lead ? (
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          ) : (
            <h2 className="text-lg font-semibold truncate">{lead.name}</h2>
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
              {/* Contact info */}
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Информация
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Телефон" value={lead.phone} />
                  <InfoRow label="Продукт" value={lead.product} />
                  <InfoRow label="Источник" value={lead.source} />
                  <InfoRow label="Дата звонка" value={formatDate(lead.callDate)} />
                </div>
                {lead.note && (
                  <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {lead.note}
                  </p>
                )}
              </section>

              {/* Measurements */}
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Замеры ({lead.measurements.length})
                </h3>
                {lead.measurements.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">Замеров нет</p>
                    <button
                      onClick={() => navigate(`/designer?leadId=${lead.id}`)}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors w-fit"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Создать замер
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {lead.measurements.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {m.measureMm} × {m.heightMm} мм
                            </p>
                            <LeadStatusBadge status={m.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {GLASS_COLOR_LABELS[m.glassColor] ?? m.glassColor}
                            {m.assignedMeasurerName && ` · 👤 ${m.assignedMeasurerName}`}
                            {' · '}
                            {formatDate(m.measuredAt)}
                          </p>
                        </div>
                        <Link
                          to={`/designer?measurementId=${m.id}`}
                          className="shrink-0 ml-3 text-xs text-primary hover:underline"
                        >
                          Дизайнер →
                        </Link>
                      </div>
                    ))}
                    <button
                      onClick={() => navigate(`/designer?leadId=${lead.id}`)}
                      className="flex items-center gap-1.5 mt-1 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-fit"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Добавить замер
                    </button>
                  </div>
                )}
              </section>

              {/* Finances */}
              <LeadFinancesPanel
                leadId={lead.id}
                measurements={lead.measurements}
              />
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
