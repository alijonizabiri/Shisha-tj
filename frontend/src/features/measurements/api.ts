import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/queryKeys'
import type { components } from '@/shared/api/types'

export type MeasurementKanbanItem = components['schemas']['MeasurementKanbanItemResponse']
export type MeasurementKanban = components['schemas']['MeasurementKanbanResponse']
export type PatchMeasurementStatusRequest = components['schemas']['PatchMeasurementStatusRequest']
export type MeasurementFinances = components['schemas']['MeasurementFinancesDto']

export interface MeasurerPayoutDto {
  id: string
  measurementId: string
  measurerId: string
  measurerName: string
  calculatedAmountTjs: number
  actualAmountTjs: number
  isPaid: boolean
  paidAt: string | null
  note: string | null
  createdAt: string
}

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

// ── Users / Measurers ────────────────────────────────────────────────────────

export interface MeasurerListItem {
  id: string
  fullName: string
  email: string
  measurerFixedFeeTjs: number | null
}

export function useMeasurers() {
  return useQuery({
    queryKey: ['users', 'measurers'],
    queryFn: () =>
      apiClient.get<MeasurerListItem[]>('/api/v1/users/measurers').then((r) => r.data),
  })
}

// ── Measurer Payout ───────────────────────────────────────────────────────────

export function useMeasurerPayout(measurementId: string) {
  return useQuery({
    queryKey: queryKeys.measurerPayouts.byMeasurement(measurementId),
    queryFn: async () => {
      const r = await apiClient.get<MeasurerPayoutDto>(
        `/api/v1/measurements/${measurementId}/measurer-payout`,
      )
      return r.status === 204 ? null : r.data
    },
    enabled: !!measurementId,
  })
}

export function useCreateMeasurerPayout(measurementId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { measurementId: string; measurerId: string; actualAmountTjs?: number }) =>
      apiClient.post<MeasurerPayoutDto>('/api/v1/measurer-payouts', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.measurerPayouts.byMeasurement(measurementId) })
      qc.invalidateQueries({ queryKey: queryKeys.measurements.finances(measurementId) })
    },
  })
}

export function useMarkPayoutPaid(measurementId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payoutId, paidAt }: { payoutId: string; paidAt?: string }) =>
      apiClient
        .patch<MeasurerPayoutDto>(`/api/v1/measurer-payouts/${payoutId}/mark-paid`, { paidAt })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.measurerPayouts.byMeasurement(measurementId) })
      qc.invalidateQueries({ queryKey: queryKeys.measurements.finances(measurementId) })
    },
  })
}
