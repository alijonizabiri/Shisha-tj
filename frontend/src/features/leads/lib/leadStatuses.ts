export interface LeadStatusMeta {
  label: string
  className: string
}

export const LEAD_STATUS_META: Record<string, LeadStatusMeta> = {
  New:              { label: 'Новый',          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  Measurement:      { label: 'Замер',          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  Thinking:         { label: 'Думает',         className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  Buying:           { label: 'Покупает',       className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  OrderedAtFactory: { label: 'На фабрике',     className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  GlassArrived:     { label: 'Стекло прибыло', className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  Installed:        { label: 'Установлен',     className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  Closed:           { label: 'Закрыт',         className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  Refused:          { label: 'Отказ',          className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
}
