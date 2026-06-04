/**
 * Auto-generated from the backend Swagger spec.
 * Regenerate: npm run generate:types  (requires backend running on http://localhost:5175)
 *
 * Hand-crafted initial version — covers the current API surface (Phase 0).
 * This file will be overwritten by the generator on each run.
 */

export interface paths {
  '/api/v1/auth/login': {
    post: {
      requestBody: {
        content: { 'application/json': components['schemas']['LoginRequest'] }
      }
      responses: {
        200: { content: { 'application/json': components['schemas']['LoginResponse'] } }
        401: { content: { 'application/json': components['schemas']['ProblemDetails'] } }
      }
    }
  }
  '/api/v1/auth/refresh': {
    post: {
      requestBody: {
        content: { 'application/json': components['schemas']['RefreshRequest'] }
      }
      responses: {
        200: { content: { 'application/json': components['schemas']['LoginResponse'] } }
        401: { content: { 'application/json': components['schemas']['ProblemDetails'] } }
      }
    }
  }
  '/api/v1/auth/logout': {
    post: {
      requestBody: {
        content: { 'application/json': components['schemas']['LogoutRequest'] }
      }
      responses: {
        204: { content: never }
      }
    }
  }
  '/health': {
    get: {
      responses: {
        200: { content: { 'application/json': { status: string; timestamp: string } } }
      }
    }
  }
}

export type webhooks = Record<string, never>

export interface components {
  schemas: {
    LoginRequest: {
      email: string
      password: string
    }
    LoginResponse: {
      accessToken: string
      refreshToken: string
      /** ISO 8601 UTC */
      expiresAt: string
    }
    RefreshRequest: {
      refreshToken: string
    }
    LogoutRequest: {
      refreshToken: string
    }
    ProblemDetails: {
      type?: string | null
      title?: string | null
      status?: number | null
      detail?: string | null
      instance?: string | null
      errorCode?: string
      errors?: Record<string, string[]>
    }
    LeadSummaryResponse: {
      id: string
      name: string
      phone: string
      address: string | null
      product: string
      /** LeadStatus enum value as string */
      status: string
      source: string | null
      note: string | null
      refusalReasonId: string | null
      refusalNote: string | null
      /** DateOnly: "YYYY-MM-DD" */
      callDate: string
      promisedInstallDate: string | null
      warrantyUntil: string | null
      assignedMeasurerId: string | null
      assignedMeasurerName: string | null
      dealPriceTjs: number | null
      createdAt: string
      updatedAt: string
    }
    PagedLeadsResponse: {
      items: components['schemas']['LeadSummaryResponse'][]
      totalCount: number
      page: number
      pageSize: number
    }
    KanbanColumn: {
      status: string
      items: components['schemas']['LeadSummaryResponse'][]
    }
    KanbanResponse: {
      columns: components['schemas']['KanbanColumn'][]
    }
    PatchStatusRequest: {
      status: string
      refusalReasonId?: string | null
      refusalNote?: string | null
      dealPriceTjs?: number | null
      assignedMeasurerId?: string | null
      address?: string | null
      promisedInstallDate?: string | null
    }
    LeadMeasurementDto: {
      id: string
      configuration: string
      glassColor: string
      hardwareColor: string
      measureMm: number
      heightMm: number
      measuredAt: string
      createdAt: string
    }
    LeadDetailResponse: {
      id: string
      name: string
      phone: string
      address: string | null
      product: string
      status: string
      source: string | null
      note: string | null
      refusalReasonId: string | null
      refusalNote: string | null
      callDate: string
      promisedInstallDate: string | null
      warrantyUntil: string | null
      assignedMeasurerId: string | null
      assignedMeasurerName: string | null
      dealPriceTjs: number | null
      createdAt: string
      updatedAt: string
      measurements: components['schemas']['LeadMeasurementDto'][]
    }
  }
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}

export type $defs = Record<string, never>
export type external = Record<string, never>
export type operations = Record<string, never>
