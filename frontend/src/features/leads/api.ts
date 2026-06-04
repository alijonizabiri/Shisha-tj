import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/queryKeys'
import type { components } from '@/shared/api/types'

export type Lead = components['schemas']['LeadSummaryResponse']
export type PagedLeads = components['schemas']['PagedLeadsResponse']
export type KanbanData = components['schemas']['KanbanResponse']
export type PatchStatusRequest = components['schemas']['PatchStatusRequest']

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

export function useKanban() {
  return useQuery({
    queryKey: queryKeys.leads.kanban(),
    queryFn: () => apiClient.get<KanbanData>('/api/v1/leads/kanban').then((r) => r.data),
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
