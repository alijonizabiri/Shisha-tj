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
    MeasurerDto: {
      id: string
      fullName: string
      email: string
    }
    AssignMeasurerRequest: {
      userId: string
    }
    CreateLeadRequest: {
      name: string
      phone: string
      address?: string | null
      product: string
      source?: string | null
      note?: string | null
      callDate: string
    }
    ProductDto: {
      id: string
      name: string
      isActive: boolean
    }
    RefusalReasonDto: {
      id: string
      label: string
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
    FactoryOrderItemDto: {
      id: string
      glassId: string
      widthMm: number
      heightMm: number
      isDoor: boolean
      position: number
      glassCostTjs: number | null
      isRework: boolean
      reworkReason: string | null
      leadId: string | null
      leadName: string | null
    }
    FactoryOrderSummaryResponse: {
      id: string
      /** Draft | Sent | Received | Closed */
      status: string
      /** DateOnly "YYYY-MM-DD" */
      orderedAt: string | null
      receivedAt: string | null
      factoryTotalTjs: number | null
      note: string | null
      itemCount: number
      createdAt: string
    }
    PagedFactoryOrdersResponse: {
      items: components['schemas']['FactoryOrderSummaryResponse'][]
      totalCount: number
      page: number
      pageSize: number
    }
    FactoryOrderDetailResponse: {
      id: string
      status: string
      orderedAt: string | null
      receivedAt: string | null
      factoryTotalTjs: number | null
      note: string | null
      createdAt: string
      items: components['schemas']['FactoryOrderItemDto'][]
    }
    LeadFinancesDto: {
      leadId: string
      dealPriceTjs: number | null
      glassCostTjs: number
      reworkCostTjs: number
      hardwareCostTjs: number
      masterFeeTjs: number
      deliveryCostTjs: number
      otherCostsTjs: number
      totalCostTjs: number
      profitTjs: number | null
      totalPaidTjs: number
      balanceDueTjs: number | null
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
