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
}
