import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'

// ── Request / Response types ──────────────────────────────────────────────────

export interface HoleRequest {
  panelIndex: number
  xMm: number
  yMm: number
  radiusMm: number
  holeType: string
}

export interface CreateMeasurementRequest {
  measureMm: number
  heightMm: number
  configuration: string
  glassColor: string
  hardwareColor: string
  handleSide?: string
  leadId?: string | null
  holes?: HoleRequest[]
}

export interface HoleResponse {
  id: string
  xMm: number
  yMm: number
  radiusMm: number
  holeType: string
}

export interface GlassResponse {
  id: string
  position: number
  isDoor: boolean
  widthMm: number
  heightMm: number
  holes: HoleResponse[]
}

export interface MeasurementApiResponse {
  id: string
  measurerId: string | null
  measureMm: number
  heightMm: number
  configuration: string
  glassColor: string
  hardwareColor: string
  handleSide: string
  measuredAt: string
  createdAt: string
  glasses: GlassResponse[]
}

// ── Designer lead selector ────────────────────────────────────────────────────

export interface DesignerLeadOption {
  id: string
  name: string
  status: string
}

const DESIGNER_STATUSES = new Set(['Measurement', 'Buying', 'OrderedAtFactory', 'GlassArrived'])

export function useDesignerLeads() {
  return useQuery<DesignerLeadOption[]>({
    queryKey: ['designer-leads'],
    queryFn: () =>
      apiClient
        .get<{ columns: { status: string; items: { id: string; name: string; status: string }[] }[] }>(
          '/api/v1/leads/kanban',
        )
        .then((r) =>
          r.data.columns
            .filter((c) => DESIGNER_STATUSES.has(c.status))
            .flatMap((c) =>
              c.items.map((i): DesignerLeadOption => ({ id: i.id, name: i.name, status: i.status })),
            ),
        ),
    staleTime: 30_000,
  })
}

// ── Mutation ──────────────────────────────────────────────────────────────────

export function useSaveMeasurement() {
  return useMutation({
    mutationFn: (request: CreateMeasurementRequest) =>
      apiClient
        .post<MeasurementApiResponse>('/api/v1/measurements', request)
        .then((r) => r.data),
  })
}

// ── PDF download (blob via apiClient so the JWT interceptor fires) ────────────

export async function downloadMeasurementPdf(
  id: string,
  format: 'a4' | 'a3' = 'a4',
): Promise<void> {
  const response = await apiClient.get(`/api/v1/measurements/${id}/pdf`, {
    params: { format },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(
    new Blob([response.data as BlobPart], { type: 'application/pdf' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `shisha-${id.slice(0, 8)}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
