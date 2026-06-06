export const queryKeys = {
  leads: {
    all: ['leads'] as const,
    list: (filters: unknown) => ['leads', 'list', filters] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
    kanban: () => ['leads', 'kanban'] as const,
    finances: (id: string) => ['leads', id, 'finances'] as const,
  },
  measurements: {
    detail: (id: string) => ['measurements', id] as const,
  },
  factoryOrders: {
    all: ['factory-orders'] as const,
    list: (filters: unknown) => ['factory-orders', 'list', filters] as const,
    detail: (id: string) => ['factory-orders', id] as const,
  },
  analytics: {
    dashboard: (from?: string, to?: string) => ['analytics', 'dashboard', from, to] as const,
    funnel: (from?: string, to?: string) => ['analytics', 'funnel', from, to] as const,
    refusals: (from?: string, to?: string) => ['analytics', 'refusals', from, to] as const,
    byProduct: (from?: string, to?: string) => ['analytics', 'by-product', from, to] as const,
    byColor: (from?: string, to?: string) => ['analytics', 'by-color', from, to] as const,
    byMeasurer: (from?: string, to?: string) => ['analytics', 'by-measurer', from, to] as const,
  },
}
