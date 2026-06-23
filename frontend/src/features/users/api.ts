import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/queryKeys'

export interface UserDto {
  id: string
  fullName: string
  email: string
  role: string
  measurerFixedFeeTjs: number | null
}

export interface CreateUserPayload {
  fullName: string
  email: string
  password: string
  role: string
  measurerFixedFeeTjs?: number | null
}

function fetchUsers(): Promise<UserDto[]> {
  return apiClient.get<UserDto[]>('/api/v1/users').then((r) => r.data)
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: fetchUsers,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      apiClient.post<UserDto>('/api/v1/users', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export function useUpdateMeasurerFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, feeTjs }: { userId: string; feeTjs: number | null }) =>
      apiClient
        .patch(`/api/v1/users/${userId}/measurer-fee`, { measurerFixedFeeTjs: feeTjs })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/api/v1/users/${userId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  })
}
