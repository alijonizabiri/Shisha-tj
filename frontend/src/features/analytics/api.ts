import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/queryKeys'

// ── DTOs (analytics endpoints added after last openapi-typescript run) ────────

export interface DashboardDto {
  totalLeads: number
  activeLeads: number
  revenueTjs: number
  conversionRate: number | null
  avgDealSizeTjs: number | null
}

export interface FunnelRow {
  status: string
  count: number
}

export interface FunnelDto {
  statuses: FunnelRow[]
}

export interface RefusalRow {
  label: string
  count: number
  percentage: number
}

export interface RefusalsDto {
  reasons: RefusalRow[]
  totalRefused: number
}

export interface ProductRow {
  product: string
  leadCount: number
  revenueTjs: number
}

export interface ByProductDto {
  products: ProductRow[]
}

export interface ColorRow {
  color: string
  count: number
}

export interface ByColorDto {
  glassColors: ColorRow[]
  hardwareColors: ColorRow[]
}

export interface MeasurerRow {
  userId: string
  name: string
  leadCount: number
  revenueTjs: number
  conversionRate: number | null
}

export interface ByMeasurerDto {
  measurers: MeasurerRow[]
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

interface DateRange {
  from?: string
  to?: string
}

function buildParams(range: DateRange) {
  const p: Record<string, string> = {}
  if (range.from) p['from'] = range.from
  if (range.to) p['to'] = range.to
  return p
}

export function useAnalyticsDashboard(range: DateRange = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(range.from, range.to),
    queryFn: () =>
      apiClient
        .get<DashboardDto>('/api/v1/analytics/dashboard', { params: buildParams(range) })
        .then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useAnalyticsFunnel(range: DateRange = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.funnel(range.from, range.to),
    queryFn: () =>
      apiClient
        .get<FunnelDto>('/api/v1/analytics/funnel', { params: buildParams(range) })
        .then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useAnalyticsRefusals(range: DateRange = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.refusals(range.from, range.to),
    queryFn: () =>
      apiClient
        .get<RefusalsDto>('/api/v1/analytics/refusals', { params: buildParams(range) })
        .then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useAnalyticsByProduct(range: DateRange = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.byProduct(range.from, range.to),
    queryFn: () =>
      apiClient
        .get<ByProductDto>('/api/v1/analytics/by-product', { params: buildParams(range) })
        .then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useAnalyticsByColor(range: DateRange = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.byColor(range.from, range.to),
    queryFn: () =>
      apiClient
        .get<ByColorDto>('/api/v1/analytics/by-color', { params: buildParams(range) })
        .then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useAnalyticsByMeasurer(range: DateRange = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.byMeasurer(range.from, range.to),
    queryFn: () =>
      apiClient
        .get<ByMeasurerDto>('/api/v1/analytics/by-measurer', { params: buildParams(range) })
        .then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })
}
