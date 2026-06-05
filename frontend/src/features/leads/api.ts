import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/queryKeys'
import type { components } from '@/shared/api/types'

export type Lead = components['schemas']['LeadSummaryResponse']
export type LeadDetail = components['schemas']['LeadDetailResponse']
export type PagedLeads = components['schemas']['PagedLeadsResponse']
export type KanbanData = components['schemas']['KanbanResponse']
export type PatchStatusRequest = components['schemas']['PatchStatusRequest']
export type CreateLeadRequest = components['schemas']['CreateLeadRequest']

export interface UpdateLeadRequest {
  name: string
  phone: string
  address?: string | null
  product: string
  source?: string | null
  note?: string | null
  callDate: string
  promisedInstallDate?: string | null
}
export type ProductDto = components['schemas']['ProductDto']
export type RefusalReasonDto = components['schemas']['RefusalReasonDto']
// LeadFinancesDto extended with Step 8 field (not yet in generated types)
export type LeadFinances = components['schemas']['LeadFinancesDto'] & {
  totalDepositTjs: number
}

export interface LeadFilters {
  status?: string
  search?: string
  page: number
  pageSize: number
}

function fetchLeads(filters: LeadFilters): Promise<PagedLeads> {
  const params: Record<string, unknown> = { page: filters.page, pageSize: filters.pageSize }
  if (filters.status) params['status'] = filters.status
  if (filters.search) params['search'] = filters.search
  return apiClient.get<PagedLeads>('/api/v1/leads', { params }).then((r) => r.data)
}

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: () => fetchLeads(filters),
    placeholderData: (prev) => prev,
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/leads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => apiClient.get<LeadDetail>(`/api/v1/leads/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useKanban() {
  return useQuery({
    queryKey: queryKeys.leads.kanban(),
    queryFn: () => apiClient.get<KanbanData>('/api/v1/leads/kanban').then((r) => r.data),
  })
}

export function useUpdateLead(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateLeadRequest) =>
      apiClient.put<LeadDetail>(`/api/v1/leads/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateLeadRequest) =>
      apiClient.post<LeadDetail>('/api/v1/leads', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  })
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.get<ProductDto[]>('/api/v1/products').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRefusalReasons() {
  return useQuery({
    queryKey: ['refusal-reasons'],
    queryFn: () =>
      apiClient.get<RefusalReasonDto[]>('/api/v1/refusal-reasons').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useLeadFinances(leadId: string) {
  return useQuery({
    queryKey: queryKeys.leads.finances(leadId),
    queryFn: () =>
      apiClient.get<LeadFinances>(`/api/v1/leads/${leadId}/finances`).then((r) => r.data),
    enabled: !!leadId,
  })
}

interface CreatePaymentBody {
  leadId: string
  amountTjs: number
  kind: string
  paidAt: string
  note?: string | null
}

export function useCreatePayment(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePaymentBody) => apiClient.post('/api/v1/payments', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.finances(leadId) }),
  })
}

export function useCreateHardware(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: components['schemas']['CreateHardwareRequest']) =>
      apiClient
        .post<components['schemas']['HardwareDto']>('/api/v1/hardware', body)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.finances(leadId) }),
  })
}

export function useDeletePayment(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => apiClient.delete(`/api/v1/payments/${paymentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.finances(leadId) }),
  })
}

export function usePatchLeadStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchStatusRequest }) =>
      apiClient.patch(`/api/v1/leads/${id}/status`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  })
}
