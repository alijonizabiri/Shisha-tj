export const queryKeys = {
  leads: {
    all: ['leads'] as const,
    list: (filters: Record<string, unknown>) => ['leads', 'list', filters] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
    kanban: () => ['leads', 'kanban'] as const,
  },
  measurements: {
    detail: (id: string) => ['measurements', id] as const,
  },
  factoryOrders: {
    all: ['factory-orders'] as const,
    detail: (id: string) => ['factory-orders', id] as const,
  },
}
