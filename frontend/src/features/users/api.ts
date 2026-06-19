import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/queryKeys'

export interface UserDto {
  id: string
  fullName: string
  email: string
  role: string
  measurerFixedFeeTjs: number | null
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
