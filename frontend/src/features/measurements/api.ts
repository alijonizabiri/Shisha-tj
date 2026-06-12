import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/queryKeys'
import type { components } from '@/shared/api/types'

export type MeasurementKanbanItem = components['schemas']['MeasurementKanbanItemResponse']
export type MeasurementKanban = components['schemas']['MeasurementKanbanResponse']
export type PatchMeasurementStatusRequest = components['schemas']['PatchMeasurementStatusRequest']
export type MeasurementFinances = components['schemas']['MeasurementFinancesDto']

export function useMeasurementKanban() {
  return useQuery({
    queryKey: queryKeys.measurements.kanban(),
    queryFn: () =>
      apiClient.get<MeasurementKanban>('/api/v1/measurements/kanban').then((r) => r.data),
  })
}

export function usePatchMeasurementStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchMeasurementStatusRequest }) =>
      apiClient.patch(`/api/v1/measurements/${id}/status`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.measurements.kanban() })
      qc.invalidateQueries({ queryKey: queryKeys.leads.all })
    },
  })
}

export function useAssignMeasurer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      apiClient.post(`/api/v1/measurements/${id}/assign-measurer`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.measurements.kanban() })
      qc.invalidateQueries({ queryKey: queryKeys.leads.all })
    },
  })
}

export function useMeasurementFinances(measurementId: string) {
  return useQuery({
    queryKey: queryKeys.measurements.finances(measurementId),
    queryFn: () =>
      apiClient
        .get<MeasurementFinances>(`/api/v1/measurements/${measurementId}/finances`)
        .then((r) => r.data),
    enabled: !!measurementId,
  })
}

interface CreatePaymentBody {
  measurementId: string
  amountTjs: number
  kind: string
  paidAt: string
  note?: string | null
}

export function useCreateMeasurementPayment(measurementId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePaymentBody) => apiClient.post('/api/v1/payments', body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.measurements.finances(measurementId) }),
  })
}
