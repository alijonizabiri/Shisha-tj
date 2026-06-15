import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/queryKeys'
import type { components } from '@/shared/api/types'
import type { MeasurementApiResponse } from '@/features/designer/api'

export type FactoryOrderSummary = components['schemas']['FactoryOrderSummaryResponse']
export type FactoryOrderDetail = components['schemas']['FactoryOrderDetailResponse']
export type PagedFactoryOrders = components['schemas']['PagedFactoryOrdersResponse']

export interface FactoryOrderFilters {
  status?: string
  page: number
  pageSize: number
}

function fetchOrders(filters: FactoryOrderFilters): Promise<PagedFactoryOrders> {
  const params: Record<string, unknown> = { page: filters.page, pageSize: filters.pageSize }
  if (filters.status) params['status'] = filters.status
  return apiClient.get<PagedFactoryOrders>('/api/v1/factory-orders', { params }).then((r) => r.data)
}

export function useFactoryOrders(filters: FactoryOrderFilters) {
  return useQuery({
    queryKey: queryKeys.factoryOrders.list(filters),
    queryFn: () => fetchOrders(filters),
    placeholderData: (prev) => prev,
  })
}

export function useFactoryOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.factoryOrders.detail(id),
    queryFn: () =>
      apiClient.get<FactoryOrderDetail>(`/api/v1/factory-orders/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateBatchOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (measurementIds: string[]): Promise<FactoryOrderDetail> => {
      // Fetch measurements in parallel to get glass IDs
      const measurements = await Promise.all(
        measurementIds.map((id) =>
          apiClient
            .get<MeasurementApiResponse>(`/api/v1/measurements/${id}`)
            .then((r) => r.data),
        ),
      )

      const glassIds = measurements.flatMap((m) => m.glasses.map((g) => g.id))
      if (glassIds.length === 0)
        throw new Error('Нет стёкол для выбранных замеров')

      return apiClient
        .post<FactoryOrderDetail>('/api/v1/factory-orders', { glassIds })
        .then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.factoryOrders.all })
      qc.invalidateQueries({ queryKey: queryKeys.measurements.kanban() })
    },
  })
}

export async function downloadOrderPdf(id: string): Promise<void> {
  const response = await apiClient.get(`/api/v1/factory-orders/${id}/pdf`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(
    new Blob([response.data as BlobPart], { type: 'application/pdf' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `factory-order-${id.slice(0, 8).toUpperCase()}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
