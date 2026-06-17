export const queryKeys = {
  leads: {
    all: ['leads'] as const,
    list: (filters: unknown) => ['leads', 'list', filters] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
    kanban: () => ['leads', 'kanban'] as const,
    finances: (id: string) => ['leads', id, 'finances'] as const,
  },
  measurements: {
    all: ['measurements'] as const,
    detail: (id: string) => ['measurements', id] as const,
    kanban: () => ['measurements', 'kanban'] as const,
    finances: (id: string) => ['measurements', id, 'finances'] as const,
  },
  factoryOrders: {
    all: ['factory-orders'] as const,
    list: (filters: unknown) => ['factory-orders', 'list', filters] as const,
    detail: (id: string) => ['factory-orders', id] as const,
    payments: (orderId: string) => ['factory-orders', orderId, 'payments'] as const,
  },
  measurerPayouts: {
    byMeasurement: (measurementId: string) => ['measurer-payouts', measurementId] as const,
  },
  analytics: {
    dashboard: (from?: string, to?: string) => ['analytics', 'dashboard', from, to] as const,
    funnel: (from?: string, to?: string) => ['analytics', 'funnel', from, to] as const,
    refusals: (from?: string, to?: string) => ['analytics', 'refusals', from, to] as const,
    byProduct: (from?: string, to?: string) => ['analytics', 'by-product', from, to] as const,
    byColor: (from?: string, to?: string) => ['analytics', 'by-color', from, to] as const,
    byMeasurer: (from?: string, to?: string) => ['analytics', 'by-measurer', from, to] as const,
    finances: (from: string, to: string) => ['analytics', 'finances', from, to] as const,
  },
}
